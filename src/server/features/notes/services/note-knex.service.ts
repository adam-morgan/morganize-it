import { UserEntityReactiveKnexService } from "@/server/db/sql/user-entity-reactive-knex-service";

export class NoteKnexService extends UserEntityReactiveKnexService<Note> {
  constructor() {
    super("notes", ["id", "title", "content", "textContent", "notebookId", "userId", "createdAt", "updatedAt", "lastOpenedAt"], "id");
  }
}
