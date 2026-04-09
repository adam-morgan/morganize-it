import { create } from "zustand";
import { useAuthSlice } from "../auth";
import { getNotesService } from "./services";
import { Observable, take, tap } from "rxjs";

export type NoteSortOption = "lastOpenedAt" | "updatedAt" | "createdAt" | "titleAsc" | "titleDesc";

type NotesSlice = {
  notes: Record<string, Note[]>;
  expandedNotebookId: string | null;
  sortBy: NoteSortOption;
  loadNotes: (notebookId: string) => Observable<Note[]>;
  expandNotebook: (id: string | null) => void;
  createNote: (notebookId: string, title: string) => Observable<Note>;
  updateNote: (id: string, notebookId: string, data: Partial<Note>) => Observable<Note>;
  markNoteOpened: (id: string, notebookId: string) => Observable<Note>;
  deleteNote: (id: string, notebookId: string) => Observable<void>;
  setSortBy: (option: NoteSortOption) => void;
  getSortedNotes: (notebookId: string) => Note[];
  reset: () => void;
};

const validSortOptions: NoteSortOption[] = ["lastOpenedAt", "updatedAt", "createdAt", "titleAsc", "titleDesc"];

const getStoredSortBy = (): NoteSortOption => {
  const stored = localStorage.getItem("noteSortBy");
  return validSortOptions.includes(stored as NoteSortOption) ? (stored as NoteSortOption) : "lastOpenedAt";
};

const sortNotes = (notes: Note[], sortBy: NoteSortOption): Note[] => {
  const sorted = [...notes];
  switch (sortBy) {
    case "lastOpenedAt":
      return sorted.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
    case "updatedAt":
      return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case "createdAt":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "titleAsc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "titleDesc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    default:
      return sorted;
  }
};

export const useNotesSlice = create<NotesSlice>((set, get) => ({
  notes: {},
  expandedNotebookId: null,
  sortBy: getStoredSortBy(),
  loadNotes: (notebookId) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc.getNotes(notebookId).pipe(
      take(1),
      tap((notes) =>
        set((state) => ({
          ...state,
          notes: { ...state.notes, [notebookId]: notes },
        }))
      )
    );
  },
  expandNotebook: (id) => set({ expandedNotebookId: id }),
  createNote: (notebookId, title) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);
    const now = new Date().toISOString();

    return notesSvc
      .createNote({
        title,
        content: "",
        textContent: "",
        tags: [],
        notebookId,
        userId: user!.id,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      })
      .pipe(
        tap((note) =>
          set((state) => ({
            ...state,
            notes: {
              ...state.notes,
              [notebookId]: [...(state.notes[notebookId] ?? []), note],
            },
          }))
        )
      );
  },
  updateNote: (id, notebookId, data) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc.updateNote(id, { ...data, updatedAt: new Date().toISOString() }).pipe(
      tap((updated) => {
        set((state) => {
          const newNotes = { ...state.notes };

          // If notebookId changed, move between lists
          if (data.notebookId && data.notebookId !== notebookId) {
            newNotes[notebookId] = (newNotes[notebookId] ?? []).filter((n) => n.id !== id);
            newNotes[data.notebookId] = [...(newNotes[data.notebookId] ?? []), updated];
          } else {
            newNotes[notebookId] = (newNotes[notebookId] ?? []).map((n) =>
              n.id === id ? updated : n
            );
          }

          return { ...state, notes: newNotes };
        });
      })
    );
  },
  markNoteOpened: (id, notebookId) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);
    const now = new Date().toISOString();

    return notesSvc.updateNote(id, { lastOpenedAt: now }).pipe(
      tap((updated) =>
        set((state) => ({
          ...state,
          notes: {
            ...state.notes,
            [notebookId]: (state.notes[notebookId] ?? []).map((n) =>
              n.id === id ? updated : n
            ),
          },
        }))
      )
    );
  },
  deleteNote: (id, notebookId) => {
    const user = useAuthSlice.getState().user;
    const notesSvc = getNotesService(user as User);

    return notesSvc.deleteNote(id).pipe(
      tap(() =>
        set((state) => ({
          ...state,
          notes: {
            ...state.notes,
            [notebookId]: (state.notes[notebookId] ?? []).filter((n) => n.id !== id),
          },
        }))
      )
    );
  },
  setSortBy: (option) => {
    localStorage.setItem("noteSortBy", option);
    set({ sortBy: option });
  },
  getSortedNotes: (notebookId) => {
    const state = get();
    return sortNotes(state.notes[notebookId] ?? [], state.sortBy);
  },
  reset: () =>
    set({
      notes: {},
      expandedNotebookId: null,
      sortBy: "lastOpenedAt",
    }),
}));
