import { BasicTable } from "patchdb";

export class Token {
  private _id: string;
  public table: BasicTable<Token>;

  public constructor(token: string, table: BasicTable<Token>) {
    this._id = token;
    this.table = table;
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this.table.emit("stateChange");
    this._id = value;
  }

  get key(): string {
    return this.id;
  }

  set key(value: string) {
    this.id = value;
    this.table.emit("stateChange");
  }
}
