import { Database } from "./Database";
import { Mod } from "./Mod";

export class Version {
  private id: string;
  private name: string;
  private url: string;
  private minecraft: string;
  private changelog: string;
  private loader: string;
  private mod: string;
  private dependencies: VersionDependency[];
  private database: Database;

  constructor(version: SQLVersionSchema, database: Database) {
    this.id = version.id;
    this.name = version.name;
    this.url = version.url;
    this.minecraft = version.minecraft;
    this.changelog = version.changelog;
    this.loader = version.loader;
    this.mod = version.mod;
    this.dependencies = JSON.parse(version.dependencies);
    this.database = database;
  }

  public async delete(): Promise<void> {
    return this.database.sql
      .from("versions")
      .where({ id: this.id, minecraft: this.minecraft, loader: this.loader })
      .del();
  }

  public async setId(id: string): Promise<void> {
    const newId = (
      await this.database.sql
        .select("*")
        .from("versions")
        .where({ id: this.id, minecraft: this.minecraft, loader: this.loader })
        .update({ id })
        .returning("id")
    )[0];
    this.id = newId;
  }

  public async setName(name: string): Promise<void> {
    const newName = (
      await this.database.sql
        .select("*")
        .from("versions")
        .where({ id: this.id, minecraft: this.minecraft, loader: this.loader })
        .update({ name })
        .returning("name")
    )[0];
    this.name = newName;
  }

  public async setUrl(url: string): Promise<void> {
    const newUrl = (
      await this.database.sql
        .select("*")
        .from("versions")
        .where({ id: this.id, minecraft: this.minecraft, loader: this.loader })
        .update({ url })
        .returning("url")
    )[0];
    this.url = newUrl;
  }

  public async setDependencies(dependencies: VersionDependency[]): Promise<void>;
  public async setDependencies(dependencies: string): Promise<void>;
  public async setDependencies(dependencies: VersionDependency[] | string): Promise<void> {
    if (typeof dependencies !== "string") {
      dependencies = JSON.stringify(dependencies);
    }
    const newDependencies = (
      await this.database.sql
        .select("*")
        .from("versions")
        .where({ id: this.id, minecraft: this.minecraft, loader: this.loader })
        .update({ dependencies })
        .returning("dependencies")
    )[0];
    this.dependencies = JSON.parse(newDependencies);
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

  public getMinecraft(): string {
    return this.minecraft;
  }

  public getChangelog(): string {
    return this.changelog;
  }

  public getLoader(): string {
    return this.loader;
  }

  public getDependencies(): VersionDependency[] {
    return this.dependencies;
  }

  public async getMod(): Promise<Mod> {
    const mod = await this.database.sql.select("*").from("mods").where({ id: this.mod });

    return new Mod(mod[0], this.database);
  }

  public toJSON(): VersionSchema {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      minecraft: this.minecraft,
      changelog: this.changelog,
      loader: this.loader,
      mod: this.mod,
      dependencies: this.dependencies,
    };
  }
}

export interface VersionSchema {
  id: string;
  name: string;
  url: string;
  minecraft: string;
  changelog: string;
  loader: string;
  mod: string;
  dependencies: VersionDependency[];
}

export interface SQLVersionSchema extends Omit<VersionSchema, "dependencies"> {
  dependencies: string;
}

export interface VersionDependency {
  id: string;
  url: string;
  required: boolean;
  side: string;
  version: string;
}
