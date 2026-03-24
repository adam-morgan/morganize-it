import { create } from "zustand";
import { useAuthSlice } from "../auth";
import { getNotesService } from "./services";
import { map, Observable, of, take, tap } from "rxjs";

type NotebooksSlice = {
  initialized: boolean;
  notebooks: Notebook[];
  initialize: () => Observable<void>;
  createNotebook: (name: string) => Observable<Notebook>;
  updateNotebook: (id: string, name: string) => Observable<Notebook>;
  deleteNotebook: (id: string) => Observable<void>;
  reset: () => void;
};

export const useNotebooksSlice = create<NotebooksSlice>((set, get) => ({
  initialized: false,
  notebooks: [],
  reset: () => set({ initialized: false, notebooks: [] }),
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
  updateNotebook: (id, name) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc.updateNotebook(id, name).pipe(
      tap((updated) =>
        set((state) => ({
          ...state,
          notebooks: state.notebooks.map((nb) => (nb.id === id ? updated : nb)),
        }))
      )
    );
  },
  deleteNotebook: (id) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc.deleteNotebook(id).pipe(
      tap(() =>
        set((state) => ({
          ...state,
          notebooks: state.notebooks.filter((nb) => nb.id !== id),
        }))
      )
    );
  },
}));
