import { Observable } from "rxjs";

export interface NotesService {
  getNotebooks(): Observable<Notebook[]>;
  createNotebook(name: string): Observable<Notebook>;
  updateNotebook(id: string, name: string): Observable<Notebook>;
  deleteNotebook(id: string): Observable<void>;
  getNotes(notebookId: string): Observable<Note[]>;
  createNote(note: Omit<Note, "id">): Observable<Note>;
  updateNote(id: string, data: Partial<Note>): Observable<Note>;
  deleteNote(id: string): Observable<void>;
}
