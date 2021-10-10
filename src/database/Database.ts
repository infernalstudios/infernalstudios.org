import { Logger } from "logerian";
import { Database as PatchDatabase, DatabaseOptions as PatchDatabaseOptions, Table } from "patchdb";
import { Token } from "./auth/Token";
import { TokenManager } from "./auth/TokenManager";
import { Redirect } from "./redirect/Redirect";
import { RedirectManager } from "./redirect/RedirectManager";

interface DatabaseOptions extends PatchDatabaseOptions {
  logger: Logger;
}

export class Database extends PatchDatabase {
  public redirects: RedirectManager;
  public tokens: TokenManager;
  private logger: Logger;

  public constructor(options: DatabaseOptions) {
    super(options);

    this.logger = options.logger;

    this.redirects = new RedirectManager(this);
    this.addTable(
      "redirects",
      new Table(
        true,
        json =>
          new Redirect(
            json.id as string,
            {
              name: json.name as string,
              url: json.url as string,
              path: json.path as string,
            },
            this.redirects.table
          ),
        redirect => ({ id: redirect.id, name: redirect.name, url: redirect.url, path: redirect.path })
      )
    );

    this.redirects.table.on("stateChange", () => {
      // @ts-expect-error getAllCache is private
      delete this.redirects.getAllCache;
    });

    this.tokens = new TokenManager(this);
    this.addTable(
      "tokens",
      new Table(
        true,
        json => new Token(json.id as string, this.tokens.table),
        token => ({ id: token.id })
      )
    );

    this.once("ready", () => {
      if (this.tokens.getAll().length === 0) {
        this.logger.info("There are 0 API tokens in the database. Creating new token...");
        const token = this.tokens.create();
        this.logger.info(`\tToken: ${token.id}`);
      }
    });
  }
}
