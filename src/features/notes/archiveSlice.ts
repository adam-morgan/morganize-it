import { create } from "zustand";
import { from, map, Observable, of, tap } from "rxjs";
import { useAuthSlice } from "@/features/auth";
import { getAllLocalNotes } from "./services/local-entities";

type ArchiveSlice = {
  archivedNotes: SyncNote[];
  loaded: boolean;
  loadArchivedNotes: () => Observable<void>;
  reset: () => void;
};

export const useArchiveSlice = create<ArchiveSlice>((set) => ({
  archivedNotes: [],
  loaded: false,

  loadArchivedNotes: () => {
    const user = useAuthSlice.getState().user;

    if (!user) {
      set({ archivedNotes: [], loaded: true });
      return of(undefined);
    }

    return from(getAllLocalNotes(user)).pipe(
      map((notes) => notes.filter((n) => n.archivedAt && !n.deletedAt)),
      tap((archivedNotes) => set({ archivedNotes, loaded: true })),
      map(() => undefined)
    );
  },

  reset: () => set({ archivedNotes: [], loaded: false }),
}));
