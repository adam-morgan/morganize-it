import { getNotebookPermissionResolver, getNotebookService } from "@/server/features/notes";
import { AuthenticatedReactiveRoutes } from "../authenticated-reactive-routes";

export class NotebookRoutes extends AuthenticatedReactiveRoutes<Notebook> {
  constructor() {
    super(getNotebookService(), getNotebookPermissionResolver());
  }
}
