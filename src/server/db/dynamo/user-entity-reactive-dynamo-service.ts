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
    const filters: Criteria[] = [];

    if (userId) {
      filters.push({ userId });
    }

    if (options?.onlySoftDeleted) {
      filters.push({ $not: { deletedAt: null } });
    } else if (!options?.includeSoftDeleted) {
      filters.push({ deletedAt: null });
    }

    if (options?.criteria) {
      filters.push(options.criteria);
    }

    const mergedCriteria: Criteria | undefined =
      filters.length > 1 ? { $and: filters } : filters[0];

    return super.find({ ...options, criteria: mergedCriteria });
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
