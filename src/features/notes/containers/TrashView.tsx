import { useEffect, useState } from "react";
import { Trash2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrashSlice } from "../trashSlice";
import { useNetworkSlice } from "@/features/network/networkSlice";
import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import StashView, { formatStashDate } from "./stash/StashView";

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
  const online = useNetworkSlice((s) => s.online);
  const reactiveQuery = useReactiveQueryWithMask();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "note" | "notebook"; id: string; name: string } | null>(null);

  useEffect(() => {
    // Trash lives only on the server (no offline cache), so skip loading when
    // offline — the network request would just error.
    if (online) {
      reactiveQuery(() => loadTrash(), "Loading trash...", () => {});
    }
  }, [online]);

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

  if (!online) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Trash2 className="mb-3 h-12 w-12 opacity-30" />
        <p>Trash isn&apos;t available offline</p>
        <p className="mt-1 text-xs">Reconnect to view and manage deleted items.</p>
      </div>
    );
  }

  if (!loaded) return null;

  return (
    <>
      <StashView
        notebooks={deletedNotebooks}
        notes={deletedNotes}
        emptyIcon={Trash2}
        emptyMessage="Trash is empty"
        searchPlaceholder="Search trash..."
        headerActions={
          <Button variant="destructive" size="sm" className="cursor-pointer" onClick={() => setConfirmEmpty(true)}>
            Empty Trash
          </Button>
        }
        notebookSubtitle={(nb) => `Deleted ${formatStashDate(nb.deletedAt)}`}
        noteSubtitle={(note) => `Deleted ${formatStashDate(note.deletedAt)}`}
        notebookActions={(nb) => [
          { title: "Restore", icon: RotateCcw, onClick: () => handleRestore("notebook", nb.id) },
          {
            title: "Delete permanently",
            icon: X,
            destructive: true,
            onClick: () => setDeleteTarget({ type: "notebook", id: nb.id, name: nb.name }),
          },
        ]}
        noteActions={(note) => [
          { title: "Restore", icon: RotateCcw, onClick: () => handleRestore("note", note.id) },
          {
            title: "Delete permanently",
            icon: X,
            destructive: true,
            onClick: () => setDeleteTarget({ type: "note", id: note.id, name: note.title }),
          },
        ]}
      />

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
    </>
  );
};

export default TrashView;
