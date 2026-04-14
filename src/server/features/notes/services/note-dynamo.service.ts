import { UserEntityReactiveDynamoService } from "@/server/db/dynamo/user-entity-reactive-dynamo-service";
import { getDocClient, getTableName } from "@/server/db/dynamo/client";
import { notesTableSchema } from "@/server/db/dynamo/tables";
import { TableID } from "@/server/db/reactive-service";
import { forkJoin, from, Observable, of, switchMap } from "rxjs";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { getShareService } from "@/server/features/shares";

export class NoteDynamoService extends UserEntityReactiveDynamoService<Note> {
  constructor() {
    super(getTableName("Notes"), notesTableSchema, "id");
  }

  protected override buildKey(id: TableID): Record<string, unknown> {
    return { id };
  }

  override update(id: TableID, data: Note): Observable<Note> {
    return super.update(id, data).pipe(
      switchMap((updated) =>
        // Keep note-level share rows' denormalized notebookId in sync if the note was moved.
        getShareService()
          .findForResource("note", id)
          .pipe(
            switchMap((shares) => {
              const stale = shares.filter((s) => s.notebookId !== updated.notebookId);
              if (stale.length === 0) return of(updated);
              return forkJoin(
                stale.map((s) =>
                  getShareService().update(s.id, { ...s, notebookId: updated.notebookId })
                )
              ).pipe(switchMap(() => of(updated)));
            })
          )
      )
    );
  }

  override delete(id: TableID): Observable<void> {
    const now = new Date().toISOString();
    return this.findById(id).pipe(
      switchMap((note) => super.update(id, { ...note, deletedAt: now, updatedAt: now })),
      switchMap(() => of(undefined))
    );
  }

  permanentDelete(id: string): Observable<void> {
    return this.find({ criteria: { id }, includeSoftDeleted: true }).pipe(
      switchMap((result) => {
        if (result.items.length === 0) return of(undefined);
        const note = result.items[0];
        const command = new DeleteCommand({
          TableName: this.tableName,
          Key: { userId: note.userId, id: note.id },
        });
        return from(getDocClient().send(command).then(() => undefined)).pipe(
          switchMap(() => getShareService().deleteAllForResource("note", id))
        );
      })
    );
  }
}
