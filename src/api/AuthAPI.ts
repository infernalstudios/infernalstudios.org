import express, { Router } from "express";
import { z } from "zod";
import { Database } from "../database/Database";

export function getAuthAPI(database: Database): Router {
  const api = Router();

  const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
  });

  api.post("/login", express.json());
  api.post("/login", async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const user = await database.users.get(username);
    if (!user) {
      res.status(401);
      res.json({
        errors: ["Invalid username or password"],
      });
      return res.end();
    }

    if (!(await user.matchPassword(password))) {
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

    res.json({
      token: token.toJson(),
    });
  });

  return api;
}
