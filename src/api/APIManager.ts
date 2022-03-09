// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import { Router } from "express";
import helmet from "helmet";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { Database } from "../database/Database";
import { getAuthAPI } from "./AuthAPI";
import { getModAPI } from "./ModAPI";
import { getRedirectAPI } from "./RedirectAPI";
import { StatusAPI } from "./StatusAPI";
import { getUserAPI } from "./UserAPI";

export function getAPI(database: Database): Router {
  const api = Router();

  const rateLimit = new RateLimiterMemory({
    points: 120,
    duration: 60,
  });

  api.use((req, res, next) => {
    rateLimit
      .consume(req.ip)
      .then(rateLimiterRes => {
        res.setHeader("X-RateLimit-Limit", rateLimit.points);
        res.setHeader("X-RateLimit-Remaining", rateLimiterRes.remainingPoints);
        res.setHeader("X-RateLimit-Reset", Math.ceil(rateLimiterRes.msBeforeNext / 1000));
        next();
      })
      .catch(rateLimiterRes => {
        rateLimit.block(req.ip, Math.min(rateLimiterRes.msBeforeNext / 1000 + 12, 600));
        res.setHeader("X-RateLimit-Limit", rateLimit.points);
        res.setHeader("X-RateLimit-Remaining", 0);
        res.setHeader("X-RateLimit-Reset", Math.ceil(rateLimiterRes.msBeforeNext / 1000));
        res.status(429);
        res.json({
          errors: ["Too many requests"],
        });
        return res.end();
      });
  });

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
  api.use("/redirects", getRedirectAPI(database));
  api.use("/mods", getModAPI(database));
  api.use("/users", getUserAPI(database));

  return api;
}
