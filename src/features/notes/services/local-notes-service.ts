import { IDBPDatabase, openDB } from "idb";
import { from, map, Observable, switchMap } from "rxjs";
import { v4 as uuid } from "uuid";
import { NotesService } from "./notes-service";

export class LocalNotesService implements NotesService {
  private _db?: Promise<IDBPDatabase>;

  private getDb(): Promise<IDBPDatabase> {
    if (this._db == null) {
      this._db = openDB("morganizeit", 2, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("notebooks")) {
            db.createObjectStore("notebooks", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("notes")) {
            db.createObjectStore("notes", { keyPath: "id" });
          }
        },
      });
    }

    return this._db;
  }

  public getNotebooks(): Observable<Notebook[]> {
    return from(this.getDb()).pipe(switchMap((db) => from(db.getAll("notebooks"))));
  }

  public createNotebook(name: string): Observable<Notebook> {
    const notebook: Notebook = { id: uuid(), name, userId: "" };

    return from(this.getDb()).pipe(
      switchMap((db) => from(db.add("notebooks", notebook))),
      map(() => notebook)
    );
  }

  public updateNotebook(id: string, name: string): Observable<Notebook> {
    return from(this.getDb()).pipe(
      switchMap((db) =>
        from(db.get("notebooks", id) as Promise<Notebook>).pipe(
          switchMap((notebook) => {
            const updated = { ...notebook, name };
            return from(db.put("notebooks", updated)).pipe(map(() => updated));
          })
        )
      )
    );
  }

  public deleteNotebook(id: string): Observable<void> {
    return from(this.getDb()).pipe(
      switchMap((db) =>
        from(db.getAll("notes") as Promise<Note[]>).pipe(
          switchMap((notes) => {
            const toDelete = notes.filter((n) => n.notebookId === id);
            const tx = db.transaction("notes", "readwrite");
            const deletes = toDelete.map((n) => tx.store.delete(n.id));
            return from(Promise.all([...deletes, tx.done]));
          }),
          switchMap(() => from(db.delete("notebooks", id)))
        )
      )
    );
  }

  public getNotes(notebookId: string): Observable<Note[]> {
    return from(this.getDb()).pipe(
      switchMap((db) => from(db.getAll("notes") as Promise<Note[]>)),
      map((notes) => notes.filter((n) => n.notebookId === notebookId))
    );
  }

  public createNote(note: Omit<Note, "id">): Observable<Note> {
    const newNote: Note = { ...note, id: uuid() };

    return from(this.getDb()).pipe(
      switchMap((db) => from(db.add("notes", newNote))),
      map(() => newNote)
    );
  }

  public updateNote(id: string, data: Partial<Note>): Observable<Note> {
    return from(this.getDb()).pipe(
      switchMap((db) =>
        from(db.get("notes", id) as Promise<Note>).pipe(
          switchMap((note) => {
            const updated = { ...note, ...data };
            return from(db.put("notes", updated)).pipe(map(() => updated));
          })
        )
      )
    );
  }

  public deleteNote(id: string): Observable<void> {
    return from(this.getDb()).pipe(switchMap((db) => from(db.delete("notes", id))));
  }
}
