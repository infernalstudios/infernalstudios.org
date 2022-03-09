// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import { Database } from "./Database";
import { User } from "./User";

type Permission =
  | "self:modify"
  | "user:create"
  | "user:modify"
  | "user:delete"
  | "user:view"
  | "token:delete"
  | "mod:create"
  | "mod:modify"
  | "mod:delete"
  | "redirect:create"
  | "redirect:modify"
  | "redirect:delete"
  | "admin"
  | "superadmin";

const PERMISSIONS: Permission[] = [
  "self:modify", // Users can modify their own data. Users always have this permission, this can be granted to tokens
  "user:create", // Users can create new users (symbolic, requires superadmin)
  "user:modify", // Users can modify other users' data
  "user:delete", // Users can delete other users' data (symbolic, requires superadmin)
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
];

export class Token {
  private id: string;
  private user: string;
  private expiry: number;
  private permissions: string[];
  private reason: string;
  private database: Database;

  public constructor(token: TokenSchema, database: Database) {
    this.id = token.id;
    this.user = token.user;
    this.expiry = token.expiry;
    this.permissions = token.permissions;
    this.reason = token.reason;
    this.database = database;
  }

  public getId(): string {
    return this.id;
  }

  public async getUser(): Promise<User> {
    const user = await this.database.users.get(this.user);
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
      await this.database.sql.from("tokens").where({ id: this.id }).update({ expiry: expireTime }).returning("*")
    )[0].expiry;
    this.expiry = expiry;
    return this.expiry;
  }

  public getPermissions(): string[] {
    return this.permissions;
  }

  public async hasPermission(permission: string): Promise<boolean> {
    return (
      this.permissions.some(p => {
        if (p === "superadmin") {
          return true;
        } else if (p === "admin") {
          return permission !== "user:delete" && permission !== "user:create";
        } else {
          return p === permission;
        }
      }) && (await this.getUser()).hasPermission(permission)
    );
  }

  public async setPermissions(): Promise<void> {
    const permissions = (
      await this.database.sql
        .from("tokens")
        .where({ id: this.id })
        .update({ permissions: this.permissions })
        .returning("*")
    )[0].permissions;
    this.permissions = permissions;
  }

  public getReason(): string {
    return this.reason;
  }

  public async setReason(reason: string): Promise<void> {
    const newReason = (
      await this.database.sql.from("tokens").where({ id: this.id }).update({ reason: reason }).returning("*")
    )[0].reason;
    this.reason = newReason;
  }

  public async delete(): Promise<number> {
    return await this.database.tokens.delete(this.id);
  }

  public toJSON(): TokenSchema {
    return {
      id: this.id,
      user: this.user,
      expiry: this.expiry,
      permissions: this.permissions,
      reason: this.reason,
    };
  }

  public static readonly PERMISSIONS = PERMISSIONS;

  public static isPermissionValid(permission: string): boolean {
    return Token.PERMISSIONS.includes(permission as Permission);
  }
}

export interface TokenSchema {
  id: string;
  user: string;
  expiry: number;
  permissions: string[];
  reason: string;
}
