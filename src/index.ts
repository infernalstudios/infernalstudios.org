// Copyright (c) 2021 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import chalk from "chalk";
import { config as envconfig } from "dotenv";
import fs from "fs-extra";
import http from "http";
import { coloredIdentifier, coloredLog, getLoggerLevelName, Logger, LoggerLevel } from "logerian";
import { AddressInfo } from "net";
import path from "path";
import { getApp } from "./app";
import { Database } from "./database/Database";
import { ERRORS, ERROR_KEYS } from "./util/Errors";

envconfig({ path: path.join(__dirname, "../.env") });

const logfile = path.join(__dirname, `../log/${new Date().toISOString()}.txt`);
fs.ensureFileSync(logfile);

export const mainLogger = new Logger({
  streams: [
    {
      level: process.env.VERBOSE === "true" ? LoggerLevel.DEBUG : LoggerLevel.INFO,
      stream: process.stdout,
      prefix: coloredLog,
    },
    {
      level: LoggerLevel.DEBUG,
      stream: fs.createWriteStream(logfile),
      prefix: (level: LoggerLevel) => `[${new Date().toISOString()}] [${getLoggerLevelName(level)}] `,
    },
  ],
});

const logger = new Logger({
  identifier: "Main",
  identifierPrefix: (a, b) => coloredIdentifier(34, 90)(a, b) + "\t",
  streams: [
    {
      level: LoggerLevel.DEBUG,
      stream: mainLogger,
      intercept: ([errorCode, ...args]) => {
        if (typeof errorCode === "symbol" && errorCode in ERRORS) {
          const error = ERROR_KEYS[errorCode];
          let outputString: string;
          if (typeof error === "string") {
            outputString = error;
          } else {
            outputString = error(...args);
          }
          return [`[${errorCode.toString()}]`, outputString];
        } else {
          return;
        }
      },
    },
  ],
});

if (!process.env.DATABASE_URL) {
  logger.fatal(ERRORS.ENV_NOT_SET, "DATABASE_URL");
  process.exit(1);
}

export const database = new Database({ connectionString: process.env.DATABASE_URL, logger: mainLogger });

export const app = getApp(database, mainLogger);

if (require.main === module) {
  void (async function main() {
    let port: string | number | undefined = process.env.PORT;
    const host: string | undefined = process.env.HOST;
    let socketPath: string | undefined = process.env.PATH;
    if (typeof port === "string") {
      port = Number(port);
    }

    const server = http.createServer(app);

    await database.connect();

    if (!process.env.LISTEN) {
      logger.fatal(ERRORS.ENV_NOT_SET, "LISTEN");
      process.exit(1);
    } else if (process.env.LISTEN !== "tcp" && process.env.LISTEN !== "socket") {
      logger.fatal(ERRORS.ENV_INVALID, "LISTEN", ["tcp", "socket"]);
      process.exit(1);
    }

    if (process.env.LISTEN === "tcp") {
      server.listen(port ?? 0, host ?? "127.0.0.1", () =>
        logger.info(chalk`Listening on port {yellow ${(server.address() as AddressInfo).port}}`)
      );
    } else {
      if (!socketPath) {
        logger.fatal(ERRORS.ENV_NOT_SET, "PATH");
        process.exit(1);
      }
      socketPath = path.normalize(socketPath);
      server.listen(socketPath, () => logger.info(chalk`Listening on socket {yellow ${socketPath}}`));
    }

    for (const signal of ["SIGABRT", "SIGHUP", "SIGINT", "SIGQUIT", "SIGTERM", "SIGUSR1", "SIGUSR2", "SIGBREAK"]) {
      process.on(signal, () => {
        // We clear the line to get rid of nasty ^C characters.
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        logger.info(chalk`Recieved signal {yellow ${signal}}`);
        logger.info("Exiting...");
        database.close();
        server.close(err => {
          if (err) {
            logger.error(err);
          }
          server.unref();
        });
      });
    }
  })();
}
