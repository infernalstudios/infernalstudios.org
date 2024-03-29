// Copyright (c) 2022 Infernal Studios, All Rights Reserved unless otherwise explicitly stated.
import chalk from "chalk";
import knex, { Knex } from "knex";
import { Logger } from "logerian";
import { createKnexLogger } from "../util/Util";
import { EDContributionManager, ModManager, RedirectManager, TokenManager, UserManager } from "./DatabaseManager";
import { EDContributionSchema } from "./EDContribution";
import { ModSchema } from "./Mod";
import { RedirectSchema } from "./Redirect";
import { TokenSchema } from "./Token";
import { UserSchema } from "./User";
import { SQLVersionSchema } from "./Version";

declare module "knex/types/tables" {
  interface Tables {
    mods: ModSchema;
    temp_ed: EDContributionSchema;
    redirects: RedirectSchema;
    tokens: TokenSchema;
    users: UserSchema;
    versions: SQLVersionSchema;
  }
}

export interface DatabaseOptions {
  connectionString: string;
  logger: Logger;
}

export class Database {
  private options: DatabaseOptions;
  private logger: Logger;
  private intervals: NodeJS.Timeout[] = [];
  public sql: Knex = null as unknown as Knex; // Shut up typescript
  public mods: ModManager = new ModManager(this);
  public redirects: RedirectManager = new RedirectManager(this);
  public tokens: TokenManager = new TokenManager(this);
  public users: UserManager = new UserManager(this);
  public temp_ed: EDContributionManager = new EDContributionManager(this);

  public constructor(options: DatabaseOptions) {
    this.options = options;
    this.logger = new Logger({
      identifier: chalk`{gray [}{green Database}{gray ]}\t`,
      streams: [{ stream: options.logger }],
    });
  }

  public async connect(test = true): Promise<void> {
    this.sql = knex({
      client: "pg",
      connection: this.options.connectionString,
      debug: process.env.DATABASE_LOG === "true",
      log: createKnexLogger(this.options.logger),
    });

    if (test) {
      try {
        await this.mods.getAllJSON();
        await this.redirects.getAllJSON();
        await this.tokens.getAllJSON();
        await this.users.getAllJSON();
        await this.temp_ed.getAllJSON();

        if ((await this.users.getAll()).length === 0) {
          this.logger.warn("No users found in database");
        }
        this.intervals.push(
          setInterval(() => this.tokens.clearExpired(), 1000 * 60) // Clear expired tokens every minute
        );
      } catch (err) {
        this.logger.error(err);
        this.logger.fatal("Database failed, did you setup the database correctly?");
      }
    }
  }

  public async close(): Promise<void> {
    this.intervals.forEach(interval => clearInterval(interval));
    await this.sql.destroy();
  }

  public async setup(): Promise<void> {
    this.logger.debug(chalk`Setting up table {green 'mods'}...`);
    const modsPromise = this.setupModsTable().then(() => this.logger.debug(chalk`Table {green 'mods'} setup`));
    const versionsPromise = modsPromise.then(async () => {
      this.logger.debug(chalk`Setting up table {green 'versions'}...`);
      await this.setupVersionsTable();
      this.logger.debug(chalk`Table {green 'versions'} setup`);
    });

    this.logger.debug(chalk`Setting up table {green 'redirects'}...`);
    const redirectsPromise = this.setupRedirectsTable().then(() =>
      this.logger.debug(chalk`Table {green 'redirects'} setup`)
    );
    this.logger.debug(chalk`Setting up table {green 'users'}...`);
    const usersPromise = this.setupUsersTable().then(() => this.logger.debug(chalk`Table {green 'users'} setup`));
    const tokensPromise = usersPromise.then(async () => {
      this.logger.debug(chalk`Setting up table {green 'tokens'}...`);
      await this.setupTokensTable();
      this.logger.debug(chalk`Table {green 'tokens'} setup`);
    });

    this.logger.debug(chalk`Setting up table {green 'temp_ed'}...`);
    const edContributionsPromise = this.setupTempEDTable().then(() =>
      this.logger.debug(chalk`Table {green 'temp_ed'} setup`)
    );

    await Promise.all([
      modsPromise,
      versionsPromise,
      redirectsPromise,
      usersPromise,
      tokensPromise,
      edContributionsPromise,
    ]);

    this.logger.info("Database setup complete!");
  }

  private async setupModsTable(): Promise<void> {
    if (!(await this.sql.schema.hasTable("mods"))) {
      this.logger.debug("Table mods doesn't exist, creating...");
      await this.sql.schema.createTable("mods", table => {
        table.string("id", 255).index().primary().notNullable();
        table.string("name", 255).notNullable();
        table.string("url", 255).notNullable();
      });
    }
  }

  private async setupRedirectsTable(): Promise<void> {
    if (!(await this.sql.schema.hasTable("redirects"))) {
      this.logger.debug("Table redirects doesn't exist, creating...");
      await this.sql.schema.createTable("redirects", table => {
        table.string("id", 255).index().primary().notNullable();
        table.string("name", 255).notNullable();
        table.string("url", 511).notNullable();
        table.string("path", 255).index().notNullable();
      });
    }
  }

  private async setupTokensTable(): Promise<void> {
    if (!(await this.sql.schema.hasTable("tokens"))) {
      this.logger.debug("Table tokens doesn't exist, creating...");
      await this.sql.schema.createTable("tokens", table => {
        table.string("id", 127).index().primary().notNullable();
        table.string("user", 255).index().notNullable();
        table.string("reason", 255).defaultTo("unspecified").notNullable();
        table.specificType("permissions", "varchar(255) array").notNullable();
        table.integer("expiry").defaultTo(0x7fffffff).notNullable();
        table.foreign("user").references("users.id").onDelete("CASCADE");
      });
    }
  }

  private async setupUsersTable(): Promise<void> {
    if (!(await this.sql.schema.hasTable("users"))) {
      this.logger.debug("Table users doesn't exist, creating...");
      await this.sql.schema.createTable("users", table => {
        table.string("id", 255).index().primary().notNullable();
        table.string("password", 128).notNullable();
        table.string("salt", 32).notNullable();
        table.specificType("permissions", "varchar(64) array").notNullable();
        table.boolean("passwordChangeRequested").notNullable().defaultTo(false);
      });
    }
  }

  private async setupVersionsTable(): Promise<void> {
    if (!(await this.sql.schema.hasTable("versions"))) {
      this.logger.debug("Table versions doesn't exist, creating...");
      await this.sql.schema.createTable("versions", table => {
        table.string("id", 255).notNullable().index();
        table.string("name", 255).notNullable();
        table.string("url", 511).notNullable();
        table.string("minecraft", 255).notNullable().index();
        table.boolean("recommended").notNullable().defaultTo(false);
        table.string("changelog", 16000).notNullable();
        table.string("loader", 255).notNullable().index();
        table.string("mod", 255).notNullable();
        table.jsonb("dependencies").notNullable();
        table.foreign("mod").references("mods.id").onDelete("CASCADE");
        table.primary(["mod", "id", "minecraft", "loader"]);
      });
    }
  }

  private async setupTempEDTable(): Promise<void> {
    if (!(await this.sql.schema.hasTable("temp_ed"))) {
      this.logger.debug("Table temp_ed doesn't exist, creating...");
      await this.sql.schema.createTable("temp_ed", table => {
        table.string("id", 32).index().primary().notNullable();
        table.string("key", 255).notNullable();
        table.string("value", 2047).notNullable();
        table.string("user", 255).notNullable();
        table.boolean("isDiscord").notNullable().defaultTo(false);
      });
    }
  }
}
