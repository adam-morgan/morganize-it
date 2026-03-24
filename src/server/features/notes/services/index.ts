import { getDbInstanceType } from "@/server/db/type";
import { NotebookService } from "./notebook.service";
import { NotebookKnexService } from "./notebook-knex.service";
import { NotebookDynamoService } from "./notebook-dynamo.service";
import { NoteService } from "./note.service";
import { NoteKnexService } from "./note-knex.service";
import { NoteDynamoService } from "./note-dynamo.service";

export * from "./notebook.service";
export * from "./notebook-knex.service";
export * from "./note.service";
export * from "./note-knex.service";

let notebookSvc: NotebookService;

export const getNotebookService = (): NotebookService => {
  if (notebookSvc == null) {
    if (getDbInstanceType() === "POSTGRESQL") {
      notebookSvc = new NotebookKnexService();
    } else if (getDbInstanceType() === "DYNAMODB") {
      notebookSvc = new NotebookDynamoService();
    } else {
      throw new Error("Unsupported database type for notebook service");
    }
  }

  return notebookSvc;
};

let noteSvc: NoteService;

export const getNoteService = (): NoteService => {
  if (noteSvc == null) {
    if (getDbInstanceType() === "POSTGRESQL") {
      noteSvc = new NoteKnexService();
    } else if (getDbInstanceType() === "DYNAMODB") {
      noteSvc = new NoteDynamoService();
    } else {
      throw new Error("Unsupported database type for note service");
    }
  }

  return noteSvc;
};
