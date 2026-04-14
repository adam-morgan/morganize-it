import { forkJoin, from, map, Observable, of, switchMap } from "rxjs";
import { getDocClient, getTableName } from "@/server/db/dynamo/client";
import { sharesTableSchema } from "@/server/db/dynamo/tables";
import { ReactiveDynamoService } from "@/server/db/dynamo/reactive-dynamo-service";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ShareService } from "./share.service";

export class ShareDynamoService implements ShareService {
  private get tableName() {
    return getTableName("Shares");
  }

  private get baseSvc(): ReactiveDynamoService<Share> {
    return new ReactiveDynamoService<Share>(this.tableName, sharesTableSchema, "id");
  }

  findById(id: string): Observable<Share | undefined> {
    return this.baseSvc.find({ criteria: { id } }).pipe(map((r) => r.items[0]));
  }

  findForResource(
    resourceType: ShareResourceType,
    resourceId: string
  ): Observable<Share[]> {
    return this.baseSvc
      .find({ criteria: { resourceId, resourceType } })
      .pipe(map((r) => r.items));
  }

  findExisting(
    resourceType: ShareResourceType,
    resourceId: string,
    sharedWithUserId: string
  ): Observable<Share | undefined> {
    return this.baseSvc
      .find({ criteria: { resourceId, sharedWithUserId, resourceType } })
      .pipe(map((r) => r.items[0]));
  }

  findSharedWith(
    sharedWithUserId: string,
    resourceType?: ShareResourceType
  ): Observable<Share[]> {
    const criteria: Criteria = resourceType
      ? { sharedWithUserId, resourceType }
      : { sharedWithUserId };
    return this.baseSvc.find({ criteria }).pipe(map((r) => r.items));
  }

  findOwnedBy(ownerId: string): Observable<Share[]> {
    return this.baseSvc
      .find({ criteria: { ownerId } })
      .pipe(map((r) => r.items));
  }

  findOwnedByDirected(ownerId: string, sharedWithUserId: string): Observable<Share[]> {
    return this.baseSvc
      .find({ criteria: { ownerId, sharedWithUserId } })
      .pipe(map((r) => r.items));
  }

  findByResourceIds(
    resourceType: ShareResourceType,
    resourceIds: string[]
  ): Observable<Share[]> {
    if (resourceIds.length === 0) return of([]);
    return forkJoin(
      resourceIds.map((id) => this.findForResource(resourceType, id))
    ).pipe(map((groups) => groups.flat()));
  }

  create(share: Share): Observable<Share> {
    return this.baseSvc.create(share);
  }

  update(id: string, share: Share): Observable<Share> {
    return this.baseSvc.update(id, share);
  }

  delete(id: string): Observable<void> {
    return this.baseSvc.delete(id);
  }

  private deleteByIds(ids: string[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    return forkJoin(
      ids.map((id) =>
        from(
          getDocClient()
            .send(new DeleteCommand({ TableName: this.tableName, Key: { id } }))
            .then(() => undefined)
        )
      )
    ).pipe(switchMap(() => of(undefined)));
  }

  deleteAllForResource(
    resourceType: ShareResourceType,
    resourceId: string
  ): Observable<void> {
    return this.findForResource(resourceType, resourceId).pipe(
      switchMap((items) => this.deleteByIds(items.map((s) => s.id)))
    );
  }

  deleteAllForNotebook(notebookId: string): Observable<void> {
    // Delete notebook-level share for the notebook AND any note-level shares
    // whose parent notebook is this notebook.
    return forkJoin([
      this.findForResource("notebook", notebookId),
      this.baseSvc.find({ criteria: { notebookId, resourceType: "note" } }),
    ]).pipe(
      switchMap(([notebookShares, noteSharesResult]) => {
        const ids = [
          ...notebookShares.map((s) => s.id),
          ...noteSharesResult.items.map((s) => s.id),
        ];
        return this.deleteByIds(ids);
      })
    );
  }
}

