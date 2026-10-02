import { create } from "zustand";
import { from, map, Observable, tap } from "rxjs";
import { useAuthSlice } from "@/features/auth";
import { getAllLocalNotebooks, getAllLocalNotes } from "./services/local-entities";
import { archivedNotebookIdsOf, isNoteArchived } from "./archive-utils";

type RecentNotesSlice = {
  recentNotes: Note[];
  loaded: boolean;
  loadRecentNotes: () => Observable<void>;
  reset: () => void;
};

async function getRecentNotesFromIdb(user: User): Promise<Note[]> {
  const [allNotes, allNotebooks] = await Promise.all([
    getAllLocalNotes(user),
    getAllLocalNotebooks(user),
  ]);

  const archivedNotebookIds = archivedNotebookIdsOf(allNotebooks);

  return allNotes
    .filter((n) => !n.deletedAt && !isNoteArchived(n, archivedNotebookIds))
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
    .slice(0, 10);
}

export const useRecentNotesSlice = create<RecentNotesSlice>((set) => ({
  recentNotes: [],
  loaded: false,

  loadRecentNotes: () => {
    const user = useAuthSlice.getState().user;
    if (!user) {
      set({ recentNotes: [], loaded: true });
      return new Observable<void>((s) => { s.next(); s.complete(); });
    }

    return from(getRecentNotesFromIdb(user)).pipe(
      tap((notes) => set({ recentNotes: notes, loaded: true })),
      map(() => undefined),
    );
  },

  reset: () => set({ recentNotes: [], loaded: false }),
}));
