import { Database } from "./Database";
import { User } from "./User";

export class Token {
  private id: string;
  private user: string;
  private expiry: number;
  private permissions: string[];
  private reason: string;
  #database: Database;

  public constructor(token: TokenSchema, database: Database) {
    this.id = token.id;
    this.user = token.user;
    this.expiry = token.expiry;
    this.permissions = token.permissions;
    this.reason = token.reason;
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

  public getExpiry(): number {
    return this.expiry;
  }

  public isExpired(): boolean {
    return Date.now() / 1000 >= this.expiry;
  }

  public async setExpiry(expireTime: number): Promise<number> {
    const expiry = (
      await this.#database.sql.from("tokens").where({ id: this.id }).update({ expiry: expireTime }).returning("expiry")
    )[0];
    this.expiry = expiry;
    return this.expiry;
  }

  public getPermissions(): string[] {
    return this.permissions;
  }

  public async hasPermission(permission: string): Promise<boolean> {
    return (
      this.permissions.some(p => p === permission || p === "admin" || p === "superadmin") &&
      (await this.getUser()).hasPermission(permission)
    );
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

  public getReason(): string {
    return this.reason;
  }

  public async setReason(reason: string): Promise<void> {
    const newReason = (
      await this.#database.sql.from("tokens").where({ id: this.id }).update({ reason: reason }).returning("reason")
    )[0];
    this.reason = newReason;
  }

  public async delete(): Promise<number> {
    return await this.#database.tokens.delete(this.id);
  }

  public toJson(): TokenSchema {
    return {
      id: this.id,
      user: this.user,
      expiry: this.expiry,
      permissions: this.permissions,
      reason: this.reason,
    };
  }

  private static PERMISSIONS: string[] = [
    "self:modify", // Users can modify their own data. Users always have this permission, this can be granted to tokens
    "user:modify", // Users can modify other users' data
    "user:view", // Users can view other users' data
    "token:delete", // Users can delete own tokens. Users always have this permission, this can be granted to tokens. Tokens can always delete themselves
    "mod:create", // Users can create new mods
    "mod:modify", // Users can modify existing mods
    "mod:delete", // Users can delete existing mods
    "redirect:create", // Users can create new redirects
    "redirect:modify", // Users can modify existing redirects
    "redirect:delete", // Users can delete existing redirects
    "admin", // Users can do anything, except delete other users' data and accounts
    "superadmin", // Users can do anything, including delete other users' data and accounts
  ] as string[];

  public static isPermissionValid(permission: string): boolean {
    return Token.PERMISSIONS.includes(permission);
  }
}

export interface TokenSchema {
  id: string;
  user: string;
  expiry: number;
  permissions: string[];
  reason: string;
}
