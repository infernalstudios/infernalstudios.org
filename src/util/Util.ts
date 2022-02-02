import { pbkdf2, randomBytes } from "crypto";
import { NextFunction, Request, Response } from "express";
import { Knex } from "knex";
import { coloredIdentifier, Logger, LoggerLevel } from "logerian";
import { formatWithOptions } from "util";
import { Database } from "../database/Database";
import { Permission } from "../database/Token";

export function getAuthMiddleware(
  database: Database,
  permissions: Permission[] = []
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req, res, next) => {
    if (!req.headers.authorization) {
      res.status(401);
      res.json({
        errors: ["A token is required for this endpoint"],
      });

      return res.end();
    }

    const token = await database.tokens.get(req.headers.authorization);

    if (!token) {
      res.status(401);
      res.json({
        errors: ["The provided token is invalid"],
      });

      return res.end();
    }

    if (permissions.every(permission => token.hasPermission(permission))) {
      res.status(403);
      res.json({
        errors: ["Insufficient permissions"],
        details: permissions.filter(permission => !token.hasPermission(permission)),
      });

      return res.end();
    }

    return next();
  };
}

export function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) =>
    pbkdf2(password, salt, 2048, 64, "sha512", (err, derivedKey) => {
      if (err) {
        reject(err);
      }
      resolve(derivedKey.toString("hex"));
    })
  );
}

export function randomString(length = 32): string {
  return randomBytes(length)
    .toString("hex")
    .padStart(length * 2, "0")
    .slice(0, length);
}

export function createKnexLogger(logger: Logger): Knex.Logger {
  const databaseLogger = new Logger({
    identifier: "Database",
    identifierPrefix: (a, b) => coloredIdentifier(92, 90)(a, b) + "\t",
    streams: [
      {
        level: LoggerLevel.DEBUG,
        stream: logger,
      },
    ],
  });

  return {
    debug: message => {
      if (Array.isArray(message)) {
        for (const m of message) {
          if ("sql" in m) {
            databaseLogger.debug(
              "SQL Query: " +
                formatWithOptions
                  .apply(databaseLogger, [{ colors: true }, [m.sql]])
                  .replace(/(^\[\n?\s*|\s*\n?\]$)/g, "")
            );
            if ("bindings" in m && m.bindings.length > 0) {
              databaseLogger.debug(
                "  with bindings:",
                formatWithOptions
                  .apply(databaseLogger, [{ colors: true }, m.bindings])
                  .replace(/(^\[\n?\s*|\s*\n?\]$)/g, "")
              );
            }
          } else {
            databaseLogger.debug(m);
          }
        }
      } else {
        databaseLogger.debug(message);
      }
    },
    warn: message => databaseLogger.warn(message),
    error: message => databaseLogger.error(message),
    deprecate: message => databaseLogger.warn(message),
    enableColors: true,
  };
}
