import { UserEntityReactiveDynamoService } from "@/server/db/dynamo/user-entity-reactive-dynamo-service";
import { getDocClient, getTableName } from "@/server/db/dynamo/client";
import { notesTableSchema } from "@/server/db/dynamo/tables";
import { TableID } from "@/server/db/reactive-service";
import { from, Observable, of, switchMap } from "rxjs";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

export class NoteDynamoService extends UserEntityReactiveDynamoService<Note> {
  constructor() {
    super(getTableName("Notes"), notesTableSchema, "id");
  }

  protected override buildKey(id: TableID): Record<string, unknown> {
    return { id };
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
        return from(getDocClient().send(command).then(() => undefined));
      })
    );
  }
}
