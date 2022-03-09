// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import { hashPassword, randomString } from "../util/Util";
import { Database } from "./Database";
import { Mod, ModSchema } from "./Mod";
import { Redirect, RedirectSchema } from "./Redirect";
import { Token, TokenSchema } from "./Token";
import { User, UserSchema } from "./User";

export class DatabaseManager<Schema extends { id: string } = { id: string }, SchemaClass = unknown> {
  public database: Database;
  protected name: string;
  protected classConstructor: (schema: Schema, database: Database) => SchemaClass;

  public constructor(
    database: Database,
    name: string,
    classConstructor: (schema: Schema, database: Database) => SchemaClass
  ) {
    this.database = database;
    this.name = name;
    this.classConstructor = classConstructor;
  }

  public async getAll(): Promise<SchemaClass[]> {
    return (await this.getAllJSON()).map(schema => this.classConstructor(schema, this.database));
  }

  public async getAllJSON(): Promise<Schema[]> {
    const schema = await this.database.sql.select("*").from(this.name);
    return schema;
  }

  public async create(schema: Schema): Promise<SchemaClass> {
    const newSchemaClass = await this.database.sql.insert(schema).into(this.name).returning("*");
    return this.classConstructor(newSchemaClass[0], this.database);
  }

  public async get(id: string): Promise<SchemaClass | undefined> {
    const schema = await this.database.sql.select("*").from(this.name).where({ id });
    if (schema.length !== 0) {
      return this.classConstructor(schema[0], this.database);
    } else {
      return undefined;
    }
  }

  public async delete(id: string): Promise<number> {
    return this.database.sql.from(this.name).where({ id }).del();
  }
}

export class ModManager extends DatabaseManager<ModSchema, Mod> {
  public constructor(database: Database) {
    super(database, "mods", (schema, database) => new Mod(schema, database));
  }
}

export class RedirectManager extends DatabaseManager<RedirectSchema, Redirect> {
  public constructor(database: Database) {
    super(database, "redirects", (schema, database) => new Redirect(schema, database));
  }

  public async getByPath(path: string): Promise<Redirect | undefined> {
    const redirect = await this.database.sql.select("*").from(this.name).where({ path });
    if (redirect.length !== 0) {
      return new Redirect(redirect[0], this.database);
    } else {
      return undefined;
    }
  }
}

export class TokenManager extends DatabaseManager<TokenSchema, Token> {
  public constructor(database: Database) {
    super(database, "tokens", (schema, database) => new Token(schema, database));
  }

  public async createToken(user: string, permissions: string[], reason: string, expiry?: number): Promise<Token> {
    return await super.create({
      id: randomString(127),
      user,
      expiry: expiry ?? 0x7fffffff,
      permissions,
      reason,
    });
  }

  /** @deprecated Use {@link createToken} instead */
  public override async create(token: TokenSchema): Promise<Token> {
    return await super.create(token);
  }

  public async getByUser(user: string): Promise<Token[]> {
    const tokens = await this.database.sql.select("*").from(this.name).where({ user });
    return tokens.map(token => new Token(token, this.database));
  }

  public async clearExpired(): Promise<void> {
    await this.database.sql
      .from(this.name)
      .where("expiry", "<", Math.ceil(Date.now() / 1000))
      .del();
  }
}

export class UserManager extends DatabaseManager<UserSchema, User> {
  public constructor(database: Database) {
    super(database, "users", (schema, database) => new User(schema, database));
  }

  public async createUser(id: string, password: string): Promise<User> {
    const salt = randomString(32);
    password = await hashPassword(password, salt);

    const newSchemaClass = await this.database.sql
      .insert({
        id,
        password,
        permissions: [],
        passwordChangeRequested: true,
        salt,
      })
      .into(this.name)
      .returning("*");
    return this.classConstructor(newSchemaClass[0], this.database);
  }

  /** @deprecated Use {@link createUser} instead */
  public override async create(user: UserSchema): Promise<User> {
    return await super.create(user);
  }

  public async getByToken(tokenId: string): Promise<User | undefined> {
    const token = await this.database.tokens.get(tokenId);
    if (token) {
      const user = await token.getUser();
      return user;
    } else {
      return undefined;
    }
  }
}
