import { map, Observable } from "rxjs";
import { apiGet, apiPost } from "@/utils/fetch";
import { NotesService } from "./notes-service";

export class ApiNotesService implements NotesService {
  constructor(private userId: string) {}

  getNotebooks(): Observable<Notebook[]> {
    return apiGet<PageResult<Notebook>>("/notebooks").pipe(map((result) => result.items));
  }

  createNotebook(name: string): Observable<Notebook> {
    return apiPost<Partial<Notebook>, Notebook>("/notebooks", { name, userId: this.userId });
  }
}
