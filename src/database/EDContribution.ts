// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import { Database } from "./Database";

export class EDContribution {
  private id: string;
  private key: string;
  private value: string;
  private user: string;
  private isDiscord: boolean;
  private database: Database;

  constructor(contribution: EDContributionSchema, database: Database) {
    this.id = contribution.id;
    this.key = contribution.key;
    this.value = contribution.value;
    this.user = contribution.user;
    this.isDiscord = contribution.isDiscord;
    this.database = database;
  }

  public async delete(): Promise<number> {
    return this.database.sql.from("temp_ed").where({ id: this.id }).del();
  }

  public getId(): string {
    return this.id;
  }

  public getKey(): string {
    return this.key;
  }

  public getValue(): string {
    return this.value;
  }

  public getUser(): string {
    return this.user;
  }

  public getIsDiscord(): boolean {
    return this.isDiscord;
  }

  public toJSON(): EDContributionSchema {
    return {
      id: this.id,
      key: this.key,
      value: this.value,
      user: this.user,
      isDiscord: this.isDiscord,
    };
  }
}

export interface EDContributionSchema {
  id: string;
  key: string;
  value: string;
  user: string;
  isDiscord: boolean;
}

export type EDContributionsJSON = Record<string, Omit<EDContributionSchema, "key">[]>;
