import { map, Observable } from "rxjs";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/utils/fetch";
import { NotesService } from "./notes-service";

export class ApiNotesService implements NotesService {
  constructor(private userId: string) {}

  getNotebooks(): Observable<Notebook[]> {
    return apiGet<PageResult<Notebook>>("/notebooks").pipe(map((result) => result.items));
  }

  createNotebook(name: string): Observable<Notebook> {
    return apiPost<Partial<Notebook>, Notebook>("/notebooks", { name, userId: this.userId });
  }

  updateNotebook(id: string, name: string): Observable<Notebook> {
    return apiPatch<Partial<Notebook>, Notebook>(`/notebooks/${id}`, { name });
  }

  deleteNotebook(id: string): Observable<void> {
    return apiDelete<void>(`/notebooks/${id}`);
  }

  getNotes(notebookId: string): Observable<Note[]> {
    return apiPost<FindOptions, PageResult<Note>>("/notes/find", {
      criteria: { notebookId },
    }).pipe(map((result) => result.items));
  }

  createNote(note: Omit<Note, "id">): Observable<Note> {
    return apiPost<Omit<Note, "id">, Note>("/notes", note);
  }

  updateNote(id: string, data: Partial<Note>): Observable<Note> {
    return apiPatch<Partial<Note>, Note>(`/notes/${id}`, data);
  }

  deleteNote(id: string): Observable<void> {
    return apiDelete<void>(`/notes/${id}`);
  }
}
