import express, { Express } from "express";
import { object as yupObject, string as yupString, ValidationError } from "yup";
import { Database } from "../database/Database";
import { getAuthMiddleware } from "../util/APIUtil";

export function getAPI(database: Database): Express {
  const AuthAPI = express();
  AuthAPI.disable("x-powered-by");

  AuthAPI.use(express.json());

  AuthAPI.get("/token", getAuthMiddleware(database));
  AuthAPI.get("/token", async (_req, res) => {
    res.status(200);
    res.json({
      status: "ok",
    });
    res.end();
  });

  AuthAPI.post("/token", getAuthMiddleware(database));
  AuthAPI.post("/token", async (_req, res) => {
    res.status(200);
    res.json({
      id: database.tokens.create().id,
    });
    res.end();
  });

  const deleteTokenSchema = yupObject({
    id: yupString()
      .trim()
      .matches(/^[a-z0-9_-]{86}$/i)
      .required()
      .typeError("A token must contain 86 [a-z, A-Z, 0-9, _, -] characters"),
  });

  AuthAPI.delete("/token", getAuthMiddleware(database));
  AuthAPI.delete("/token", async (req, res) => {
    let id: string;

    try {
      id = (await deleteTokenSchema.validate(req.body)).id;
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        res.status(400);
        res.json({
          errors: err.errors.map(message => `Validation Error: ${message}`),
        });
        return res.end();
      } else {
        if (process.env.NODE_ENV === "development") {
          res.status(500);
          if (err instanceof Error) {
            return res.json({
              errors: [err.message],
            });
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    if (req.headers.authorization === id) {
      res.status(400);
      res.json({
        errors: ["Cannot delete the same token as the one which is used for this request"],
      });
      return res.end();
    }

    if (!database.tokens.has(id)) {
      res.status(404);
      res.json({
        errors: ["The provided token could not be found"],
      });
      return res.end();
    }

    database.tokens.delete(id);
    res.status(200);
    res.json({ id });
    res.end();
  });

  return AuthAPI;
}
