import { getNotebookService } from "@/server/features/notes";
import { ReactiveRoutes } from "../reactive-routes";

export class NotebookRoutes extends ReactiveRoutes<Notebook> {
  constructor() {
    super(getNotebookService());
  }
}
