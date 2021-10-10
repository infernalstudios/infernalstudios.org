import express, { Express } from "express";
import { object as yupObject, string as yupString, ValidationError } from "yup";
import { Database } from "../database/Database";
import { Redirect } from "../database/redirect/Redirect";
import { getAuthMiddleware } from "../util/APIUtil";

export function getAPI(database: Database): Express {
  const RedirectAPI = express();
  RedirectAPI.disable("x-powered-by");

  RedirectAPI.use(express.json());

  RedirectAPI.get("/", async (_req, res) => {
    const redirects = database.redirects
      .getAll()
      .map(redirect => ({ id: redirect.id, name: redirect.name, url: redirect.url }));
    res.status(200);
    res.json(redirects);
    res.end();
  });

  const postRedirectSchema = yupObject({
    id: yupString()
      .trim()
      .matches(/^[a-z0-9_-]+$/i)
      .required()
      .typeError("An id must only contain characters [a-z A-Z 0-9 _ -]"),
    name: yupString()
      .trim()
      .matches(/^[a-z0-9_/\\-]+$/i)
      .typeError("A name must only contain characters [a-z A-Z 0-9 _ - / \\] and spaces"),
    url: yupString().trim().url().required().typeError("A url must be a valid url"),
    path: yupString()
      .trim()
      .matches(/^\/?([a-z0-9_-]+\/?)+$/i)
      .required()
      .typeError(
        "A path must only contain characters [a-z A-Z 0-9 _ - /], and must not have multiple consecutive '/' characters"
      ),
  });

  RedirectAPI.post("/", getAuthMiddleware(database));
  RedirectAPI.post("/", async (req, res) => {
    let id: string, name: string, url: string, path: string;

    try {
      const validatedSchema = await postRedirectSchema.validate(req.body);
      id = validatedSchema.id;
      url = validatedSchema.url;
      path = validatedSchema.path;

      // Remove preceding and trailing slashes from path
      if (path[0] === "/") {
        path = path.slice(1, path.length);
      }
      if (path[path.length - 1] === "/") {
        path = path.slice(0, -1);
      }

      if (path.replaceAll("/", "").length < 4) {
        throw new ValidationError("A path must contain at least 4 non-/ characters");
      }

      name = validatedSchema.name ?? path;
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        res.status(400);
        res.json({
          errors: err.errors.map(message => `Validation Error: ${message}`),
        });
        return res.end();
      } else {
        if (process.env.NODE_ENV === "development") {
          res.status(500);
          if (err instanceof Error) {
            return res.json({
              errors: [err.message],
            });
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    if (database.redirects.has(id)) {
      res.status(400);
      res.json({
        errors: [`A redirect with an id of "${id}" already exists`],
      });
      return res.end();
    }

    if (database.redirects.getAll().findIndex(redirect => redirect.path === path) !== -1) {
      res.status(400);
      res.json({
        errors: [`A redirect with a path of "${path}" already exists`],
      });
      return res.end();
    }

    const redirect = database.redirects.create(id, { path, name, url });

    res.status(201);
    res.json({
      id: redirect.id,
      name: redirect.name,
      path: redirect.path,
      url: redirect.url,
    });
    return res.end();
  });

  RedirectAPI.get("/:id", async (req, res) => {
    if (!database.redirects.has(req.params.id)) {
      res.status(404);
      res.json({
        errors: [`A redirect with an id of "${req.params.id}" cannot be found`],
      });
      return res.end();
    }

    // Explicit cast to Redirect because we know the redirect exists.
    const redirect = database.redirects.get(req.params.id) as Redirect;

    res.status(200);
    res.json({
      id: redirect.id,
      name: redirect.name,
      path: redirect.path,
      url: redirect.url,
    });
    return res.end();
  });

  const putRedirectSchema = yupObject({
    name: yupString()
      .trim()
      .matches(/^[a-z0-9_/\\-]+$/i)
      .typeError("A name must only contain characters [a-z A-Z 0-9 _ - / \\] and spaces"),
    url: yupString().trim().url().typeError("A url must be a valid url"),
    path: yupString()
      .trim()
      .matches(/^\/?([a-z0-9_-]+\/?)+$/i)
      .typeError(
        "A path must only contain characters [a-z A-Z 0-9 _ - /], and must not have multiple consecutive '/' characters"
      ),
  });

  RedirectAPI.put("/:id", getAuthMiddleware(database));
  RedirectAPI.put("/:id", async (req, res) => {
    const id = req.params.id;
    if (!database.redirects.has(id)) {
      res.status(404);
      res.json({
        errors: [`A redirect with an id of "${id}" cannot be found`],
      });
      return res.end();
    }

    let name: string | undefined, url: string | undefined, path: string | undefined;

    try {
      const validatedSchema = await putRedirectSchema.validate(req.body);
      url = validatedSchema.url;
      path = validatedSchema.path;

      if (path) {
        // Remove preceding and trailing slashes from path
        if (path[0] === "/") {
          path = path.slice(1, path.length);
        }
        if (path[path.length - 1] === "/") {
          path = path.slice(0, -1);
        }

        if (path.replaceAll("/", "").length < 4) {
          throw new ValidationError("A path must contain at least 4 non-/ characters");
        }
      }

      name = validatedSchema.name;
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        res.status(400);
        res.json({
          errors: err.errors.map(message => `Validation Error: ${message}`),
        });
        return res.end();
      } else {
        if (process.env.NODE_ENV === "development") {
          res.status(500);
          if (err instanceof Error) {
            return res.json({
              errors: [err.message],
            });
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    if (database.redirects.getAll().findIndex(redirect => redirect.path === path) !== -1) {
      res.status(400);
      res.json({
        errors: [`A redirect with a path of "${path}" already exists`],
      });
      return res.end();
    }

    // Explicit cast to Redirect because we know the redirect exists.
    const redirect = database.redirects.get(id) as Redirect;

    if (name) {
      redirect.name = name;
    }

    if (path) {
      redirect.path = path;
    }

    if (url) {
      redirect.url = url;
    }

    res.status(200);
    res.json({
      id: redirect.id,
      name: redirect.name,
      path: redirect.path,
      url: redirect.url,
    });
    return res.end();
  });

  RedirectAPI.delete("/:id", async (req, res) => {
    if (!database.redirects.has(req.params.id)) {
      res.status(404);
      res.json({
        errors: [`A redirect with an id of "${req.params.id}" cannot be found`],
      });
      return res.end();
    }

    // Explicit cast to Redirect because we know the redirect exists.
    const redirect = database.redirects.delete(req.params.id) as Redirect;

    res.status(200);
    res.json({
      id: redirect.id,
      name: redirect.name,
      path: redirect.path,
      url: redirect.url,
    });
    return res.end();
  });

  return RedirectAPI;
}
