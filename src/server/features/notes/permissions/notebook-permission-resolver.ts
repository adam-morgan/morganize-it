import { map, Observable, of, switchMap, throwError } from "rxjs";
import { PermissionResolver } from "@/server/permissions";
import { getShareAccessService } from "@/server/features/shares";
import { ConflictError, NotFoundError } from "@/server/errors";
import { getNotebookService } from "../services";
import { changesArchivedAt } from "./archive";

export class NotebookPermissionResolver implements PermissionResolver<Notebook> {
  canCreate(userId: string, entity: Notebook): Observable<boolean> {
    if (entity.userId !== userId) return of(false);

    if (!entity.id) return of(true);

    return getNotebookService()
      .find({ criteria: { id: entity.id }, includeSoftDeleted: true })
      .pipe(
        switchMap((result) =>
          result.items.length === 0
            ? of(true)
            : throwError(() => new ConflictError("Notebook already exists"))
        )
      );
  }

  canUpdate(userId: string, entity: Notebook): Observable<boolean> {
    return getNotebookService()
      .find({ criteria: { id: entity.id }, includeSoftDeleted: true })
      .pipe(
        switchMap((result) => {
          if (result.items.length === 0) {
            return throwError(() => new NotFoundError("Record not found"));
          }

          const existing = result.items[0];

          if (entity.userId && entity.userId !== existing.userId) return of(false);

          const ownerOnly = !!existing.deletedAt || changesArchivedAt(entity, existing);

          return getShareAccessService()
            .getNotebookAccess(userId, entity.id)
            .pipe(
              map((level) => (ownerOnly ? level === "owner" : level === "owner" || level === "readwrite"))
            );
        })
      );
  }

  canDelete(userId: string, entityId: string): Observable<boolean> {
    return getNotebookService()
      .find({ criteria: { id: entityId } })
      .pipe(
        switchMap((result) =>
          result.items.length === 0
            ? throwError(() => new NotFoundError("Record not found"))
            : getShareAccessService()
                .getNotebookAccess(userId, entityId)
                .pipe(map((level) => level === "owner"))
        )
      );
  }
}
