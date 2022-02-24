import express, { Router } from "express";
import { z } from "zod";
import { Database } from "../database/Database";
import { Token } from "../database/Token";
import { getAuthMiddleware } from "../util/Util";

export function getAuthAPI(database: Database): Router {
  const api = Router();

  const loginSchema = z
    .object({
      username: z.string().max(255),
      password: z.string(),
    })
    .strict();

  api.post("/login", express.json());
  api.post("/login", async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const user = await database.users.get(username);
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      res.json({
        errors: ["Invalid username or password"],
      });
      return res.end();
    }

    const token = await database.tokens.createToken(
      user.getUsername(),
      user.getPermissions(),
      `Login at ${new Date().toISOString()} from ${req.ip}`
    );

    res.json(token.toJSON());
    return res.end();
  });

  api.get("/token", async (req, res) => {
    res.status(200);
    if (!req.headers.authorization || req.headers.authorization.split(" ", 1)[0].toLowerCase() !== "bearer") {
      res.json({
        valid: false,
      });
      return res.end();
    }

    const token = await database.tokens.get(req.headers.authorization.slice(7) /* Removes the "bearer " prefix */);

    if (!token || token.isExpired()) {
      if (token?.isExpired()) {
        token.delete();
      }
      res.json({
        valid: false,
      });
      return res.end();
    }

    res.json({
      valid: true,
    });
    return res.end();
  });

  const postTokenSchema = z
    .object({
      expiry: z.number().int().positive().optional(),
      reason: z.string().max(255).optional(),
      permissions: z.array(z.string()).refine(perms => perms.every(p => !Token.isPermissionValid(p))),
    })
    .strict();

  api.post("/token", express.json());
  api.post("/token", getAuthMiddleware(database));
  api.post("/token", async (req, res) => {
    const { expiry, reason, permissions } = postTokenSchema.parse(req.body);
    const user = await req.user;
    if (!user) {
      throw new Error("User not defined, this should never happen");
    }

    const token = await database.tokens.createToken(
      user.getUsername(),
      permissions.filter(p => Token.isPermissionValid(p) && user.hasPermission(p)),
      reason ?? "unspecified",
      expiry ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
    );

    res.status(201);
    res.json(token.toJSON());
  });

  api.delete("/token/:id", getAuthMiddleware(database));
  api.delete("/token/:id", async (req, res) => {
    const { id } = req.params;
    const token = await database.tokens.get(id);
    if (!token) {
      res.status(404);
      res.json({
        errors: ["Token not found"],
      });
      return res.end();
    }

    const authToken = req.token;
    if (!authToken) {
      throw new Error("Token not defined, this should never happen");
    }

    if ((await authToken.getUser()).getUsername() !== (await token.getUser()).getUsername()) {
      res.status(403);
      res.json({
        errors: ["You do not have permission to delete this token"],
      });
      return res.end();
    }

    if (authToken.getId() === token.getId() || (await authToken.hasPermission("token:delete"))) {
      await token.delete();
      res.status(204);
      return res.end();
    } else {
      res.status(403);
      res.json({
        errors: ["You do not have permission to delete this token"],
      });
      return res.end();
    }
  });

  return api;
}
