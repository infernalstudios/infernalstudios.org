import { BasicTable } from "patchdb";
import { Database } from "../Database";
import { Redirect } from "./Redirect";

export class RedirectManager {
  public constructor(public database: Database) {}

  public get table(): BasicTable<Redirect> {
    return this.database.getTable("redirects") as BasicTable<Redirect>;
  }

  /**
   * If a redirect already exists, this function will return it, if not,
   * it will create a new redirect and add it to the database.
   */
  public create(
    id: string,
    {
      path,
      name = path,
      url,
    }: {
      name: string;
      url: string;
      path: string;
    }
  ): Redirect {
    let redirect = this.table.get(id);
    if (!redirect) {
      redirect = new Redirect(id, { name, url, path }, this.table);
      this.table.add(redirect);
    }
    return redirect;
  }

  public has(id: string): boolean {
    return typeof this.table.get(id) !== "undefined";
  }

  public get(id: string): Redirect | undefined {
    return this.table.get(id);
  }

  public getAll(): Redirect[] {
    return this.table.getAll();
  }

  public delete(id: string): Redirect | undefined {
    const redirect = this.get(id);
    this.table.set(id, null as unknown as Redirect);
    return redirect;
  }
}
