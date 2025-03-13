import { Observable } from "rxjs";

export interface NotesService {
  getNotebooks(): Observable<Notebook[]>;
  createNotebook(name: string): Observable<Notebook>;
}
