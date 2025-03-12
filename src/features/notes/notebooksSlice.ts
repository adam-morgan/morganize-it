import { create } from "zustand";
import { useAuthSlice } from "../auth";
import { getNotesService } from "./services";
import { take } from "rxjs";

type NotebooksSlice = {
  initialized: boolean;
  notebooks: Notebook[];
  initialize: () => void;
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
}));
