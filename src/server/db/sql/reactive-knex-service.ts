import { from, Observable, of, switchMap, throwError } from "rxjs";
import { AbstractReactiveService, TableID } from "../reactive-service";
import { getKnex } from "./knex";
import { buildQuery } from "./query-builder";

export class ReactiveKnexService<T extends Entity> extends AbstractReactiveService<T> {
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

  update(id: TableID, data: T): Observable<T> {
    return from(
      getKnex()
        .update(data)
        .from(this.table)
        .where({ [this.idProperty]: id })
        .returning(this.columns)
        .then((rows) => rows[0] as T)
    ).pipe(
      switchMap((response) =>
        response == null ? throwError(() => new Error("Record not found")) : of(response)
      )
    );
  }

  delete(id: TableID): Observable<void> {
    return from(
      getKnex()
        .delete()
        .from(this.table)
        .where({ [this.idProperty]: id })
    ).pipe(
      switchMap((count) =>
        count === 0 ? throwError(() => new Error("Record not found")) : of(undefined)
      )
    );
  }
}
