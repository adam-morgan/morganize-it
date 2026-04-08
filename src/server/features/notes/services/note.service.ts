import { ReactiveService } from "@/server/db/reactive-service";
import { Observable } from "rxjs";

export interface NoteService extends ReactiveService<Note> {
  permanentDelete(id: string): Observable<void>;
}
