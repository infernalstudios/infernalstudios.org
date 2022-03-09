// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import { Database } from "./Database";
import { Version, VersionSchema } from "./Version";

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

  public async delete(): Promise<number> {
    return this.database.sql.from("mods").where({ id: this.id }).del();
  }

  public async setId(id: string): Promise<void> {
    const newId = (
      await this.database.sql.select("*").from("mods").where({ id: this.id }).update({ id }).returning("*")
    )[0].id;
    this.id = newId;
  }

  public async setName(name: string): Promise<void> {
    const newName = (
      await this.database.sql.select("*").from("mods").where({ id: this.id }).update({ name }).returning("*")
    )[0].name;
    this.name = newName;
  }

  public async setUrl(url: string): Promise<void> {
    const newUrl = (
      await this.database.sql.select("*").from("mods").where({ id: this.id }).update({ url }).returning("*")
    )[0].url;
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
      version => new Version(version as unknown as VersionSchema, this.database)
    );
  }

  public async deleteVersion(version: Version): Promise<number> {
    return await this.database.sql
      .from("versions")
      .where({ mod: this.id, id: version.getId(), loader: version.getLoader(), minecraft: version.getMinecraft() })
      .del();
  }

  public async addVersion(version: Omit<VersionSchema, "mod">): Promise<Version> {
    const newVersion = await this.database.sql
      .insert({ ...version, mod: this.id, dependencies: JSON.stringify(version.dependencies) })
      .into("versions")
      .returning("*");
    return new Version(newVersion[0] as unknown as VersionSchema, this.database);
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
