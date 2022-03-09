// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import express, { Router } from "express";
import { z } from "zod";
import { Database } from "../database/Database";
import { Token } from "../database/Token";
import { User } from "../database/User";
import { getAuthMiddleware } from "../util/Util";

export function getUserAPI(database: Database): Router {
  const api = Router();

  api.get("/", getAuthMiddleware(database, ["user:view"]));
  api.get("/", async (_req, res) => {
    res.status(200);
    res.json((await database.users.getAllJSON()).map(user => User.sanitizeJSON(user)));
    return res.end();
  });

  api.get("/self", getAuthMiddleware(database));
  api.get("/self", async (req, res) => {
    const user = await req.user;
    if (!user) {
      res.status(500);
      res.json({
        errors: ["Unknown user"],
      });
      return res.end();
    }

    res.status(200);
    res.json(User.sanitizeJSON(user));
    return res.end();
  });

  api.get("/:id", getAuthMiddleware(database, ["user:view"]));
  api.get("/:id", async (req, res) => {
    const { id } = req.params;

    const user = await database.users.get(id);
    if (!user) {
      res.status(404);
      res.json({
        errors: ["User not found"],
      });
      return res.end();
    }

    res.status(200);
    res.json(User.sanitizeJSON(user));
    return res.end();
  });

  const postUserSchema = z
    .object({
      id: z.string().max(255),
      password: z.string().max(255),
    })
    .strict();

  api.post("/", express.json());
  api.post("/", getAuthMiddleware(database, ["user:create"]));
  api.post("/", async (req, res) => {
    const { id, password } = postUserSchema.parse(req.body);

    let user = await database.users.get(id);
    if (user) {
      res.status(400);
      res.json({
        errors: ["A user with this id already exists!"],
      });
      return res.end();
    }

    user = await database.users.createUser(id, password);

    res.status(201);
    res.json(User.sanitizeJSON(user));
    return res.end();
  });

  const putUserSchema = z
    .object({
      password: z.string().max(255).optional(),
      permissions: z
        .array(z.string())
        .refine(perms => perms.every(p => Token.isPermissionValid(p)))
        .optional(),
      passwordChangeRequested: z.boolean().optional(),
    })
    .strict();

  const putSelfSchema = putUserSchema.omit({ permissions: true });

  api.put("/self", express.json());
  api.put("/self", getAuthMiddleware(database, ["self:modify"]));
  api.put("/self", async (req, res) => {
    const { password, passwordChangeRequested } = putSelfSchema.parse(req.body);

    const user = await req.user;
    if (!user) {
      res.status(404);
      res.json({
        errors: ["User not found"],
      });
      return res.end();
    }

    const promises: Promise<unknown>[] = [];

    if (password) {
      promises.push(user.setPassword(password));
    }

    if (typeof passwordChangeRequested === "boolean") {
      promises.push(user.setPasswordChangeRequested(passwordChangeRequested));
    }

    await Promise.all(promises);

    res.status(200);
    res.json(User.sanitizeJSON(user));
    return res.end();
  });

  api.put("/:id", express.json());
  api.put("/:id", getAuthMiddleware(database, ["user:modify"]));
  api.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { password, permissions, passwordChangeRequested } = putUserSchema.parse(req.body);

    const user = await database.users.get(id);
    if (!user) {
      res.status(404);
      res.json({
        errors: ["User not found"],
      });
      return res.end();
    }

    const promises: Promise<unknown>[] = [];

    if (password) {
      promises.push(user.setPassword(password));
    }

    if (typeof passwordChangeRequested !== "undefined") {
      promises.push(user.setPasswordChangeRequested(passwordChangeRequested));
    }

    if (Array.isArray(permissions)) {
      const adminUser = await req.user;
      if (!adminUser) {
        res.status(500);
        res.json({
          errors: ["Unknown user"],
        });
        return res.end();
      }
      promises.push(
        user.setPermissions(permissions.filter(p => Token.isPermissionValid(p) && adminUser.hasPermission(p)))
      );
    }

    await Promise.all(promises);

    res.status(200);
    res.json(User.sanitizeJSON(user));
    return res.end();
  });

  api.delete("/:id", getAuthMiddleware(database, ["user:delete"]));
  api.delete("/:id", async (req, res) => {
    const { id } = req.params;

    const user = await database.users.get(id);
    if (!user) {
      res.status(404);
      res.json({
        errors: ["User not found"],
      });
      return res.end();
    }

    await user.delete();
    res.status(204);
    return res.end();
  });

  return api;
}
