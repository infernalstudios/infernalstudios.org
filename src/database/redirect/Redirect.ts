import { BasicTable } from "patchdb";

export class Redirect {
  private _id: string;
  private _name: string;
  private _url: string;
  private _path: string;
  public table: BasicTable<Redirect>;

  public constructor(
    id: string,
    {
      path,
      name = path,
      url,
    }: {
      name: string;
      url: string;
      path: string;
    },
    table: BasicTable<Redirect>
  ) {
    this._id = id;
    this._name = name;
    this._url = url;
    this._path = path;
    this.table = table;
  }

  //#region Getters and setters, for emitting changes
  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this.table.emit("stateChange");
    this._name = value;
  }

  get url(): string {
    return this._url;
  }

  set url(value: string) {
    this.table.emit("stateChange");
    this._url = value;
  }

  get path(): string {
    return this._path;
  }

  set path(value: string) {
    this.table.emit("stateChange");
    this._path = value;
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this.table.emit("stateChange");
    this._id = value;
  }
  //#endregion

  get key(): string {
    return this.id;
  }

  set key(value: string) {
    this.id = value;
    this.table.emit("stateChange");
  }
}
