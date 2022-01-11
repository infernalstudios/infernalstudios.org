import { Database } from "./Database";
import { Version } from "./Version";

export class Mod {
  private id: string;
  private name: string;
  private url: string;
  private database: Database;

  constructor(mod: ModSchema, database: Database) {
    this.id = mod.id;
    this.name = mod.name;
    this.url = mod.url;
    this.database = database;
  }

  public async delete(): Promise<void> {
    this.database.sql.from("mods").where({ id: this.id }).del();

    this.database.sql.from("versions").where({ mod: this.id }).del();
  }

  public async setId(id: string): Promise<void> {
    const newId = (await this.database.sql.select("*").from("mods").where({ id }).update({ id }).returning("id"))[0];
    this.id = newId;
  }

  public async setName(name: string): Promise<void> {
    const newName = (
      await this.database.sql.select("*").from("mods").where({ name }).update({ name }).returning("name")
    )[0];
    this.name = newName;
  }

  public async setUrl(url: string): Promise<void> {
    const newUrl = (
      await this.database.sql.select("*").from("mods").where({ url }).update({ url }).returning("url")
    )[0];
    this.url = newUrl;
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

  public async getVersions(): Promise<Version[]> {
    return (await this.database.sql.select("*").from("versions").where({ mod: this.id })).map(
      version => new Version(version, this.database)
    );
  }

  public async deleteVersion(version: string | Version): Promise<void> {
    await this.database.sql
      .from("versions")
      .where({ mod: this.id, id: typeof version === "string" ? version : version.getId() })
      .del();
  }

  public async addVersion(version: Version): Promise<void> {
    await this.database.sql.insert(version.toJSON()).into("versions");
  }

  public toJSON(): ModSchema {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
    };
  }
}

export interface ModSchema {
  id: string;
  name: string;
  url: string;
}
