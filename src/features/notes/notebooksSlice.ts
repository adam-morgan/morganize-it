import { create } from "zustand";
import { useAuthSlice } from "../auth";
import { getNotesService } from "./services";
import { Observable, take, tap } from "rxjs";

type NotebooksSlice = {
  initialized: boolean;
  notebooks: Notebook[];
  initialize: () => void;
  createNotebook: (name: string) => Observable<Notebook>;
};

export const useNotebooksSlice = create<NotebooksSlice>((set, get) => ({
  initialized: false,
  notebooks: [],
  initialize: () => {
    if (get().initialized) {
      return;
    }

    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    notesSvc
      .getNotebooks()
      .pipe(take(1))
      .subscribe((notebooks) => {
        set({ notebooks, initialized: true });
      });
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
