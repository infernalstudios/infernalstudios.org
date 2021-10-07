import express, { Express } from "express";
import yup, { ValidationError } from "yup";
import { Database } from "../database/Database";

export function getAPI(database: Database): Express {
  const RedirectAPI = express();

  RedirectAPI.use(express.json());

  RedirectAPI.get("/", (_req, res) => {
    const redirects = database.redirects
      .getAll()
      .map(redirect => ({ id: redirect.id, name: redirect.name, url: redirect.url, path: redirect.path }));
    res.json(redirects);
    res.end();
  });

  const postRedirectSchema = yup.object().shape({
    id: yup
      .string()
      .trim()
      .matches(/^[\w\d-_]+$/i)
      .required(),
    name: yup
      .string()
      .trim()
      .matches(/^[\w\d-_ /\\]+$/i),
    url: yup.string().url().required(),
    path: yup
      .string()
      .trim()
      .matches(/^\/?\w+(\/\w+)*\/?$/i)
      .required(),
  });

  RedirectAPI.post("/", async (req, res) => {
    let id: string, name: string, url: string, path: string;
    try {
      const validated = await postRedirectSchema.validate({
        id: req.body.id,
        name: req.body.name,
        url: req.body.url,
        path: req.body.path,
      });
      id = validated.id;
      url = validated.url;
      path = validated.path;
      name = validated.name ?? validated.path;
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        res.status(400);
        return res.json({
          errors: err.errors.map(message => `Validation error: ${message}`),
        });
      } else {
        res.status(500);
        if (err instanceof Error) {
          return res.json({
            errors: [err.message],
          });
        } else {
          throw err;
        }
      }
    }

    if (database.redirects.has(id)) {
      res.status(400);
      return res.json({
        errors: [`A redirect with an id of "${id}" already exists`],
      });
    } else {
      const redirects = database.redirects.getAll();
      if (redirects.findIndex(redirect => redirect.path === path) !== -1) {
        res.status(400);
        return res.json({
          errors: [`A redirect with a path of "${path}" already exists`],
        });
      }
      const newRedirect = database.redirects.create(id, { path, name, url });

      return res.json({
        id: newRedirect.id,
        name: newRedirect.name,
        url: newRedirect.url,
        path: newRedirect.path,
      });
    }
  });

  RedirectAPI.get("/:id", (req, res) => {
    const redirect = database.redirects.get(req.params.id);
    if (redirect) {
      return res.json({
        id: redirect.id,
        name: redirect.name,
        url: redirect.url,
        path: redirect.path,
      });
    } else {
      res.status(404);
      return res.json({
        errors: [`A redirect with an id of "${req.params.id}" cannot be found`],
      });
    }
  });

  const putRedirectIdSchema = yup.object().shape({
    name: yup
      .string()
      .trim()
      .matches(/^[\w\d-_ /\\]+$/i),
    url: yup.string().url(),
    path: yup
      .string()
      .trim()
      .matches(/^\/?\w+(\/\w+)*\/?$/i),
  });

  RedirectAPI.put("/:id", async (req, res) => {
    const redirect = database.redirects.get(req.params.id);
    if (redirect) {
      let name: string | undefined, url: string | undefined, path: string | undefined;
      try {
        const validated = await putRedirectIdSchema.validate({
          name: req.body.name,
          url: req.body.url,
          path: req.body.path,
        });
        url = validated.url;
        path = validated.path;
        name = validated.name;
      } catch (err: unknown) {
        if (err instanceof ValidationError) {
          res.status(400);
          return res.json({
            errors: err.errors.map(message => `Validation error: ${message}`),
          });
        } else {
          res.status(500);
          if (err instanceof Error) {
            return res.json({
              errors: [err.message],
            });
          } else {
            throw err;
          }
        }
      }

      if (path) {
        const redirects = database.redirects.getAll();
        if (redirects.findIndex(redirect => redirect.path === path) !== -1) {
          res.status(400);
          return res.json({
            errors: [`A redirect with a path of "${path}" already exists`],
          });
        }
      }

      if (name) {
        redirect.name = name;
      }
      if (url) {
        redirect.url = url;
      }
      if (path) {
        redirect.path = path;
      }

      return res.json({
        id: redirect.id,
        name: redirect.name,
        url: redirect.url,
        path: redirect.path,
      });
    } else {
      res.status(404);
      return res.json({
        errors: [`A redirect with an id of "${req.params.id}" cannot be found`],
      });
    }
  });

  RedirectAPI.delete("/:id", async (req, res) => {
    const redirect = database.redirects.get(req.params.id);
    if (redirect) {
      database.redirects.delete(redirect.id);

      return res.json({
        id: redirect.id,
        name: redirect.name,
        url: redirect.url,
        path: redirect.path,
      });
    } else {
      res.status(404);
      return res.json({
        errors: [`A redirect with an id of "${req.params.id}" cannot be found`],
      });
    }
  });

  return RedirectAPI;
}
