import { create } from "zustand";
import { useAuthSlice } from "../auth";
import { getNotesService, getSyncManager } from "./services";
import { map, Observable, of, switchMap, take, tap } from "rxjs";
import { useNotesSlice } from "./notesSlice";
import { useRecentNotesSlice } from "./recentNotesSlice";
import { SyncResult } from "./services/sync-manager";

type NotebooksSlice = {
  initialized: boolean;
  notebooks: SyncNotebook[];
  initialize: () => Observable<void>;
  resync: () => Observable<void>;
  fullResync: () => Observable<void>;
  createNotebook: (name: string) => Observable<Notebook>;
  updateNotebook: (id: string, name: string) => Observable<Notebook>;
  setNotebookArchived: (id: string, archived: boolean) => Observable<Notebook>;
  deleteNotebook: (id: string) => Observable<void>;
  reset: () => void;
};

const groupByNotebook = (notes: SyncNote[]): Record<string, SyncNote[]> => {
  const notesByNotebook: Record<string, SyncNote[]> = {};

  for (const note of notes) {
    (notesByNotebook[note.notebookId] ??= []).push(note);
  }

  return notesByNotebook;
};

const replaceWithSyncResult = (result: SyncResult) => {
  useNotebooksSlice.setState({ notebooks: result.notebooks });
  useNotesSlice.setState({ notes: groupByNotebook(result.notes) });
  useRecentNotesSlice.getState().reset();
};

const applySyncResult = (result: SyncResult) => {
  useNotebooksSlice.setState({ notebooks: result.notebooks });

  // Group notes by notebookId
  const notesByNotebook: Record<string, SyncNote[]> = {};
  for (const note of result.notes) {
    (notesByNotebook[note.notebookId] ??= []).push(note);
  }

  // Merge into notesSlice: update loaded notebooks, preserve unloaded ones
  const prev = useNotesSlice.getState().notes;
  const updatedNotes = { ...prev };
  for (const [notebookId, nts] of Object.entries(notesByNotebook)) {
    updatedNotes[notebookId] = nts;
  }
  useNotesSlice.setState({ notes: updatedNotes });
  useRecentNotesSlice.getState().reset();
};

export const useNotebooksSlice = create<NotebooksSlice>((set, get) => ({
  initialized: false,
  notebooks: [],
  reset: () => set({ initialized: false, notebooks: [] }),
  resync: () => {
    const user = useAuthSlice.getState().user;
    if (!user || (user as GuestUser).isGuest) {
      return of(undefined);
    }

    const syncManager = getSyncManager(user as User);
    if (!syncManager) {
      return of(undefined);
    }

    return syncManager.sync().pipe(
      take(1),
      tap((result) => {
        applySyncResult(result);

        if (!get().initialized) set({ initialized: true });
      }),
      map(() => undefined)
    );
  },
  fullResync: () => {
    const user = useAuthSlice.getState().user;
    const syncManager = user && !(user as GuestUser).isGuest ? getSyncManager(user as User) : null;

    if (!syncManager) {
      return of(undefined);
    }

    return syncManager.fullResync().pipe(
      take(1),
      tap((result) => {
        replaceWithSyncResult(result);
        set({ initialized: true });
      }),
      map(() => undefined)
    );
  },
  initialize: () => {
    if (get().initialized) {
      return of(undefined);
    }

    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);
    const syncManager = getSyncManager(user as User);

    if (!syncManager) {
      // Guest mode — just load from local IDB
      return notesSvc.getNotebooks().pipe(
        take(1),
        tap((notebooks) =>
          set({
            notebooks: notebooks.map((nb) => ({ ...nb, accessLevel: "owner" as ShareAccessLevel })),
            initialized: true,
          })
        ),
        map(() => undefined)
      );
    }

    // Authenticated: check for cache, then sync
    return syncManager.hasCache().pipe(
      take(1),
      switchMap((hasCache) => {
        if (hasCache) {
          // Load from IDB immediately, then sync in background
          return notesSvc.getNotebooks().pipe(
            take(1),
            tap((notebooks) =>
              set({
                notebooks: notebooks as SyncNotebook[],
                initialized: true,
              })
            ),
            tap(() => {
              // Background sync — fire and forget
              syncManager
                .sync()
                .pipe(take(1))
                .subscribe({
                  next: (result) => applySyncResult(result),
                  error: (err) => console.warn("Background sync failed:", err),
                });
            }),
            map(() => undefined)
          );
        } else {
          // Cold start — full sync with loading indicator
          return syncManager.sync().pipe(
            take(1),
            tap((result) => {
              applySyncResult(result);
              set({ initialized: true });
            }),
            map(() => undefined)
          );
        }
      })
    );
  },
  createNotebook: (name) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc
      .createNotebook(name)
      .pipe(
        tap((notebook) =>
          set((state) => ({
            ...state,
            notebooks: [...state.notebooks, { ...notebook, accessLevel: "owner" as ShareAccessLevel }],
          }))
        )
      );
  },
  updateNotebook: (id, name) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc.updateNotebook(id, name).pipe(
      tap((updated) =>
        set((state) => ({
          ...state,
          notebooks: state.notebooks.map((nb) =>
            nb.id === id ? { ...nb, ...updated } : nb
          ),
        }))
      )
    );
  },
  setNotebookArchived: (id, archived) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);
    const archivedAt = archived ? new Date().toISOString() : null;

    return notesSvc.setNotebookArchived(id, archivedAt).pipe(
      tap((updated) => {
        set((state) => ({
          notebooks: state.notebooks.map((nb) => (nb.id === id ? { ...nb, ...updated, archivedAt } : nb)),
        }));

        useRecentNotesSlice.getState().reset();
      })
    );
  },
  deleteNotebook: (id) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc.deleteNotebook(id).pipe(
      tap(() =>
        set((state) => ({
          notebooks: state.notebooks.filter((nb) => nb.id !== id),
        }))
      )
    );
  },
}));
