import express, { Express } from "express";
import { Database } from "../database/Database";
import { getAPI as getAuthAPI } from "./AuthAPI";
import { getAPI as getRedirectAPI } from "./RedirectAPI";
import { StatusAPI } from "./StatusAPI";

export function getAPI(database: Database): Express {
  const api = express();
  api.disable("x-powered-by");

  api.use("/status", StatusAPI);
  api.use("/auth", getAuthAPI(database));
  api.use("/redirects", getRedirectAPI(database));

  return api;
}
