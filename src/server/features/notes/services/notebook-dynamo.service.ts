import { UserEntityReactiveDynamoService } from "@/server/db/dynamo/user-entity-reactive-dynamo-service";
import { getDocClient, getTableName } from "@/server/db/dynamo/client";
import { notebooksTableSchema, notesTableSchema } from "@/server/db/dynamo/tables";
import { TableID } from "@/server/db/reactive-service";
import { concat, from, Observable, of, switchMap, toArray } from "rxjs";
import { ReactiveDynamoService } from "@/server/db/dynamo/reactive-dynamo-service";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

export class NotebookDynamoService extends UserEntityReactiveDynamoService<Notebook> {
  constructor() {
    super(getTableName("Notebooks"), notebooksTableSchema, "id");
  }

  protected override buildKey(id: TableID): Record<string, unknown> {
    return { id };
  }

  override create(data: Notebook): Observable<Notebook> {
    const now = new Date().toISOString();
    return super.create({ ...data, updatedAt: now });
  }

  override update(id: TableID, data: Notebook): Observable<Notebook> {
    const now = new Date().toISOString();
    return super.update(id, { ...data, updatedAt: now });
  }

  permanentDelete(id: string): Observable<void> {
    const notesSvc = new ReactiveDynamoService<Note>(
      getTableName("Notes"),
      notesTableSchema,
      "id"
    );
    const notesTableName = getTableName("Notes");

    return this.find({ criteria: { id }, includeSoftDeleted: true }).pipe(
      switchMap((result) => {
        if (result.items.length === 0) return of(undefined);
        const notebook = result.items[0];

        // Delete all notes in this notebook
        return notesSvc.find({ criteria: { notebookId: id } }).pipe(
          switchMap((noteResult) => {
            if (noteResult.items.length === 0) return of(undefined);
            const deletes = noteResult.items.map((note) =>
              from(getDocClient().send(new DeleteCommand({
                TableName: notesTableName,
                Key: { userId: note.userId, id: note.id },
              })).then(() => undefined))
            );
            return concat(...deletes).pipe(
              toArray(),
              switchMap(() => of(undefined))
            );
          }),
          // Delete the notebook itself
          switchMap(() =>
            from(getDocClient().send(new DeleteCommand({
              TableName: this.tableName,
              Key: { userId: notebook.userId, id: notebook.id },
            })).then(() => undefined))
          )
        );
      })
    );
  }

  override delete(id: TableID): Observable<void> {
    const now = new Date().toISOString();

    return this.findById(id).pipe(
      switchMap((notebook) =>
        super.update(id, { ...notebook, deletedAt: now, updatedAt: now })
      ),
      switchMap(() => {
        // Cascade soft-delete to notes in this notebook
        const notesSvc = new ReactiveDynamoService<Note>(
          getTableName("Notes"),
          notesTableSchema,
          "id"
        );
        return notesSvc.find({ criteria: { notebookId: id } }).pipe(
          switchMap((result) => {
            if (result.items.length === 0) return of(undefined);
            const updates = result.items
              .filter((note) => !note.deletedAt)
              .map((note) =>
                notesSvc.update(note.id, { ...note, deletedAt: now, updatedAt: now })
              );
            if (updates.length === 0) return of(undefined);
            return concat(...updates).pipe(
              toArray(),
              switchMap(() => of(undefined))
            );
          })
        );
      }),
      switchMap(() => of(undefined))
    );
  }
}
