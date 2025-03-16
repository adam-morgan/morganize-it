import { ReactiveService } from "@/server/db/reactive-service";

export interface NotebookService extends ReactiveService<Notebook, string> {}
