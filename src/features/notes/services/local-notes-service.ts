import { Observable, of } from "rxjs";
import { NotesService } from "./notes-service";

export class LocalNotesService implements NotesService {
  public getNotebooks(): Observable<Notebook[]> {
    return of([
      { id: "nb1", name: "Notebook 1" },
      { id: "nb2", name: "Notebook 2" },
      { id: "nb3", name: "Notebook 3" },
    ]);
  }
}
