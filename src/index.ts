// Copyright (c) 2021 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import chalk from "chalk";
import cors from "cors";
import express from "express";
import fs from "fs-extra";
import http from "http";
import { coloredLog, getLoggerLevelName, Logger, LoggerLevel } from "logerian";
import morgan from "morgan";
import { AddressInfo } from "net";
import path from "path";

const logger = new Logger({
    streams: [
        {
            level: process.argv.slice(2).includes("--verbose")
                ? LoggerLevel.DEBUG
                : LoggerLevel.INFO,
            stream: process.stdout,
            prefix: coloredLog,
        },
    ],
});

const logfile = path.join(__dirname, `../log/${new Date().toISOString()}.txt`);
fs.ensureFileSync(logfile);

logger.addOutput({
    level: LoggerLevel.DEBUG,
    stream: fs.createWriteStream(logfile),
    prefix: (level: LoggerLevel) => `[${new Date().toISOString()}] [${getLoggerLevelName(level)}] `,
});

const app = express();

app.use(
    morgan("dev", {
        stream: { write: s => logger.debug(s.trimEnd()) },
        skip: req => /^\/(js|css)/.test(req.url),
    })
);
app.use(cors({ origin: "*" }));

app.use(express.static(path.join(__dirname, "../src/public")));

if (require.main === module) {
    let port: string | number | undefined = process.env.PORT;
    if (typeof port === "string") {
        port = Number(port);
    }
    const server = http.createServer(app);
    server.listen(port ?? 0, () =>
        logger.info(chalk`Listening on port {yellow ${(server.address() as AddressInfo).port}}`)
    );
} else {
    // This is used for tests.
    module.exports = {
        app,
    };
}
