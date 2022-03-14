// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import express, { Router } from "express";
import cleanVersion from "semver/functions/clean";
import gtVersion from "semver/functions/gt";
import validVersion from "semver/functions/valid";
import { z } from "zod";
import { Database } from "../database/Database";
import { getAuthMiddleware, zodLiterals } from "../util/Util";

export function getModAPI(database: Database): Router {
  const api = Router();

  api.get("/", async (_req, res) => {
    const mods = await database.mods.getAllJSON();
    res.status(200);
    res.json(mods);
    res.end();
  });

  api.get("/:id", async (req, res) => {
    const mod = await database.mods.get(req.params.id);
    if (!mod) {
      res.status(404);
      res.json({
        errors: ["Mod not found"],
      });
    } else {
      res.status(200);
      res.json(mod.toJSON());
    }
    return res.end();
  });

  const postModSchema = z
    .object({
      id: z.string().max(255),
      name: z.string().max(255),
      url: z.string().max(255),
    })
    .strict();

  api.post("/", express.json());
  api.post("/", getAuthMiddleware(database, ["mod:create"]));
  api.post("/", async (req, res) => {
    const { id, name, url } = postModSchema.parse(req.body);

    let mod = await database.mods.get(id);
    if (mod) {
      res.status(400);
      res.json({
        errors: ["A mod with this id already exists!"],
      });
      return res.end();
    }

    mod = await database.mods.create({ id, name, url });
    res.status(201);
    res.json(mod.toJSON());
    return res.end();
  });

  const putModSchema = z
    .object({
      name: z.string().max(255).optional(),
      url: z.string().max(255).optional(),
    })
    .strict();

  api.put("/:id", express.json());
  api.put("/:id", getAuthMiddleware(database, ["mod:modify"]));
  api.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, url } = putModSchema.parse(req.body);

    const mod = await database.mods.get(id);
    if (!mod) {
      res.status(404);
      res.json({
        errors: ["Mod not found"],
      });
      return res.end();
    }

    const promises: Promise<unknown>[] = [];

    if (name) {
      promises.push(mod.setName(name));
    }

    if (url) {
      promises.push(mod.setUrl(url));
    }

    await Promise.all(promises);

    res.status(200);
    res.json(mod.toJSON());
    return res.end();
  });

  api.delete("/:id", getAuthMiddleware(database, ["mod:delete"]));
  api.delete("/:id", async (req, res) => {
    const { id } = req.params;

    const mod = await database.mods.get(id);
    if (!mod) {
      res.status(404);
      res.json({
        errors: ["Mod not found"],
      });
      return res.end();
    }

    await database.mods.delete(id);
    res.status(204);
    return res.end();
  });

  api.get("/:id/versions", async (req, res) => {
    const mod = await database.mods.get(req.params.id);
    if (!mod) {
      res.status(404);
      res.json({
        errors: ["Mod not found"],
      });
      return res.end();
    }

    res.status(200);
    res.json(
      (await mod.getVersions()).map(version => {
        const schema = version.toJSON();
        // @ts-expect-error - yes thank you typescript, i fucking know that i can't delete
        //                    a required field, but i'm doing it anyways!! how do you like
        //                    that, typescript? I DELETED A REQUIRED FIELD YOU IDIOT!!!
        delete schema.mod;
        return schema;
      })
    );
    return res.end();
  });

  const postVersionSchema = z
    .object({
      id: z.string().max(255),
      name: z.string().max(255),
      url: z.string().max(255),
      minecraft: z.string().max(255),
      recommended: z.boolean(),
      changelog: z.string().max(511),
      loader: zodLiterals("forge", "fabric", "rift", "liteloader", "quilt"),
      dependencies: z.array(
        z
          .object({
            id: z.string().max(255),
            url: z.string().max(255),
            required: z.boolean(),
            side: zodLiterals("CLIENT", "SERVER", "BOTH"),
            version: z.string(),
          })
          .strict()
      ),
    })
    .strict();
  api.post("/:id/versions", express.json());
  api.post("/:id/versions", getAuthMiddleware(database, ["mod:modify"]));
  api.post("/:id/versions", async (req, res) => {
    const { id } = req.params;
    const versionBody = postVersionSchema.parse(req.body);

    const versionId = cleanVersion(versionBody.id);
    if (!versionId) {
      res.status(400);
      res.json({
        errors: ["Invalid version id"],
      });
      return res.end();
    }
    versionBody.id = versionId;

    if (!versionBody.dependencies.every(dep => validVersion(dep.version))) {
      res.status(400);
      res.json({
        errors: ["Invalid dependency version"],
      });
      return res.end();
    }

    const mod = await database.mods.get(id);
    if (!mod) {
      res.status(404);
      res.json({
        errors: ["Mod not found"],
      });
      return res.end();
    }

    const versions = await mod.getVersions();
    if (
      versions.some(
        version =>
          version.getId() === versionBody.id &&
          version.getLoader() === versionBody.loader &&
          version.getMinecraft() === versionBody.minecraft
      )
    ) {
      res.status(400);
      res.json({
        errors: ["A version with this id, loader, and minecraft version combination already exists!"],
      });
      return res.end();
    }

    const version = await mod.addVersion(versionBody);
    res.status(201);
    res.json(version.toJSON());
    return res.end();
  });

  api.delete("/:id/versions", express.json());
  api.delete("/:id/versions", getAuthMiddleware(database, ["mod:modify"]));
  api.delete("/:id/versions", async (req, res) => {
    const { id: modId } = req.params;

    for (const param of ["version", "loader", "minecraft"]) {
      if (typeof req.query[param] !== "string") {
        res.status(400);
        res.json({
          errors: [`Invalid ${param} parameter`],
        });
        return res.end();
      }
    }

    const mod = await database.mods.get(modId);
    if (!mod) {
      res.status(404);
      res.json({
        errors: ["Mod not found"],
      });
      return res.end();
    }

    const { version: id, loader, minecraft } = req.query as Record<"version" | "loader" | "minecraft", string>;
    const version = (await mod.getVersions()).find(
      version => version.getId() === id && version.getLoader() === loader && version.getMinecraft() === minecraft
    );
    if (!version) {
      res.status(404);
      res.json({
        errors: ["Version not found"],
      });
      return res.end();
    }

    await mod.deleteVersion(version);
    res.status(204);
    return res.end();
  });

  // https://mcforge.readthedocs.io/en/latest/gettingstarted/autoupdate/#update-json-format
  api.get("/:id/forge", async (req, res) => {
    const mod = await database.mods.get(req.params.id);
    if (!mod) {
      res.status(404);
      res.json({
        errors: ["Mod not found"],
      });
      return res.end();
    }

    const versions = await mod.getVersions();

    const response: ForgeJSONUpdateResponse = {
      homepage: mod.getUrl(),
      promos: {},
    };

    for (const version of versions) {
      if (version.getLoader() !== "forge") {
        continue;
      }

      const minecraft = version.getMinecraft();
      const id = version.getId();
      if (typeof response[minecraft] === "undefined") response[minecraft] = {};
      (response[minecraft] as Record<string, string>)[id] = version.getChangelog();

      if (
        typeof response.promos[`${minecraft}-latest`] === "undefined" ||
        gtVersion(id, response.promos[`${minecraft}-latest`])
      ) {
        response.promos[`${minecraft}-latest`] = id;
      }

      if (
        typeof response.promos[`${minecraft}-recommended`] === "undefined" ||
        gtVersion(id, response.promos[`${minecraft}-recommended`])
      ) {
        response.promos[`${minecraft}-recommended`] = id;
      }
    }

    res.status(200);
    res.json(response);
    return res.end();
  });

  return api;
}

interface ForgeJSONUpdateResponse {
  homepage: string;
  promos: {
    [mcversion: `${string}-latest`]: string;
    [mcversion: `${string}-recommended`]: string;
  };
  [mcversion: string]: unknown; // This is unknown because typescript freaks out if we put the actual thing here
}
