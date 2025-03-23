import { from, Observable } from "rxjs";
import { ReactiveKnexService } from "./reactive-knex-service";
import { buildQuery } from "./query-builder";
import { Knex } from "knex";

export class UserEntityReactiveKnexService<T extends UserEntity> extends ReactiveKnexService<T> {
  constructor(table: string, columns: string[], idProperty: string) {
    super(table, columns, idProperty);
  }

  override find(options?: FindOptions, userId?: string): Observable<T[]> {
    const query = buildQuery(this.table, options, this.applyUserIdCriteria(userId));
    return from(query.select(this.columns).then((rows) => rows as T[]));
  }

  private applyUserIdCriteria(userId?: string): (query: Knex.QueryBuilder) => void {
    if (userId) {
      return (query) => query.where({ userId });
    }

    return () => undefined;
  }
}
