import { UserEntityReactiveKnexService } from "@/server/db/sql/user-entity-reactive-knex-service";

export class NotebookKnexService extends UserEntityReactiveKnexService<Notebook> {
  constructor() {
    super("notebooks", ["id", "name", "userId"], "id");
  }
}
