import { map, Observable, of, switchMap, throwError } from "rxjs";
import { PermissionResolver } from "@/server/permissions";
import { getShareAccessService } from "@/server/features/shares";
import { ConflictError, NotFoundError } from "@/server/errors";
import { getNoteService } from "../services";
import { changesArchivedAt } from "./archive";

export class NotePermissionResolver implements PermissionResolver<Note> {
  canCreate(userId: string, entity: Note): Observable<boolean> {
    // Created note must belong to the requesting user. They must also have
    // notebook-level access (owner or readwrite) to add notes to that notebook.
    if (entity.userId !== userId) return of(false);

    const idAvailable$ = entity.id
      ? getNoteService()
          .find({ criteria: { id: entity.id }, includeSoftDeleted: true })
          .pipe(
            switchMap((result) =>
              result.items.length === 0
                ? of(undefined)
                : throwError(() => new ConflictError("Note already exists"))
            )
          )
      : of(undefined);

    return idAvailable$.pipe(
      switchMap(() => getShareAccessService().getNotebookAccess(userId, entity.notebookId)),
      map((level) => level === "owner" || level === "readwrite")
    );
  }

  canUpdate(userId: string, entity: Note): Observable<boolean> {
    return getNoteService()
      .find({ criteria: { id: entity.id }, includeSoftDeleted: true })
      .pipe(
        switchMap((result) => {
          if (result.items.length === 0) {
            return throwError(() => new NotFoundError("Record not found"));
          }
          const existing = result.items[0];

          if (entity.userId && entity.userId !== existing.userId) return of(false);

          const isMove = entity.notebookId && entity.notebookId !== existing.notebookId;
          return getShareAccessService()
            .getNoteAccess(userId, entity.id, existing.notebookId)
            .pipe(
              map((level) => {
                if (isMove || existing.deletedAt || changesArchivedAt(entity, existing)) {
                  return level === "owner";
                }

                return level === "owner" || level === "readwrite";
              })
            );
        })
      );
  }

  canDelete(userId: string, entityId: string): Observable<boolean> {
    return getNoteService()
      .find({ criteria: { id: entityId } })
      .pipe(
        switchMap((result) =>
          result.items.length === 0
            ? throwError(() => new NotFoundError("Record not found"))
            : getShareAccessService()
                .getNoteAccess(userId, entityId, result.items[0].notebookId)
                .pipe(map((level) => level === "owner"))
        )
      );
  }
}
