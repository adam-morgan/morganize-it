import { ReactiveService } from "@/server/db/reactive-service";
import { Observable } from "rxjs";

export interface NotebookService extends ReactiveService<Notebook> {
  permanentDelete(id: string): Observable<void>;
}
