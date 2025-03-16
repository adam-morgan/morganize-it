import { from, map, Observable } from "rxjs";
import { AbstractReactiveService, TableID } from "../reactive-service";
import { getKnex } from "./knex";
import { buildQuery } from "./query-builder";

export class ReactiveKnexService<T, ID extends TableID> extends AbstractReactiveService<T, ID> {
  constructor(
    private table: string,
    private columns: string[],
    protected idProperty: string
  ) {
    super();
  }

  find(options?: FindOptions): Observable<T[]> {
    const query = buildQuery(this.table, options);
    return from(query.select(this.columns).then((rows) => rows as T[]));
  }

  create(data: T): Observable<T> {
    return from(
      getKnex()
        .insert(data)
        .into(this.table)
        .returning(this.columns)
        .then((rows) => rows[0] as T)
    );
  }

  update(id: ID, data: T): Observable<T> {
    return from(
      getKnex()
        .update(data)
        .from(this.table)
        .where({ [this.idProperty]: id })
        .returning(this.columns)
        .then((rows) => rows[0] as T)
    );
  }

  delete(id: ID): Observable<void> {
    return from(
      getKnex()
        .delete()
        .from(this.table)
        .where({ [this.idProperty]: id })
    ).pipe(map(() => undefined));
  }
}
