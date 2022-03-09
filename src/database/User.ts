// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import { hashPassword } from "../util/Util";
import { Database } from "./Database";
import { Token } from "./Token";

export class User {
  private id: string;
  private password: string;
  private salt: string;
  private permissions: string[];
  private passwordChangeRequested: boolean;
  private database: Database;

  public constructor(user: UserSchema, database: Database) {
    this.id = user.id;
    this.password = user.password;
    this.salt = user.salt;
    this.permissions = user.permissions;
    this.passwordChangeRequested = user.passwordChangeRequested;
    this.database = database;
  }

  public async delete(): Promise<number> {
    return await this.database.sql.select("*").from("users").where({ id: this.id }).del();
  }

  public async getTokens(): Promise<Token[]> {
    return await this.database.tokens.getByUser(this.id);
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

  public getPasswordChangeRequested(): boolean {
    return this.passwordChangeRequested;
  }

  public hasPermission(permission: string): boolean {
    if (permission === "self:modify" || permission === "token:delete" || this.permissions.includes("superadmin")) {
      return true;
    } else if (this.permissions.includes("admin")) {
      return permission !== "user:delete" && permission !== "user:create";
    } else {
      return this.permissions.includes(permission);
    }
  }

  public async setUsername(username: string): Promise<void> {
    const newUsername = (
      await this.database.sql.from("users").where({ id: this.id }).update({ id: username }).returning("*")
    )[0].id;
    this.id = newUsername;
  }

  public async setPassword(password: string): Promise<void> {
    const hashedPassword = await hashPassword(password, this.salt);
    const newPassword = (
      await this.database.sql.from("users").where({ id: this.id }).update({ password: hashedPassword }).returning("*")
    )[0].password;
    this.password = newPassword;
  }

  public async setPermissions(permissions: string[]): Promise<void> {
    const newPermissions = (
      await this.database.sql.from("users").where({ id: this.id }).update({ permissions }).returning("*")
    )[0].permissions;
    this.permissions = newPermissions;
  }

  public async setPasswordChangeRequested(passwordChangeRequested: boolean): Promise<void> {
    const newPasswordChangeRequested = (
      await this.database.sql.from("users").where({ id: this.id }).update({ passwordChangeRequested }).returning("*")
    )[0].passwordChangeRequested;
    this.passwordChangeRequested = newPasswordChangeRequested;
  }

  public async matchPassword(password: string): Promise<boolean> {
    return (await hashPassword(password, this.salt)) === this.password;
  }

  public toJSON(): UserSchema {
    return {
      id: this.id,
      password: this.password,
      salt: this.salt,
      permissions: this.permissions,
      passwordChangeRequested: this.passwordChangeRequested,
    };
  }

  public static sanitizeJSON(user: User | UserSchema): Omit<UserSchema, "password" | "salt"> {
    if (user instanceof User) {
      user = user.toJSON();
    }

    // @ts-expect-error - YES TYPESCRIPT I KNOW THAT IT ISN'T POSSIBLE TO DELETE REQUIRED FIELDS I'M DELETING THEM SO THE'YERE UNDEFINED SO I CAN RETURN THEM SAFELY
    delete user.password;
    // @ts-expect-error lmao look up
    delete user.salt;

    return user;
  }
}

export interface UserSchema {
  id: string;
  password: string;
  salt: string;
  permissions: string[];
  passwordChangeRequested: boolean;
}
