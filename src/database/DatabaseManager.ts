import { Database } from "./Database";
import { Mod, ModSchema } from "./Mod";
import { Redirect, RedirectSchema } from "./Redirect";
import { Token, TokenSchema } from "./Token";
import { User, UserSchema } from "./User";

export class DatabaseManager<Schema extends { id: string } = { id: string }, SchemaClass = unknown> {
  public constructor(
    public database: Database,
    protected name: string,
    protected classConstructor: (schema: Schema, database: Database) => SchemaClass
  ) {}

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

  public async get(id: string): Promise<SchemaClass> {
    const schema = await this.database.sql.select("*").from(this.name).where({ id });
    return this.classConstructor(schema[0], this.database);
  }

  public async delete(id: string): Promise<void> {
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

  public async getByPath(path: string): Promise<Redirect> {
    const redirect = await this.database.sql.select("*").from(this.name).where({ path });
    return new Redirect(redirect[0], this.database);
  }
}

export class TokenManager extends DatabaseManager<TokenSchema, Token> {
  public constructor(database: Database) {
    super(database, "tokens", (schema, database) => new Token(schema, database));
  }

  public async getByUser(user: string): Promise<Token[]> {
    const tokens = await this.database.sql.select("*").from(this.name).where({ user });
    return tokens.map(token => new Token(token, this.database));
  }
}

export class UserManager extends DatabaseManager<UserSchema, User> {
  public constructor(database: Database) {
    super(database, "users", (schema, database) => new User(schema, database));
  }

  public async getByToken(token: string): Promise<User> {
    const user = await (await this.database.tokens.get(token)).getUser();
    return user;
  }
}
