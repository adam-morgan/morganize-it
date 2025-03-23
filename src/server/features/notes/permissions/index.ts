import { NotebookPermissionResolver } from "./notebook-permission-resolver";

export * from "./notebook-permission-resolver";

let notebookPermissionResolver: NotebookPermissionResolver;

export const getNotebookPermissionResolver = (): NotebookPermissionResolver => {
  if (notebookPermissionResolver == null) {
    notebookPermissionResolver = new NotebookPermissionResolver();
  }

  return notebookPermissionResolver;
};
