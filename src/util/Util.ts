import { pbkdf2, randomBytes } from "crypto";
import { parse as envparse } from "dotenv";
import { NextFunction, Request, Response } from "express";
import fs from "fs-extra";
import { Knex } from "knex";
import { coloredIdentifier, Logger, LoggerLevel } from "logerian";
import path from "path";
import { formatWithOptions } from "util";
import { Primitive, z, ZodLiteral, ZodUnion } from "zod";
import { Database } from "../database/Database";
import { Token } from "../database/Token";
import { User } from "../database/User";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      token?: Token;
      user?: Promise<User>;
    }
  }
}

export function getAuthMiddleware(
  database: Database,
  permissions: string[] = []
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req, res, next) => {
    if (!req.headers.authorization) {
      res.status(401);
      res.json({
        errors: ["A token is required for this endpoint"],
      });
      return res.end();
    }

    if (req.headers.authorization.split(" ", 1)[0].toLowerCase() !== "bearer") {
      res.status(401);
      res.json({
        errors: ["The authorization header must be of type 'Bearer'"],
      });
      return res.end();
    }

    const token = await database.tokens.get(req.headers.authorization.slice(7) /* Removes the "bearer " prefix */);

    if (!token || token.isExpired()) {
      if (token?.isExpired()) {
        token.delete();
      }
      res.status(401);
      res.json({
        errors: ["The provided token is invalid"],
      });

      return res.end();
    }

    req.token = token;

    if (!permissions.every(permission => token.hasPermission(permission))) {
      res.status(403);
      res.json({
        errors: ["Insufficient permissions"],
        details: permissions.filter(permission => !token.hasPermission(permission)),
      });

      return res.end();
    }

    // Let routes await the user if they actually need it, otherwise don't await and prolong the request ourselves.
    req.user = token.getUser();

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

export async function loadEnv(envPath: string = path.join(__dirname, "../../.env")): Promise<string[]> {
  function stringToBoolean(value: string): boolean {
    value = value.toLowerCase();
    return value === "true" || value === "1" || value === "on" || value === "yes" || value === "y";
  }

  const errors = [];

  const output = envparse<{
    DATABASE_LOG?: string;
    DATABASE_URL?: string;
    HOST?: string;
    LISTEN?: string;
    NODE_ENV?: string;
    PORT?: string;
    SOCKET?: string;
    TRUST_PROXY?: string;
    VERBOSE?: string;
  }>(await fs.readFile(envPath));

  if (output.DATABASE_LOG) {
    process.env.DATABASE_LOG = String(stringToBoolean(output.DATABASE_LOG ?? "false"));
  }
  if (output.DATABASE_URL) {
    process.env.DATABASE_URL = output.DATABASE_URL;
  } else {
    errors.push("DATABASE_URL is not set in .env");
  }
  if (output.LISTEN) {
    switch (output.LISTEN.toLowerCase()) {
      case "socket":
        process.env.LISTEN = "socket";
        if (output.SOCKET) {
          process.env.SOCKET = output.SOCKET;
        } else {
          errors.push("SOCKET is not set in .env");
        }
        break;
      case "tcp":
        process.env.LISTEN = "tcp";
        if (output.HOST) {
          process.env.HOST = output.HOST;
        } else {
          errors.push("HOST is not set in .env");
        }
        if (output.PORT) {
          process.env.PORT = String(parseInt(output.PORT, 10));
        } else {
          errors.push("PORT is not set in .env");
        }
        break;
      default:
        errors.push("LISTEN must be set to either 'socket' or 'tcp' in .env");
        break;
    }
  } else {
    errors.push("LISTEN is not set in .env");
  }
  if (output.NODE_ENV !== "production" && output.NODE_ENV !== "development") {
    errors.push("NODE_ENV must be set to either 'production' or 'development' in .env");
  } else {
    process.env.NODE_ENV = output.NODE_ENV || "development";
  }
  if (output.VERBOSE) {
    process.env.VERBOSE = String(stringToBoolean(output.VERBOSE ?? "false"));
  }
  if (output.TRUST_PROXY) {
    process.env.TRUST_PROXY = output.TRUST_PROXY || "false";
  }
  return errors;
}

export async function fileVisible(filename: string): Promise<boolean> {
  return await fs.access(filename, fs.constants.F_OK).then(
    () => true,
    () => false
  );
}

export function zodLiterals<T extends Primitive>(
  ...args: T[]
): ZodUnion<[ZodLiteral<T>, ZodLiteral<T>, ...ZodLiteral<T>[]]> {
  return z.union(args.map(arg => z.literal(arg)) as [ZodLiteral<T>, ZodLiteral<T>, ...ZodLiteral<T>[]]);
}
