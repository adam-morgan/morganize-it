import { from, Observable, of, switchMap, throwError } from "rxjs";
import { getKnex } from "@/server/db/sql/knex";
import { NotFoundError } from "@/server/errors";
import { ShareService } from "./share.service";

const shareColumns = [
  "id",
  "resourceType",
  "resourceId",
  "ownerId",
  "sharedWithUserId",
  "permission",
  "notebookId",
  "createdAt",
  "updatedAt",
];

export class ShareKnexService implements ShareService {
  findById(id: string): Observable<Share | undefined> {
    return from(
      getKnex()
        .select(shareColumns)
        .from<Share>("shares")
        .where({ id })
        .first()
    ) as Observable<Share | undefined>;
  }

  findForResource(
    resourceType: ShareResourceType,
    resourceId: string
  ): Observable<Share[]> {
    return from(
      getKnex()
        .select(shareColumns)
        .from<Share>("shares")
        .where({ resourceType, resourceId })
    ) as Observable<Share[]>;
  }

  findExisting(
    resourceType: ShareResourceType,
    resourceId: string,
    sharedWithUserId: string
  ): Observable<Share | undefined> {
    return from(
      getKnex()
        .select(shareColumns)
        .from<Share>("shares")
        .where({ resourceType, resourceId, sharedWithUserId })
        .first()
    ) as Observable<Share | undefined>;
  }

  findSharedWith(
    sharedWithUserId: string,
    resourceType?: ShareResourceType
  ): Observable<Share[]> {
    const query = getKnex()
      .select(shareColumns)
      .from<Share>("shares")
      .where({ sharedWithUserId });
    if (resourceType) query.andWhere({ resourceType });
    return from(query) as Observable<Share[]>;
  }

  findOwnedBy(ownerId: string): Observable<Share[]> {
    return from(
      getKnex()
        .select(shareColumns)
        .from<Share>("shares")
        .where({ ownerId })
    ) as Observable<Share[]>;
  }

  findOwnedByDirected(ownerId: string, sharedWithUserId: string): Observable<Share[]> {
    return from(
      getKnex()
        .select(shareColumns)
        .from<Share>("shares")
        .where({ ownerId, sharedWithUserId })
    ) as Observable<Share[]>;
  }

  findByResourceIds(
    resourceType: ShareResourceType,
    resourceIds: string[]
  ): Observable<Share[]> {
    if (resourceIds.length === 0) return of([]);
    return from(
      getKnex()
        .select(shareColumns)
        .from<Share>("shares")
        .where({ resourceType })
        .whereIn("resourceId", resourceIds)
    ) as Observable<Share[]>;
  }

  create(share: Share): Observable<Share> {
    return from(
      getKnex()
        .insert(share)
        .into("shares")
        .returning(shareColumns)
        .then((rows) => rows[0] as Share)
    );
  }

  update(id: string, share: Share): Observable<Share> {
    return from(
      getKnex()
        .update(share)
        .from("shares")
        .where({ id })
        .returning(shareColumns)
        .then((rows) => rows[0] as Share | undefined)
    ).pipe(
      switchMap((row) =>
        row == null ? throwError(() => new NotFoundError("Share not found")) : of(row)
      )
    );
  }

  delete(id: string): Observable<void> {
    return from(getKnex().delete().from("shares").where({ id })).pipe(
      switchMap((count) =>
        count === 0
          ? throwError(() => new NotFoundError("Share not found"))
          : of(undefined)
      )
    );
  }

  deleteAllForResource(
    resourceType: ShareResourceType,
    resourceId: string
  ): Observable<void> {
    return from(
      getKnex().delete().from("shares").where({ resourceType, resourceId })
    ).pipe(switchMap(() => of(undefined)));
  }

  deleteAllForNotebook(notebookId: string): Observable<void> {
    return from(
      getKnex()
        .delete()
        .from("shares")
        .where(function () {
          this.where({ resourceType: "notebook", resourceId: notebookId }).orWhere({
            notebookId,
          });
        })
    ).pipe(switchMap(() => of(undefined)));
  }
}
