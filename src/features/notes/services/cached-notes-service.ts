import { from, map, Observable, switchMap, tap } from "rxjs";
import { NotesService } from "./notes-service";
import { ApiNotesService } from "./api-notes-service";
import { getCacheDb } from "./cache-db";

export class CachedNotesService implements NotesService {
  constructor(
    private api: ApiNotesService,
    private userId: string
  ) {}

  getNotebooks(): Observable<Notebook[]> {
    return from(getCacheDb(this.userId)).pipe(
      switchMap((db) => from(db.getAll("notebooks") as Promise<Notebook[]>)),
      map((notebooks) => notebooks.filter((n) => !n.deletedAt))
    );
  }

  createNotebook(name: string): Observable<Notebook> {
    return this.api.createNotebook(name).pipe(
      tap((nb) => this.writeToCache("notebooks", nb))
    );
  }

  updateNotebook(id: string, name: string): Observable<Notebook> {
    return this.api.updateNotebook(id, name).pipe(
      tap((nb) => this.writeToCache("notebooks", nb))
    );
  }

  deleteNotebook(id: string): Observable<void> {
    return this.api.deleteNotebook(id).pipe(
      tap(() => {
        this.deleteFromCache("notebooks", id);
        // Also remove cached notes for this notebook
        getCacheDb(this.userId).then(async (db) => {
          const allNotes = await db.getAllFromIndex("notes", "notebookId", id) as Note[];
          const tx = db.transaction("notes", "readwrite");
          for (const note of allNotes) {
            await tx.store.delete(note.id);
          }
          await tx.done;
        });
      })
    );
  }

  getNotes(notebookId: string): Observable<Note[]> {
    return from(getCacheDb(this.userId)).pipe(
      switchMap((db) =>
        from(db.getAllFromIndex("notes", "notebookId", notebookId) as Promise<Note[]>)
      ),
      map((notes) => notes.filter((n) => !n.deletedAt))
    );
  }

  createNote(note: Omit<Note, "id">): Observable<Note> {
    return this.api.createNote(note).pipe(
      tap((n) => this.writeToCache("notes", n))
    );
  }

  updateNote(id: string, data: Partial<Note>): Observable<Note> {
    return this.api.updateNote(id, data).pipe(
      tap((n) => this.writeToCache("notes", n))
    );
  }

  deleteNote(id: string): Observable<void> {
    return this.api.deleteNote(id).pipe(
      tap(() => this.deleteFromCache("notes", id))
    );
  }

  private writeToCache(store: "notebooks" | "notes", item: Notebook | Note): void {
    getCacheDb(this.userId).then((db) => db.put(store, item));
  }

  private deleteFromCache(store: "notebooks" | "notes", id: string): void {
    getCacheDb(this.userId).then((db) => db.delete(store, id));
  }
}
