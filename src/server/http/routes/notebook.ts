import { getNotebookService } from "@/server/features/notes";
import { ReactiveRoutes } from "../reactive-routes";

export class NotebookRoutes extends ReactiveRoutes<Notebook, string> {
  constructor() {
    super(getNotebookService());
  }
}
