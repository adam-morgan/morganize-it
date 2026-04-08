import { create } from "zustand";
import { apiPost, apiPatch, apiDelete } from "@/utils/fetch";
import { map, Observable, tap } from "rxjs";

type TrashSlice = {
  deletedNotebooks: Notebook[];
  deletedNotes: Note[];
  loaded: boolean;
  loadTrash: () => Observable<void>;
  restoreNote: (id: string) => Observable<void>;
  restoreNotebook: (id: string) => Observable<void>;
  permanentDeleteNote: (id: string) => Observable<void>;
  permanentDeleteNotebook: (id: string) => Observable<void>;
  emptyTrash: () => Observable<void>;
  reset: () => void;
};

export const useTrashSlice = create<TrashSlice>((set, get) => ({
  deletedNotebooks: [],
  deletedNotes: [],
  loaded: false,
  reset: () => set({ deletedNotebooks: [], deletedNotes: [], loaded: false }),

  loadTrash: () => {
    const notebooks$ = apiPost<FindOptions, PageResult<Notebook>>("/notebooks/find", {
      onlySoftDeleted: true,
      sort: [{ property: "updatedAt", direction: "desc" }],
    });

    const notes$ = apiPost<FindOptions, PageResult<Note>>("/notes/find", {
      onlySoftDeleted: true,
      sort: [{ property: "updatedAt", direction: "desc" }],
    });

    return notebooks$.pipe(
      tap((nbResult) => set({ deletedNotebooks: nbResult.items })),
      map(() => undefined),
      tap(() => {
        notes$.subscribe({
          next: (noteResult) => set({ deletedNotes: noteResult.items, loaded: true }),
          error: () => set({ loaded: true }),
        });
      })
    );
  },

  restoreNote: (id: string) => {
    return apiPatch<Partial<Note>, Note>(`/notes/${id}`, { deletedAt: null } as Partial<Note>).pipe(
      tap(() =>
        set((state) => ({
          deletedNotes: state.deletedNotes.filter((n) => n.id !== id),
        }))
      ),
      map(() => undefined)
    );
  },

  restoreNotebook: (id: string) => {
    return apiPatch<Partial<Notebook>, Notebook>(`/notebooks/${id}`, { deletedAt: null } as Partial<Notebook>).pipe(
      tap(() =>
        set((state) => ({
          deletedNotebooks: state.deletedNotebooks.filter((nb) => nb.id !== id),
          // Also restore notes that belonged to this notebook
          deletedNotes: state.deletedNotes.filter((n) => n.notebookId !== id),
        }))
      ),
      map(() => undefined)
    );
  },

  permanentDeleteNote: (id: string) => {
    return apiDelete<void>(`/notes/${id}/permanent`).pipe(
      tap(() =>
        set((state) => ({
          deletedNotes: state.deletedNotes.filter((n) => n.id !== id),
        }))
      )
    );
  },

  permanentDeleteNotebook: (id: string) => {
    return apiDelete<void>(`/notebooks/${id}/permanent`).pipe(
      tap(() =>
        set((state) => ({
          deletedNotebooks: state.deletedNotebooks.filter((nb) => nb.id !== id),
          deletedNotes: state.deletedNotes.filter((n) => n.notebookId !== id),
        }))
      )
    );
  },

  emptyTrash: () => {
    const { deletedNotebooks, deletedNotes } = get();
    const ops: Observable<void>[] = [
      ...deletedNotes.map((n) => apiDelete<void>(`/notes/${n.id}/permanent`)),
      ...deletedNotebooks.map((nb) => apiDelete<void>(`/notebooks/${nb.id}/permanent`)),
    ];

    if (ops.length === 0) {
      set({ deletedNotebooks: [], deletedNotes: [] });
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }

    return new Observable<void>((subscriber) => {
      let completed = 0;
      ops.forEach((op) =>
        op.subscribe({
          complete: () => {
            completed++;
            if (completed === ops.length) {
              set({ deletedNotebooks: [], deletedNotes: [] });
              subscriber.next();
              subscriber.complete();
            }
          },
          error: (err) => subscriber.error(err),
        })
      );
    });
  },
}));
