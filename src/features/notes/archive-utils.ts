import { useMemo } from "react";
import { useNotebooksSlice } from "./notebooksSlice";

export const archivedNotebookIdsOf = (notebooks: Notebook[]): Set<string> =>
  new Set(notebooks.filter((nb) => nb.archivedAt && !nb.deletedAt).map((nb) => nb.id));

export const isNoteArchived = (note: Note, archivedNotebookIds: Set<string>): boolean =>
  !!note.archivedAt || archivedNotebookIds.has(note.notebookId);

export const useArchivedNotebookIds = (): Set<string> => {
  const notebooks = useNotebooksSlice((s) => s.notebooks);

  return useMemo(() => archivedNotebookIdsOf(notebooks), [notebooks]);
};
