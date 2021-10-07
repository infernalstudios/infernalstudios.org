import { Database as PatchDatabase, DatabaseOptions, Table } from "patchdb";
import { Redirect } from "./redirect/Redirect";
import { RedirectManager } from "./redirect/RedirectManager";

export class Database extends PatchDatabase {
  public redirects: RedirectManager;

  public constructor(options: DatabaseOptions) {
    super(options);

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
  }
}
