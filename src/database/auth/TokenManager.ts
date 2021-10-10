import { randomBytes } from "crypto";
import { BasicTable } from "patchdb";
import { Database } from "../Database";
import { Token } from "./Token";

export class TokenManager {
  public constructor(public database: Database) {}

  public get table(): BasicTable<Token> {
    return this.database.getTable("tokens") as BasicTable<Token>;
  }

  private getRandomToken(): string {
    return randomBytes(1 << 6).toString("base64url");
  }

  public create(): Token {
    let id: string;
    do {
      id = this.getRandomToken();
    } while (id.length !== 86 || this.table.get(id));
    const token = new Token(id, this.table);
    this.table.add(token);
    return token;
  }

  public has(id: string): boolean {
    return typeof this.table.get(id) !== "undefined";
  }

  public get(id: string): Token | undefined {
    return this.table.get(id);
  }

  public getAll(): Token[] {
    return this.table.getAll();
  }

  public delete(id: string): Token | undefined {
    const token = this.get(id);
    this.table.set(id, null as unknown as Token);
    return token;
  }
}
