import { Router } from "express";
import helmet from "helmet";
import { Database } from "../database/Database";
import { getAuthAPI } from "./AuthAPI";
import { StatusAPI } from "./StatusAPI";

// TODO: rembet to remove this
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAPI(database: Database): Router {
  const api = Router();

  // Make sure we don't let any content load, this is an API.
  api.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'none'"],
          "base-uri": ["'none'"],
          "block-all": ["'mixed-content'"],
          "font-src": ["'none'"],
          "form-action": ["'none'"],
          "frame-ancestors": ["'none'"],
          "img-src": ["'none'"],
          "object-src": ["'none'"],
          "script-src": ["'none'"],
          "style-src": ["'none'"],
        },
      },
    })
  );

  api.use("/status", StatusAPI);
  api.use("/auth", getAuthAPI(database));

  return api;
}
