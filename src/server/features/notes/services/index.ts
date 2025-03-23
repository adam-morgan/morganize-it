import { getDbInstanceType } from "@/server/db/type";
import { NotebookService } from "./notebook.service";
import { NotebookKnexService } from "./notebook-knex.service";

export * from "./notebook.service";
export * from "./notebook-knex.service";

let notebookSvc: NotebookService;

export const getNotebookService = (): NotebookService => {
  if (notebookSvc == null) {
    if (getDbInstanceType() === "POSTGRESQL") {
      notebookSvc = new NotebookKnexService();
    } else {
      throw new Error("Unsupported database type for notebook service");
    }
  }

  return notebookSvc;
};
