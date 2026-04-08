import { UserEntityReactiveKnexService } from "@/server/db/sql/user-entity-reactive-knex-service";
import { TableID } from "@/server/db/reactive-service";
import { getKnex } from "@/server/db/sql/knex";
import { from, Observable, switchMap, of } from "rxjs";
import { NotFoundError } from "@/server/errors";

export class NotebookKnexService extends UserEntityReactiveKnexService<Notebook> {
  constructor() {
    super("notebooks", ["id", "name", "userId", "updatedAt", "deletedAt"], "id");
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
    return from(
      getKnex().transaction(async (trx) => {
        await trx("notes").where({ notebookId: id }).delete();
        const count = await trx("notebooks").where({ id }).delete();
        if (count === 0) {
          throw new NotFoundError("Record not found");
        }
      })
    ).pipe(switchMap(() => of(undefined)));
  }

  override delete(id: TableID): Observable<void> {
    const now = new Date().toISOString();
    return from(
      getKnex().transaction(async (trx) => {
        const count = await trx("notebooks")
          .where({ id })
          .whereNull("deletedAt")
          .update({ deletedAt: now, updatedAt: now });

        if (count === 0) {
          throw new NotFoundError("Record not found");
        }

        await trx("notes")
          .where({ notebookId: id })
          .whereNull("deletedAt")
          .update({ deletedAt: now, updatedAt: now });
      })
    ).pipe(switchMap(() => of(undefined)));
  }
}
