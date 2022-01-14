import express, { Express } from "express";
import { Database } from "../database/Database";
import { StatusAPI } from "./StatusAPI";

// TODO: rembet to remove this
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAPI(_database: Database): Express {
  const api = express();
  api.disable("x-powered-by");

  api.use("/status", StatusAPI);

  return api;
}
