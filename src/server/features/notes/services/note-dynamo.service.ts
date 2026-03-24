import { UserEntityReactiveDynamoService } from "@/server/db/dynamo/user-entity-reactive-dynamo-service";
import { getTableName } from "@/server/db/dynamo/client";
import { notesTableSchema } from "@/server/db/dynamo/tables";
import { TableID } from "@/server/db/reactive-service";

export class NoteDynamoService extends UserEntityReactiveDynamoService<Note> {
  constructor() {
    super(getTableName("Notes"), notesTableSchema, "id");
  }

  protected override buildKey(id: TableID): Record<string, unknown> {
    return { id };
  }
}
