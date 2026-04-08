import { create } from "zustand";
import { apiPost } from "@/utils/fetch";
import { from, map, Observable, tap } from "rxjs";
import { openDB } from "idb";
import { useAuthSlice } from "@/features/auth";
import { getCacheDb } from "./services/cache-db";

type RecentNotesSlice = {
  recentNotes: Note[];
  loaded: boolean;
  loadRecentNotes: () => Observable<void>;
  reset: () => void;
};

async function getRecentNotesFromIdb(user: User): Promise<Note[]> {
  const db = (user as GuestUser).isGuest
    ? await openDB("morganizeit", 2)
    : await getCacheDb(user.id);
  const allNotes: Note[] = await db.getAll("notes");
  return allNotes
    .filter((n) => !n.deletedAt)
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

    if ((user as GuestUser).isGuest) {
      return from(getRecentNotesFromIdb(user)).pipe(
        tap((notes) => set({ recentNotes: notes, loaded: true })),
        map(() => undefined),
      );
    }

    return apiPost<FindOptions, PageResult<Note>>("/notes/find", {
      sort: [{ property: "lastOpenedAt", direction: "desc" }],
      limit: 10,
    }).pipe(
      tap((result) => set({ recentNotes: result.items, loaded: true })),
      map(() => undefined),
    );
  },

  reset: () => set({ recentNotes: [], loaded: false }),
}));
