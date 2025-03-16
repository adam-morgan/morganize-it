import { NotebookKnexService, NotebookService } from "./services";
import { getDbInstanceType } from "@/server/db/type";

export * from "./services";

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
