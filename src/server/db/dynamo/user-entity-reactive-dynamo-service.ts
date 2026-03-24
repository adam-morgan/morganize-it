import { Observable } from "rxjs";
import { ReactiveDynamoService } from "./reactive-dynamo-service";
import { DynamoTableSchema } from "./tables";
import { TableID } from "../reactive-service";

export class UserEntityReactiveDynamoService<
  T extends UserEntity,
> extends ReactiveDynamoService<T> {
  constructor(tableName: string, schema: DynamoTableSchema, idProperty: string = "id") {
    super(tableName, schema, idProperty);
  }

  override find(options?: FindOptions, userId?: string): Observable<PageResult<T>> {
    if (userId) {
      const criteriaWithUser: Criteria = options?.criteria
        ? { $and: [{ userId }, options.criteria] }
        : { userId };

      return super.find({ ...options, criteria: criteriaWithUser });
    }

    return super.find(options);
  }

  protected override buildKey(id: TableID): Record<string, unknown> {
    // For tables with composite keys (userId + id), we need both.
    // However, delete/update by id alone requires a query first to get the full key.
    // The base implementation only has the id; the userId comes from the item itself.
    // This is handled by findById -> update/delete flow in AbstractReactiveService.
    if (this.schema.primaryKey.sort) {
      // Composite key table — can't build key from id alone.
      // The caller should use findById first, which goes through find().
      return { [this.idProperty]: id };
    }
    return super.buildKey(id);
  }
}
