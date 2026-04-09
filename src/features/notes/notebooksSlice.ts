import { create } from "zustand";
import { useAuthSlice } from "../auth";
import { getNotesService, getSyncManager } from "./services";
import { catchError, map, Observable, of, switchMap, take, tap, throwError } from "rxjs";
import { useNotesSlice } from "./notesSlice";
import { SyncResult } from "./services/sync-manager";

type NotebooksSlice = {
  initialized: boolean;
  notebooks: Notebook[];
  initialize: () => Observable<void>;
  createNotebook: (name: string) => Observable<Notebook>;
  updateNotebook: (id: string, name: string) => Observable<Notebook>;
  deleteNotebook: (id: string) => Observable<void>;
  reset: () => void;
};

const applySyncResult = (result: SyncResult) => {
  useNotebooksSlice.setState({ notebooks: result.notebooks });

  // Update notes slice for any notebookIds currently loaded in state
  const notesState = useNotesSlice.getState();
  const notesByNotebook: Record<string, Note[]> = {};
  for (const note of result.notes) {
    if (!notesByNotebook[note.notebookId]) {
      notesByNotebook[note.notebookId] = [];
    }
    notesByNotebook[note.notebookId].push(note);
  }

  // Update loaded notebook note lists; also update notebooks that are now empty
  const updatedNotes = { ...notesState.notes };
  for (const notebookId of Object.keys(updatedNotes)) {
    if (notesByNotebook[notebookId] != null) {
      updatedNotes[notebookId] = notesByNotebook[notebookId];
    }
  }
  useNotesSlice.setState({ notes: updatedNotes });
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
    const syncManager = getSyncManager(user as User);

    if (!syncManager) {
      // Guest mode — just load from local IDB
      return notesSvc.getNotebooks().pipe(
        take(1),
        tap((notebooks) => set({ notebooks, initialized: true })),
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
            tap((notebooks) => set({ notebooks, initialized: true })),
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

    const previous = get().notebooks;
    set({ notebooks: previous.filter((nb) => nb.id !== id) });

    return notesSvc.deleteNotebook(id).pipe(
      catchError((err) => {
        set({ notebooks: previous });
        return throwError(() => err);
      })
    );
  },
}));
