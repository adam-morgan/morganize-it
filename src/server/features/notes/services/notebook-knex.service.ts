import { ReactiveKnexService } from "@/server/db/sql";

export class NotebookKnexService extends ReactiveKnexService<Notebook, string> {
  constructor() {
    super("notebooks", ["id", "name", "userId"], "id");
  }
}
