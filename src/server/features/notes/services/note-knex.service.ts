import { UserEntityReactiveKnexService } from "@/server/db/sql/user-entity-reactive-knex-service";
import { TableID } from "@/server/db/reactive-service";
import { getKnex } from "@/server/db/sql/knex";
import { from, map, Observable, switchMap, of, throwError } from "rxjs";
import { NotFoundError } from "@/server/errors";

export class NoteKnexService extends UserEntityReactiveKnexService<Note> {
  constructor() {
    super("notes", ["id", "title", "content", "textContent", "tags", "notebookId", "userId", "createdAt", "updatedAt", "lastOpenedAt", "deletedAt"], "id");
  }

  override find(options?: FindOptions, userId?: string): Observable<PageResult<Note>> {
    return super.find(options, userId).pipe(
      map((result) => ({
        ...result,
        items: result.items.map((item) => this.parseTags(item)),
      }))
    );
  }

  override create(data: Note): Observable<Note> {
    return super.create(this.serializeTags(data)).pipe(map((item) => this.parseTags(item)));
  }

  override update(id: TableID, data: Note): Observable<Note> {
    return super.update(id, this.serializeTags(data)).pipe(map((item) => this.parseTags(item)));
  }

  override delete(id: TableID): Observable<void> {
    const now = new Date().toISOString();
    return from(
      getKnex()
        .update({ deletedAt: now, updatedAt: now })
        .from("notes")
        .where({ id })
        .whereNull("deletedAt")
    ).pipe(
      switchMap((count) =>
        count === 0 ? throwError(() => new NotFoundError("Record not found")) : of(undefined)
      )
    );
  }

  permanentDelete(id: string): Observable<void> {
    return from(
      getKnex().delete().from("notes").where({ id })
    ).pipe(
      switchMap((count) =>
        count === 0 ? throwError(() => new NotFoundError("Record not found")) : of(undefined)
      )
    );
  }

  private parseTags(item: Note): Note {
    return { ...item, tags: typeof item.tags === "string" ? JSON.parse(item.tags as string) : (item.tags ?? []) };
  }

  private serializeTags(data: Note): Note {
    return { ...data, tags: JSON.stringify(data.tags ?? []) as unknown as string[] };
  }
}
