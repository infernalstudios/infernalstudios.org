import { NextFunction, Request, Response } from "express";
import { Database } from "../database/Database";

export function getAuthMiddleware(database: Database): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!req.headers.authorization) {
      res.status(401);
      res.json({
        errors: ["A token is required for this endpoint"],
      });

      return res.end();
    }

    if (!database.tokens.has(req.headers.authorization)) {
      res.status(401);
      res.json({
        errors: ["The provided token is invalid"],
      });

      return res.end();
    }

    return next();
  };
}
