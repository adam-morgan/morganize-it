import { IDBPDatabase, openDB } from "idb";
import { from, map, Observable, switchMap } from "rxjs";
import { v4 as uuid } from "uuid";
import { NotesService } from "./notes-service";

export class LocalNotesService implements NotesService {
  private _db?: Promise<IDBPDatabase>;

  private getDb(): Promise<IDBPDatabase> {
    if (this._db == null) {
      this._db = openDB("morganizeit", 1, {
        upgrade(db) {
          db.createObjectStore("notebooks", { keyPath: "id" });
        },
      });
    }

    return this._db;
  }

  public getNotebooks(): Observable<Notebook[]> {
    return from(this.getDb()).pipe(switchMap((db) => from(db.getAll("notebooks"))));
  }

  public createNotebook(name: string): Observable<Notebook> {
    const notebook: Notebook = { id: uuid(), name };

    return from(this.getDb()).pipe(
      switchMap((db) => from(db.add("notebooks", notebook))),
      map(() => notebook)
    );
  }
}
