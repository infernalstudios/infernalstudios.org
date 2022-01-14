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
    },
  ],
});

if (!process.env.DATABASE_URL) {
  logger.fatal("DATABASE_URL is not set in .env");
  process.exit(1);
}

export const database = new Database({ connectionString: process.env.DATABASE_URL, logger: mainLogger });

export const app = getApp(database, mainLogger);

if (require.main === module) {
  void (async function main() {
    let port: string | number | undefined = process.env.PORT;
    if (typeof port === "string") {
      port = Number(port);
    }

    const server = http.createServer(app);

    await database.connect();

    server.listen(port ?? 0, () =>
      logger.info(chalk`Listening on port {yellow ${(server.address() as AddressInfo).port}}`)
    );

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
