import { coloredLog, Logger, LoggerLevel } from "logerian";
import { Database } from "../database/Database";

export async function setup(connectionString: string) {
  const logger = new Logger({
    streams: [
      {
        level: LoggerLevel.DEBUG,
        stream: process.stdout,
        prefix: coloredLog,
      },
    ],
  });

  const database = new Database({ connectionString, logger });

  await database.connect();
  await database.setup();
  await database.close();
}
