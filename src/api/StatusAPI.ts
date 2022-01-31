import { Router } from "express";

export const StatusAPI: Router = Router();

StatusAPI.get("/", async (_req, res) => {
  res.status(200);
  res.json({
    status: "ok",
  });
  return res.end();
});
