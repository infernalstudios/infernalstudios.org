// Copyright (c) 2021 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import chalk from "chalk";
import cors from "cors";
import { config as envconfig } from "dotenv";
import express from "express";
import fs from "fs-extra";
import http from "http";
import { coloredLog, getLoggerLevelName, Logger, LoggerLevel } from "logerian";
import morgan from "morgan";
import { AddressInfo } from "net";
import path from "path";
import { getAPI } from "./api/APIManager";
import { Database } from "./database/Database";

envconfig({ path: path.join(__dirname, "../.env") });

const logfile = path.join(__dirname, `../log/${new Date().toISOString()}.txt`);
fs.ensureFileSync(logfile);

const logger = new Logger({
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

const database = new Database({ path: path.join(__dirname, "../data.json"), autosave: 15_000, logger });

const app = express();
app.disable("x-powered-by");
if (typeof process.env.TRUST_PROXY === "undefined") {
  app.set("trust proxy", false);
} else if (!Number.isNaN(Number(process.env.TRUST_PROXY))) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY));
} else if (["true", "false"].includes(process.env.TRUST_PROXY)) {
  app.set("trust proxy", Boolean(process.env.TRUST_PROXY));
} else {
  app.set("trust proxy", process.env.TRUST_PROXY);
}

app.use(
  morgan("dev", {
    stream: { write: s => logger.debug(s.trimEnd()) },
    skip: req => /^\/(js|css)/.test(req.url),
  })
);
app.use(cors({ origin: "*" }));

app.use(express.static(path.join(__dirname, "../public")));

app.use("/api", getAPI(database));
app.use("/api", (_req, res) => {
  res.status(404);
  res.json({
    errors: ["The specified endpoint could not be found."],
  });
  res.end();
});

app.use("/api.md", express.static(path.join(__dirname, "../API_REFERENCE.md")));

if (require.main === module) {
  let port: string | number | undefined = process.env.PORT;
  if (typeof port === "string") {
    port = Number(port);
  }
  const server = http.createServer(app);
  server.listen(port ?? 0, () =>
    logger.info(chalk`Listening on port {yellow ${(server.address() as AddressInfo).port}}`)
  );

  database.start();

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
} else {
  // This is used for tests.
  module.exports = {
    app,
  };
}
