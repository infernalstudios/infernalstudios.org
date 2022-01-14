import { Database } from "./Database";
import { User } from "./User";

export class Token {
  private id: string;
  private user: string;
  private permissions: string[];
  #database: Database;

  public constructor(token: TokenSchema, database: Database) {
    this.id = token.id;
    this.user = token.user;
    this.permissions = token.permissions;
    this.#database = database;
  }

  public getId(): string {
    return this.id;
  }

  public async getUser(): Promise<User> {
    const user = await this.#database.users.get(this.user);
    if (!user) {
      throw new Error("User not found in database, this should never happen");
    }
    return user;
  }

  public getPermissions(): string[] {
    return this.permissions;
  }

  public async hasPermission(permission: string): Promise<boolean> {
    return this.permissions.includes(permission) && (await this.getUser()).hasPermission(permission);
  }

  public async setPermissions(): Promise<void> {
    const permissions = (
      await this.#database.sql
        .from("tokens")
        .where({ id: this.id })
        .update({ permissions: this.permissions })
        .returning("permissions")
    )[0];
    this.permissions = permissions;
  }

  public async delete(): Promise<number> {
    return await this.#database.tokens.delete(this.id);
  }
}

export interface TokenSchema {
  id: string;
  user: string;
  permissions: string[];
}

type ReadablePermissions = "user";
type WritablePermissions = "user" | "redirect" | "mod";
export type Permission = `${ReadablePermissions}:read` | `${WritablePermissions}:write` | "admin" | "superadmin";
