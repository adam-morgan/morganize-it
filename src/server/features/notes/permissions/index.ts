import { NotebookPermissionResolver } from "./notebook-permission-resolver";
import { NotePermissionResolver } from "./note-permission-resolver";

export * from "./notebook-permission-resolver";
export * from "./note-permission-resolver";

let notebookPermissionResolver: NotebookPermissionResolver;

export const getNotebookPermissionResolver = (): NotebookPermissionResolver => {
  if (notebookPermissionResolver == null) {
    notebookPermissionResolver = new NotebookPermissionResolver();
  }

  return notebookPermissionResolver;
};

let notePermissionResolver: NotePermissionResolver;

export const getNotePermissionResolver = (): NotePermissionResolver => {
  if (notePermissionResolver == null) {
    notePermissionResolver = new NotePermissionResolver();
  }

  return notePermissionResolver;
};
