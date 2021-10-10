import express, { Express } from "express";

export const StatusAPI: Express = express();
StatusAPI.disable("x-powered-by");

StatusAPI.get("/", async (_req, res) => {
  res.status(200);
  res.json({
    status: "ok",
  });
  return res.end();
});
