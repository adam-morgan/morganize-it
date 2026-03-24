import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { take } from "rxjs";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotesSlice, NoteSortOption } from "../notesSlice";
import { useNotebooksSlice } from "../notebooksSlice";
import { useMaskSlice } from "@/features/app";
import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import NoteCard from "./NoteCard";
import CreateNote from "./CreateNote";
import MoveNoteDialog from "./MoveNoteDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import RenameDialog from "./RenameDialog";

const sortOptions: { value: NoteSortOption; label: string }[] = [
  { value: "lastOpenedAt", label: "Last Opened" },
  { value: "updatedAt", label: "Last Edited" },
  { value: "createdAt", label: "Date Created" },
  { value: "titleAsc", label: "Title (A-Z)" },
  { value: "titleDesc", label: "Title (Z-A)" },
];

const NotebookView = () => {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();
  const { loadNotes, getSortedNotes, sortBy, setSortBy, deleteNote, updateNote } =
    useNotesSlice();
  const { notebooks } = useNotebooksSlice();
  const { mask } = useMaskSlice();
  const reactiveQuery = useReactiveQueryWithMask();

  const [renameNote, setRenameNote] = useState<Note | null>(null);
  const [moveNote, setMoveNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const notebook = notebooks.find((nb) => nb.id === notebookId);

  useEffect(() => {
    if (notebookId) {
      reactiveQuery(() => loadNotes(notebookId), "Loading notes...", () => {});
    }
  }, [notebookId]);

  if (!notebookId || !notebook) {
    return null;
  }

  const notes = getSortedNotes(notebookId);

  const handleDelete = () => {
    if (!deleteTarget) return;
    const unmask = mask("Deleting note...");
    deleteNote(deleteTarget.id, deleteTarget.notebookId).pipe(take(1)).subscribe({
      complete: () => {
        unmask();
        setDeleteTarget(null);
      },
      error: () => {
        unmask();
        setDeleteTarget(null);
      },
    });
  };

  const handleNoteClick = (note: Note) => {
    navigate(`/notebooks/${notebookId}/notes/${note.id}`);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as NoteSortOption)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CreateNote
          notebookId={notebookId}
          trigger={(open) => (
            <Button onClick={open} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Note
            </Button>
          )}
        />
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg">No notes yet</p>
          <p className="text-sm">Create a note to get started</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => handleNoteClick(note)}
              onRename={() => setRenameNote(note)}
              onMove={() => setMoveNote(note)}
              onDelete={() => setDeleteTarget(note)}
            />
          ))}
        </div>
      )}

      {renameNote && (
        <RenameDialog
          open={true}
          currentName={renameNote.title}
          label="Note Title"
          onRename={(newName) => {
            const unmask = mask("Renaming note...");
            updateNote(renameNote.id, renameNote.notebookId, { title: newName })
              .pipe(take(1))
              .subscribe({
                complete: () => {
                  unmask();
                  setRenameNote(null);
                },
                error: () => {
                  unmask();
                  setRenameNote(null);
                },
              });
          }}
          onCancel={() => setRenameNote(null)}
        />
      )}

      <MoveNoteDialog
        open={moveNote !== null}
        note={moveNote}
        onMove={(targetNotebookId) => {
          if (!moveNote) return;
          const unmask = mask("Moving note...");
          updateNote(moveNote.id, moveNote.notebookId, { notebookId: targetNotebookId })
            .pipe(take(1))
            .subscribe({
              complete: () => {
                unmask();
                setMoveNote(null);
              },
              error: () => {
                unmask();
                setMoveNote(null);
              },
            });
        }}
        onCancel={() => setMoveNote(null)}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title="Delete Note"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default NotebookView;
