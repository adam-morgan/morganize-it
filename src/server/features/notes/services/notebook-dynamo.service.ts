import { UserEntityReactiveDynamoService } from "@/server/db/dynamo/user-entity-reactive-dynamo-service";
import { getTableName } from "@/server/db/dynamo/client";
import { notebooksTableSchema } from "@/server/db/dynamo/tables";
import { TableID } from "@/server/db/reactive-service";

export class NotebookDynamoService extends UserEntityReactiveDynamoService<Notebook> {
  constructor() {
    super(getTableName("Notebooks"), notebooksTableSchema, "id");
  }

  protected override buildKey(id: TableID): Record<string, unknown> {
    // Notebooks table has composite key (userId + id).
    // For delete/update by id, we need userId too.
    // This is resolved by the AbstractReactiveService.patch/findById flow
    // which fetches the full item first.
    return { id };
  }
}
