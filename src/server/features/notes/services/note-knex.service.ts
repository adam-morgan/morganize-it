import { UserEntityReactiveKnexService } from "@/server/db/sql/user-entity-reactive-knex-service";
import { TableID } from "@/server/db/reactive-service";
import { getKnex } from "@/server/db/sql/knex";
import { from, map, Observable, switchMap, of, throwError } from "rxjs";
import { NotFoundError } from "@/server/errors";

export class NoteKnexService extends UserEntityReactiveKnexService<Note> {
  constructor() {
    super("notes", ["id", "title", "content", "textContent", "tags", "attachments", "notebookId", "userId", "createdAt", "updatedAt", "lastOpenedAt", "deletedAt", "archivedAt"], "id");
  }

  override find(options?: FindOptions, userId?: string): Observable<PageResult<Note>> {
    return super.find(options, userId).pipe(
      map((result) => ({
        ...result,
        items: result.items.map((item) => this.parseJsonFields(item)),
      }))
    );
  }

  override create(data: Note): Observable<Note> {
    return super.create(this.serializeJsonFields(data)).pipe(map((item) => this.parseJsonFields(item)));
  }

  override update(id: TableID, data: Note): Observable<Note> {
    return super.update(id, this.serializeJsonFields(data)).pipe(
      map((item) => this.parseJsonFields(item)),
      switchMap((item) =>
        // Keep note-level share rows' denormalized notebookId in sync if the note was moved.
        from(
          getKnex()
            .update({ notebookId: item.notebookId })
            .from("shares")
            .where({ resourceType: "note", resourceId: id })
        ).pipe(switchMap(() => of(item)))
      )
    );
  }

  override delete(id: TableID): Observable<void> {
    const now = new Date().toISOString();
    return from(
      getKnex()
        .update({ deletedAt: now, archivedAt: null, updatedAt: now })
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
      getKnex().transaction<number>(async (trx) => {
        await trx("shares")
          .where({ resourceType: "note", resourceId: id })
          .delete();
        const count: number = await trx("notes").where({ id }).delete();
        return count;
      })
    ).pipe(
      switchMap((count) =>
        count === 0 ? throwError(() => new NotFoundError("Record not found")) : of(undefined)
      )
    );
  }

  private parseJsonFields(item: Note): Note {
    return {
      ...item,
      tags: typeof item.tags === "string" ? JSON.parse(item.tags as string) : (item.tags ?? []),
      attachments: typeof item.attachments === "string" ? JSON.parse(item.attachments as string) : (item.attachments ?? []),
    };
  }

  private serializeJsonFields(data: Note): Note {
    return {
      ...data,
      tags: JSON.stringify(data.tags ?? []) as unknown as string[],
      attachments: JSON.stringify(data.attachments ?? []) as unknown as Attachment[],
    };
  }
}
