import express, { Express } from "express";

export const StatusAPI: Express = express();

StatusAPI.use("/", (_req, res) => {
  res.json({
    status: "ok",
  });
});
