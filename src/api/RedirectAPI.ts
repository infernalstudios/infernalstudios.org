import express, { Router } from "express";
import { z } from "zod";
import { Database } from "../database/Database";
import { getAuthMiddleware } from "../util/Util";

export function getRedirectAPI(database: Database): Router {
  const api = Router();

  api.get("/", async (_req, res) => {
    res.status(200);
    res.json(await database.redirects.getAllJSON());
    res.end();
  });

  const postRedirectSchema = z
    .object({
      id: z.string().max(255),
      name: z.string().max(255),
      path: z.string().max(255),
      url: z.string().max(512),
    })
    .strict();

  api.post("/", express.json());
  api.post("/", getAuthMiddleware(database, ["redirect:create"]));
  api.post("/", async (req, res) => {
    const { id, name, path, url } = postRedirectSchema.parse(req.body);

    let redirect = await database.redirects.get(id);
    if (typeof redirect !== "undefined") {
      res.status(400);
      res.json({
        errors: ["A redirect with this id already exists!"],
      });
      return res.end();
    }

    redirect = await database.redirects.getByPath(path);
    if (typeof redirect !== "undefined") {
      res.status(400);
      res.json({
        errors: ["A redirect with this path already exists!"],
      });
      return res.end();
    }

    redirect = await database.redirects.create({ id, name, path, url });
    res.status(201);
    res.json(redirect.toJSON());
    return res.end();
  });

  const putRedirectSchema = z
    .object({
      name: z.string().max(255).optional(),
      path: z.string().max(255).optional(),
      url: z.string().max(512).optional(),
    })
    .strict();

  api.put("/:id", express.json());
  api.put("/:id", getAuthMiddleware(database, ["redirect:modify"]));
  api.put("/:id", async (req, res) => {
    const promises: Promise<unknown>[] = [];
    const { name, path, url } = putRedirectSchema.parse(req.body);
    if (!name && !path && !url) {
      res.status(400);
      res.json({
        errors: ["You must define one of name, path, url"],
      });
      return res.end();
    }

    const redirect = await database.redirects.get(req.params.id);

    if (typeof redirect === "undefined") {
      res.status(404);
      res.json({
        errors: ["Redirect not found"],
      });
      return res.end();
    }

    if (path) {
      const checkAgainst = await database.redirects.getByPath(path);
      if (typeof checkAgainst !== "undefined" && redirect.getId() !== checkAgainst.getId()) {
        res.status(400);
        res.json({
          errors: ["Path not unique"],
        });
        return res.end();
      }

      promises.push(redirect.setPath(path));
    }

    if (name) {
      promises.push(redirect.setName(name));
    }

    if (url) {
      promises.push(redirect.setUrl(url));
    }

    await Promise.all(promises);
    res.status(200);
    console.log({ redirect, json: redirect.toJSON() });
    res.json(redirect.toJSON());
    return res.end();
  });

  api.delete("/:id", getAuthMiddleware(database, ["redirect:delete"]));
  api.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const redirect = await database.redirects.get(id);
    if (!redirect) {
      res.status(404);
      res.json({
        errors: ["Redirect not found"],
      });
      return res.end();
    }

    await redirect.delete();
    res.status(204);
    return res.end();
  });

  return api;
}
