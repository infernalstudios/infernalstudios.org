// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import express, { Router } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { z } from "zod";
import { Database } from "../database/Database";
import { EDContribution } from "../database/EDContribution";
import { getAuthMiddleware, randomString } from "../util/Util";

export function getTempEDAPI(database: Database): Router {
  const api = Router();

  api.get("/contributions", async (_req, res) => {
    res.status(200);
    res.json(await database.temp_ed.getAllClean());
    return res.end();
  });

  const postContributionsSchema = z.record(
    z.string().refine(s => /^everydesc.[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$/.test(s)),
    z.array(
      z
        .object({
          value: z.string().max(2047),
          user: z.string(),
          isDiscord: z.boolean(),
        })
        .strict()
    )
  );

  const rateLimit = new RateLimiterMemory({
    points: 15,
    duration: 60,
  });

  api.post("/contributions", (req, res, next) => {
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

  api.post("/contributions", express.json());
  api.post("/contributions", getAuthMiddleware(database));
  api.post("/contributions", async (req, res) => {
    res.status(200);
    const contributions = postContributionsSchema.parse(req.body);

    const createContributionsPromises: Promise<EDContribution>[] = [];
    for (const key in contributions) {
      if (Object.prototype.hasOwnProperty.call(contributions, key)) {
        const value = contributions[key];
        for (const contribution of value) {
          const promise = database.temp_ed.create({
            id: randomString(),
            key,
            value: contribution.value,
            user: contribution.user,
            isDiscord: contribution.isDiscord,
          });
          createContributionsPromises.push(promise);
        }
      }
    }

    await Promise.all(createContributionsPromises);

    res.json(await database.temp_ed.getAllClean());

    return res.end();
  });

  api.delete("/contributions", getAuthMiddleware(database));
  api.delete("/contributions", async (req, res) => {
    if (typeof req.query.id !== "string") {
      res.status(400);
      res.json({
        errors: [`Invalid id parameter`],
      });
      return res.end();
    }

    await database.temp_ed.delete(req.query.id);

    return res.end();
  });

  return api;
}
