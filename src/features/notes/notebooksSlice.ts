import { create } from "zustand";
import { useAuthSlice } from "../auth";
import { getNotesService } from "./services";
import { map, Observable, of, take, tap } from "rxjs";

type NotebooksSlice = {
  initialized: boolean;
  notebooks: Notebook[];
  initialize: () => Observable<void>;
  createNotebook: (name: string) => Observable<Notebook>;
};

export const useNotebooksSlice = create<NotebooksSlice>((set, get) => ({
  initialized: false,
  notebooks: [],
  initialize: () => {
    if (get().initialized) {
      return of(undefined);
    }

    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc.getNotebooks().pipe(
      take(1),
      tap((notebooks) => set({ notebooks, initialized: true })),
      map(() => undefined)
    );
  },
  createNotebook: (name) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc
      .createNotebook(name)
      .pipe(
        tap((notebook) => set((state) => ({ ...state, notebooks: [...state.notebooks, notebook] })))
      );
  },
}));
