import { hashPassword } from "../util/Util";
import { Database } from "./Database";
import { Token } from "./Token";

export class User {
  private id: string;
  private password: string;
  private salt: string;
  private permissions: string[];
  #database: Database;

  public constructor(user: UserSchema, database: Database) {
    this.id = user.id;
    this.password = user.password;
    this.salt = user.salt;
    this.permissions = user.permissions;
    this.#database = database;
  }

  public async delete(): Promise<number> {
    return await this.#database.sql.select("*").from("users").where({ id: this.id }).del();
  }

  public async getTokens(): Promise<Token[]> {
    return await this.#database.tokens.getByUser(this.id);
  }

  public getUsername(): string {
    return this.id;
  }

  public getPasswordHash(): string {
    return this.password;
  }

  public getPermissions(): string[] {
    return this.permissions;
  }

  public hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  public async setUsername(username: string): Promise<void> {
    const newUsername = (
      await this.#database.sql.from("users").where({ id: this.id }).update({ id: username }).returning("id")
    )[0];
    this.id = newUsername;
  }

  public async setPassword(password: string): Promise<void> {
    const hashedPassword = await hashPassword(password, this.salt);
    const newPassword = (
      await this.#database.sql
        .from("users")
        .where({ id: this.id })
        .update({ password: hashedPassword })
        .returning("password")
    )[0];
    this.password = newPassword;
  }

  public async matchPassword(password: string): Promise<boolean> {
    return (await hashPassword(password, this.salt)) === this.password;
  }

  public async toJSON(): Promise<UserSchema> {
    return {
      id: this.id,
      password: this.password,
      salt: this.salt,
      permissions: this.permissions,
    };
  }
}

export interface UserSchema {
  id: string;
  password: string;
  salt: string;
  permissions: string[];
}
