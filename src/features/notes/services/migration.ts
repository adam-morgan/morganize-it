import { Observable, of, from, switchMap, map, catchError, concat, toArray } from "rxjs";
import { openDB, deleteDB } from "idb";
import { ApiNotesService } from "./api-notes-service";

export const migrateLocalDataToServer = (userId: string): Observable<void> => {
  const api = new ApiNotesService(userId);

  return from(openDB("morganizeit", 1)).pipe(
    switchMap((db) => {
      return from(db.getAll("notebooks") as Promise<Notebook[]>).pipe(
        switchMap((notebooks) => {
          db.close();

          if (notebooks.length === 0) {
            return from(deleteDB("morganizeit")).pipe(map(() => undefined));
          }

          const uploads$ = notebooks.map((nb) => api.createNotebook(nb.name));
          return concat(...uploads$).pipe(
            toArray(),
            switchMap(() => from(deleteDB("morganizeit"))),
            map(() => undefined)
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
