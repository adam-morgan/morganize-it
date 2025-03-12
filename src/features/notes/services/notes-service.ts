import { Observable } from "rxjs";

export interface NotesService {
  getNotebooks(): Observable<Notebook[]>;
}
