import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Observable } from "rxjs";
import { useAuthSlice } from "@/features/auth";
import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import { useNotebooksSlice } from "../notebooksSlice";
import { useNotesSlice } from "../notesSlice";
import { useArchiveSlice } from "../archiveSlice";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import StashView, { formatStashDate } from "./stash/StashView";
import { StashAction } from "./stash/StashItemRow";

type DeleteTarget =
  | { type: "notebook"; notebook: SyncNotebook }
  | { type: "note"; note: SyncNote };

const ArchiveView = () => {
  const navigate = useNavigate();
  const myUserId = useAuthSlice((s) => s.user?.id);
  const { notebooks, setNotebookArchived, deleteNotebook } = useNotebooksSlice();
  const { setNoteArchived, deleteNote } = useNotesSlice();
  const { archivedNotes, loaded, loadArchivedNotes } = useArchiveSlice();
  const reactiveQuery = useReactiveQueryWithMask();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    loadArchivedNotes().subscribe({ error: () => {} });
  }, [notebooks]);

  const archivedNotebooks = notebooks.filter((nb) => nb.archivedAt);
  const archivedNotebookIds = new Set(archivedNotebooks.map((nb) => nb.id));
  const notebookNameById = new Map(notebooks.map((nb) => [nb.id, nb.name]));
  const looseArchivedNotes = archivedNotes.filter((n) => !archivedNotebookIds.has(n.notebookId));

  const run = (action: () => Observable<unknown>, label: string) =>
    reactiveQuery(action, label, () => {
      loadArchivedNotes().subscribe({ error: () => {} });
    });

  const handleDelete = () => {
    if (!deleteTarget) return;

    const target = deleteTarget;

    setDeleteTarget(null);

    if (target.type === "notebook") {
      run(() => deleteNotebook(target.notebook.id), "Deleting notebook...");
    } else {
      run(() => deleteNote(target.note.id, target.note.notebookId), "Deleting note...");
    }
  };

  const notebookActions = (nb: SyncNotebook): StashAction[] =>
    nb.accessLevel !== "owner"
      ? []
      : [
          {
            title: "Unarchive",
            icon: ArchiveRestore,
            onClick: () => run(() => setNotebookArchived(nb.id, false), "Unarchiving notebook..."),
          },
          {
            title: "Delete",
            icon: Trash2,
            destructive: true,
            onClick: () => setDeleteTarget({ type: "notebook", notebook: nb }),
          },
        ];

  const noteActions = (note: SyncNote): StashAction[] =>
    note.userId !== myUserId
      ? []
      : [
          {
            title: "Unarchive",
            icon: ArchiveRestore,
            onClick: () => run(() => setNoteArchived(note.id, note.notebookId, false), "Unarchiving note..."),
          },
          {
            title: "Delete",
            icon: Trash2,
            destructive: true,
            onClick: () => setDeleteTarget({ type: "note", note }),
          },
        ];

  if (!loaded) return null;

  const deleteName = deleteTarget?.type === "notebook" ? deleteTarget.notebook.name : deleteTarget?.note.title;

  return (
    <>
      <StashView
        notebooks={archivedNotebooks}
        notes={looseArchivedNotes}
        emptyIcon={Archive}
        emptyMessage="Nothing archived"
        searchPlaceholder="Search archived..."
        notebookSubtitle={(nb) => `Archived ${formatStashDate(nb.archivedAt)}`}
        noteSubtitle={(note) => {
          const notebookName = notebookNameById.get(note.notebookId) ?? note.parentNotebookName;

          return `Archived ${formatStashDate(note.archivedAt)}${notebookName ? ` · ${notebookName}` : ""}`;
        }}
        notebookActions={notebookActions}
        noteActions={noteActions}
        onOpenNotebook={(nb) => navigate(`/notebooks/${nb.id}`)}
        onOpenNote={(note) => navigate(`/notebooks/${note.notebookId}/notes/${note.id}`)}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.type === "notebook" ? "Delete Notebook" : "Delete Note"}
        message={
          deleteTarget?.type === "notebook"
            ? `Are you sure you want to delete "${deleteName}"? All notes in this notebook will also be deleted. You can restore them from Trash.`
            : `Are you sure you want to delete "${deleteName}"? You can restore it from Trash.`
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default ArchiveView;
