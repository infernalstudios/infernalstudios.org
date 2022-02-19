import chalk from "chalk";
import fs from "fs-extra";
import http from "http";
import { coloredIdentifier, coloredLog, getLoggerLevelName, Logger, LoggerLevel } from "logerian";
import { AddressInfo } from "net";
import path from "path";
import { getApp } from "../app";
import { Database } from "../database/Database";
import { fileVisible } from "../util/Util";

export async function main() {
  const logfile = path.join(__dirname, `../../log/${new Date().toISOString()}.txt`);
  await fs.ensureFile(logfile);

  const mainLogger = new Logger({
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

  const database = new Database({ connectionString: process.env.DATABASE_URL as string, logger: mainLogger });

  const app = getApp(database, mainLogger);

  let port: string | number = process.env.PORT as string;
  const host: string = process.env.HOST as string;
  let socketPath: string = process.env.SOCKET as string;
  if (typeof port === "string") {
    port = Number(port);
  }

  const server = http.createServer(app);

  await database.connect();

  if (process.env.LISTEN === "tcp") {
    server.listen(port ?? 0, host ?? "127.0.0.1", () =>
      logger.info(chalk`Listening on port {yellow ${(server.address() as AddressInfo).port}}`)
    );
  } else if (process.env.LISTEN === "socket") {
    socketPath = path.normalize(socketPath);
    if (await fileVisible(socketPath)) {
      logger.warn(chalk`Socket path {yellow ${socketPath}} already exists, removing it...`);
      await fs.unlink(socketPath);
    }
    server.listen(socketPath, () => logger.info(chalk`Listening on socket {yellow ${socketPath}}`));
    fs.watch(
      socketPath,
      {
        persistent: false,
      },
      async (event, filename) => {
        if (!(await fileVisible(filename))) {
          if (event === "rename") {
            logger.warn("Socket file was moved");
          } else {
            logger.fatal("Socket file was deleted");
            process.exit(0);
          }
        }
      }
    );
  } else {
    // This shouldn't be possible, but let's be careful.
    logger.fatal(chalk`Unknown LISTEN value {yellow ${process.env.LISTEN}}`);
    process.exit(1);
  }

  for (const signal of ["SIGABRT", "SIGHUP", "SIGINT", "SIGQUIT", "SIGTERM", "SIGUSR1", "SIGUSR2", "SIGBREAK"]) {
    process.on(signal, () => {
      if (signal === "SIGINT") {
        // We clear the line to get rid of nasty ^C characters.
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }
      logger.info(chalk`Recieved signal {yellow ${signal}}`);
      process.exit();
    });
  }

  process.on("exit", code => {
    logger.info(chalk`Exiting with code {yellow ${code}}`);
    database
      .close()
      .then(() => {
        logger.info("Closed database connection.");
      })
      .catch(err => {
        logger.error(err);
      });
    server.close(err => {
      if (err) {
        logger.error(err);
      }
      logger.info("Server closed.");
      server.unref();
    });
  });
}
