import { Observable, of, from, switchMap, map, catchError, concat, toArray } from "rxjs";
import { openDB, deleteDB } from "idb";
import { ApiNotesService } from "./api-notes-service";

export const migrateLocalDataToServer = (userId: string): Observable<void> => {
  const api = new ApiNotesService(userId);

  return from(openDB("morganizeit", 2)).pipe(
    switchMap((db) => {
      return from(db.getAll("notebooks") as Promise<Notebook[]>).pipe(
        switchMap((notebooks) => {
          const hasNotes = db.objectStoreNames.contains("notes");

          if (notebooks.length === 0 && !hasNotes) {
            db.close();
            return from(deleteDB("morganizeit")).pipe(map(() => undefined));
          }

          const notesPromise = hasNotes
            ? (db.getAll("notes") as Promise<Note[]>)
            : Promise.resolve([] as Note[]);

          return from(notesPromise).pipe(
            switchMap((notes) => {
              db.close();

              if (notebooks.length === 0 && notes.length === 0) {
                return from(deleteDB("morganizeit")).pipe(map(() => undefined));
              }

              // Upload notebooks first, then notes with new notebook IDs
              const notebookUploads$ = notebooks.map((nb) =>
                api.createNotebook(nb.name).pipe(map((created) => ({ oldId: nb.id, newId: created.id })))
              );

              if (notebookUploads$.length === 0) {
                return from(deleteDB("morganizeit")).pipe(map(() => undefined));
              }

              return concat(...notebookUploads$).pipe(
                toArray(),
                switchMap((idMap) => {
                  if (notes.length === 0) {
                    return from(deleteDB("morganizeit")).pipe(map(() => undefined));
                  }

                  const noteUploads$ = notes.map((note) => {
                    const mapping = idMap.find((m) => m.oldId === note.notebookId);
                    const now = new Date().toISOString();
                    return api.createNote({
                      title: note.title,
                      content: note.content,
                      textContent: note.textContent ?? note.content ?? "",
                      notebookId: mapping?.newId ?? note.notebookId,
                      userId,
                      createdAt: note.createdAt ?? now,
                      updatedAt: note.updatedAt ?? now,
                      lastOpenedAt: note.lastOpenedAt ?? now,
                    });
                  });

                  return concat(...noteUploads$).pipe(
                    toArray(),
                    switchMap(() => from(deleteDB("morganizeit"))),
                    map(() => undefined)
                  );
                })
              );
            })
          );
        })
      );
    }),
    catchError((err) => {
      console.error("Failed to migrate local data to server:", err);
      return of(undefined);
    })
  );
};
