import { useEffect } from "react";
import { Trash2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrashSlice } from "../trashSlice";
import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { useState } from "react";

const TrashView = () => {
  const {
    deletedNotebooks,
    deletedNotes,
    loaded,
    loadTrash,
    restoreNote,
    restoreNotebook,
    permanentDeleteNote,
    permanentDeleteNotebook,
    emptyTrash,
  } = useTrashSlice();
  const reactiveQuery = useReactiveQueryWithMask();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "note" | "notebook"; id: string; name: string } | null>(null);

  useEffect(() => {
    reactiveQuery(() => loadTrash(), "Loading trash...", () => {});
  }, []);

  const handleRestore = (type: "note" | "notebook", id: string) => {
    const label = type === "note" ? "Restoring note..." : "Restoring notebook...";
    reactiveQuery(
      () => (type === "note" ? restoreNote(id) : restoreNotebook(id)),
      label,
      () => {}
    );
  };

  const handlePermanentDelete = () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    setDeleteTarget(null);
    reactiveQuery(
      () => (type === "note" ? permanentDeleteNote(id) : permanentDeleteNotebook(id)),
      "Deleting permanently...",
      () => {}
    );
  };

  const handleEmptyTrash = () => {
    setConfirmEmpty(false);
    reactiveQuery(() => emptyTrash(), "Emptying trash...", () => {});
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const hasItems = deletedNotebooks.length > 0 || deletedNotes.length > 0;

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {hasItems && (
        <div className="mb-6 flex justify-end">
          <Button variant="destructive" size="sm" onClick={() => setConfirmEmpty(true)}>
            Empty Trash
          </Button>
        </div>
      )}

      {!hasItems && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Trash2 className="mb-3 h-12 w-12 opacity-30" />
          <p>Trash is empty</p>
        </div>
      )}

      {deletedNotebooks.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Notebooks</h2>
          <div className="space-y-1">
            {deletedNotebooks.map((nb) => (
              <div
                key={nb.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{nb.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Deleted {nb.deletedAt ? formatDate(nb.deletedAt) : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Restore"
                    onClick={() => handleRestore("notebook", nb.id)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Delete permanently"
                    onClick={() => setDeleteTarget({ type: "notebook", id: nb.id, name: nb.name })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deletedNotes.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Notes</h2>
          <div className="space-y-1">
            {deletedNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{note.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Deleted {note.deletedAt ? formatDate(note.deletedAt) : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Restore"
                    onClick={() => handleRestore("note", note.id)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Delete permanently"
                    onClick={() => setDeleteTarget({ type: "note", id: note.id, name: note.title })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title="Delete Permanently"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handlePermanentDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <DeleteConfirmDialog
        open={confirmEmpty}
        title="Empty Trash"
        message="Are you sure you want to permanently delete all items in trash? This cannot be undone."
        onConfirm={handleEmptyTrash}
        onCancel={() => setConfirmEmpty(false)}
      />
    </div>
  );
};

export default TrashView;
