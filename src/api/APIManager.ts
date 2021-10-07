import express, { Express } from "express";
import { Database } from "../database/Database";
import { getAPI as getRedirectAPI } from "./RedirectAPI";
import { StatusAPI } from "./StatusAPI";

export function getAPI(database: Database): Express {
  const api = express();

  api.use("/status", StatusAPI);
  api.use("/redirects", getRedirectAPI(database));

  return api;
}
