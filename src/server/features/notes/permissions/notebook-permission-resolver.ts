import { map, Observable, of, switchMap, throwError } from "rxjs";
import { PermissionResolver } from "@/server/permissions";
import { getShareAccessService } from "@/server/features/shares";
import { NotFoundError } from "@/server/errors";
import { getNotebookService } from "../services";

export class NotebookPermissionResolver implements PermissionResolver<Notebook> {
  canCreate(userId: string, entity: Notebook): Observable<boolean> {
    // Creators can only create their own notebooks.
    return of(entity.userId === userId);
  }

  canUpdate(userId: string, entity: Notebook): Observable<boolean> {
    return getNotebookService()
      .find({ criteria: { id: entity.id } })
      .pipe(
        switchMap((result) =>
          result.items.length === 0
            ? throwError(() => new NotFoundError("Record not found"))
            : getShareAccessService()
                .getNotebookAccess(userId, entity.id)
                .pipe(map((level) => level === "owner" || level === "readwrite"))
        )
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
