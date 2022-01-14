import { Database } from "./Database";

export class Redirect {
  private id: string;
  private name: string;
  private url: string;
  private path: string;
  #database: Database;

  constructor(redirect: RedirectSchema, database: Database) {
    this.id = redirect.id;
    this.name = redirect.name;
    this.url = redirect.url;
    this.path = redirect.path;
    this.#database = database;
  }

  public async delete(): Promise<number> {
    return this.#database.sql.from("redirects").where({ id: this.id }).del();
  }

  public async setId(id: string): Promise<void> {
    const newId = (
      await this.#database.sql.select("*").from("redirects").where({ id }).update({ id }).returning("id")
    )[0];
    this.id = newId;
  }

  public async setName(name: string): Promise<void> {
    const newName = (
      await this.#database.sql.select("*").from("redirects").where({ name }).update({ name }).returning("name")
    )[0];
    this.name = newName;
  }

  public async setUrl(url: string): Promise<void> {
    const newUrl = (
      await this.#database.sql.select("*").from("redirects").where({ url }).update({ url }).returning("url")
    )[0];
    this.url = newUrl;
  }

  public async setPath(path: string): Promise<void> {
    const newPath = (
      await this.#database.sql.select("*").from("redirects").where({ path }).update({ path }).returning("path")
    )[0];
    this.path = newPath;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getUrl(): string {
    return this.url;
  }

  public getPath(): string {
    return this.path;
  }

  public toJSON(): RedirectSchema {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      path: this.path,
    };
  }
}

export interface RedirectSchema {
  id: string;
  name: string;
  url: string;
  path: string;
}
