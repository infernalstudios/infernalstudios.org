// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import { coloredLog, Logger } from "logerian";
import { Database } from "../database/Database";

export async function setup(connectionString: string) {
  const logger = new Logger({
    streams: [
      {
        level: "DEBUG",
        stream: process.stdout,
        prefix: coloredLog,
      },
    ],
  });

  const database = new Database({ connectionString, logger });

  await database.connect(false);
  await database.setup();
  await database.close();
}
