import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { take } from "rxjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecentNotesSlice } from "../recentNotesSlice";
import { useNotebooksSlice } from "../notebooksSlice";
import { useNotesSlice } from "../notesSlice";
import { useMaskSlice } from "@/features/app";
import { formatRelativeTime } from "./NoteCard";
import NoteListItem from "./NoteListItem";
import RenameDialog from "./RenameDialog";
import MoveNoteDialog from "./MoveNoteDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import TagsDialog from "./TagsDialog";
import TagBadge from "../components/TagBadge";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 640px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
};

const PlaceholderCard = () => (
  <Card className="w-56 animate-pulse gap-2">
    <CardHeader className="pb-0">
      <div className="h-4 w-3/4 rounded bg-muted" />
    </CardHeader>
    <CardContent>
      <div className="mt-2 space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
      <div className="mt-3 h-3 w-1/3 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/4 rounded bg-muted" />
    </CardContent>
  </Card>
);

const PlaceholderListItem = () => (
  <div className="flex animate-pulse items-center gap-4 px-3 py-3">
    <div className="min-w-0 flex-1">
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="mt-1.5 h-3 w-1/2 rounded bg-muted" />
    </div>
    <div className="h-3 w-12 rounded bg-muted" />
  </div>
);

const RecentNotes = () => {
  const { recentNotes, loaded, loadRecentNotes } = useRecentNotesSlice();
  const { notebooks } = useNotebooksSlice();
  const { updateNote, deleteNote } = useNotesSlice();
  const { mask } = useMaskSlice();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [renameNote, setRenameNote] = useState<Note | null>(null);
  const [moveNote, setMoveNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [tagsNote, setTagsNote] = useState<Note | null>(null);

  const allTags = [...new Set(recentNotes.flatMap((n) => n.tags ?? []))];

  useEffect(() => {
    if (!loaded) {
      const sub = loadRecentNotes().subscribe();
      return () => sub.unsubscribe();
    }
  }, [loaded]);

  const notebookName = (notebookId: string) =>
    notebooks.find((nb) => nb.id === notebookId)?.name ?? "";

  const handleTagClick = (tag: string) => {
    navigate(`/tags/${encodeURIComponent(tag)}`);
  };

  const handleRename = (newName: string) => {
    if (!renameNote) return;
    const unmask = mask("Renaming note...");
    updateNote(renameNote.id, renameNote.notebookId, { title: newName })
      .pipe(take(1))
      .subscribe({
        complete: () => {
          unmask();
          setRenameNote(null);
          loadRecentNotes().pipe(take(1)).subscribe();
        },
        error: () => {
          unmask();
          setRenameNote(null);
        },
      });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const unmask = mask("Deleting note...");
    deleteNote(deleteTarget.id, deleteTarget.notebookId)
      .pipe(take(1))
      .subscribe({
        complete: () => {
          unmask();
          setDeleteTarget(null);
          loadRecentNotes().pipe(take(1)).subscribe();
        },
        error: () => {
          unmask();
          setDeleteTarget(null);
        },
      });
  };

  const handleSaveTags = (tags: string[]) => {
    if (!tagsNote) return;
    const unmask = mask("Saving tags...");
    updateNote(tagsNote.id, tagsNote.notebookId, { tags })
      .pipe(take(1))
      .subscribe({
        complete: () => {
          unmask();
          setTagsNote(null);
          loadRecentNotes().pipe(take(1)).subscribe();
        },
        error: () => {
          unmask();
          setTagsNote(null);
        },
      });
  };

  const handleMove = (targetNotebookId: string) => {
    if (!moveNote) return;
    const unmask = mask("Moving note...");
    updateNote(moveNote.id, moveNote.notebookId, { notebookId: targetNotebookId })
      .pipe(take(1))
      .subscribe({
        complete: () => {
          unmask();
          setMoveNote(null);
          loadRecentNotes().pipe(take(1)).subscribe();
        },
        error: () => {
          unmask();
          setMoveNote(null);
        },
      });
  };

  if (!loaded) {
    return (
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Recently Opened</h2>
        {isMobile ? (
          <div className="divide-y rounded-lg border">
            {Array.from({ length: 6 }, (_, i) => <PlaceholderListItem key={i} />)}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 6 }, (_, i) => <PlaceholderCard key={i} />)}
          </div>
        )}
      </div>
    );
  }

  if (recentNotes.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Recently Opened</h2>
        <p className="text-sm text-muted-foreground">No recently opened notes.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Recently Opened</h2>
      {isMobile ? (
        <div className="divide-y rounded-lg border">
          {recentNotes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              onClick={() => navigate(`/notebooks/${note.notebookId}/notes/${note.id}`)}
              onRename={() => setRenameNote(note)}
              onMove={() => setMoveNote(note)}
              onTags={() => setTagsNote(note)}
              onTagClick={handleTagClick}
              onDelete={() => setDeleteTarget(note)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {recentNotes.map((note) => (
            <Card
              key={note.id}
              className="w-56 cursor-pointer gap-2 transition-colors hover:bg-accent/50"
              onClick={() => navigate(`/notebooks/${note.notebookId}/notes/${note.id}`)}
            >
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
                  {note.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {note.textContent || "Empty note"}
                </p>
                {(note.tags ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(note.tags ?? []).slice(0, 3).map((tag) => (
                      <TagBadge key={tag} tag={tag} onClick={handleTagClick} />
                    ))}
                    {(note.tags ?? []).length > 3 && (
                      <span className="text-xs text-muted-foreground">+{(note.tags ?? []).length - 3}</span>
                    )}
                  </div>
                )}
                {notebookName(note.notebookId) && (
                  <p className="mt-2 text-xs font-medium text-muted-foreground/80">
                    {notebookName(note.notebookId)}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Opened {formatRelativeTime(note.lastOpenedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {renameNote && (
        <RenameDialog
          open={true}
          currentName={renameNote.title}
          label="Note Title"
          onRename={handleRename}
          onCancel={() => setRenameNote(null)}
        />
      )}

      <MoveNoteDialog
        open={moveNote !== null}
        note={moveNote}
        onMove={handleMove}
        onCancel={() => setMoveNote(null)}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title="Delete Note"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? You can restore it from Trash.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <TagsDialog
        open={tagsNote !== null}
        note={tagsNote}
        allTags={allTags}
        onSave={handleSaveTags}
        onCancel={() => setTagsNote(null)}
      />
    </div>
  );
};

export default RecentNotes;
