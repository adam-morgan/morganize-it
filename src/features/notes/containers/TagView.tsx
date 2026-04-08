import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { take } from "rxjs";
import { openDB } from "idb";
import { LayoutGrid, List, Search, X, ArrowUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthSlice } from "@/features/auth";
import { useNotesSlice, NoteSortOption } from "../notesSlice";
import { useMaskSlice } from "@/features/app";
import { getCacheDb } from "../services/cache-db";
import NoteCard from "./NoteCard";
import NoteListItem from "./NoteListItem";
import MoveNoteDialog from "./MoveNoteDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import RenameDialog from "./RenameDialog";
import TagsDialog from "./TagsDialog";
import { searchNotes } from "../search/search-utils";

type ViewMode = "card" | "list";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 640px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
};

const sortOptions: { value: NoteSortOption; label: string }[] = [
  { value: "lastOpenedAt", label: "Last Opened" },
  { value: "updatedAt", label: "Last Edited" },
  { value: "createdAt", label: "Date Created" },
  { value: "titleAsc", label: "Title (A-Z)" },
  { value: "titleDesc", label: "Title (Z-A)" },
];

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

async function getAllNotes(user: User): Promise<Note[]> {
  if ((user as GuestUser).isGuest) {
    const db = await openDB("morganizeit", 2);
    return db.getAll("notes");
  }
  const db = await getCacheDb(user.id);
  return db.getAll("notes");
}

const TagView = () => {
  const { tagName } = useParams<{ tagName: string }>();
  const decodedTag = tagName ? decodeURIComponent(tagName) : "";
  const navigate = useNavigate();
  const { user } = useAuthSlice();
  const { updateNote, deleteNote } = useNotesSlice();
  const { mask } = useMaskSlice();

  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sortBy, setSortBy] = useState<NoteSortOption>("updatedAt");
  const [searchQuery, setSearchQuery] = useState("");
  const [taggedNotes, setTaggedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const [renameNote, setRenameNote] = useState<Note | null>(null);
  const [moveNote, setMoveNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [tagsNote, setTagsNote] = useState<Note | null>(null);

  const effectiveViewMode = isMobile ? "list" : viewMode;

  const loadTaggedNotes = useCallback(async () => {
    if (!user || !decodedTag) return;
    try {
      const allNotes = await getAllNotes(user);
      const filtered = allNotes.filter(
        (n) => !n.deletedAt && (n.tags ?? []).includes(decodedTag),
      );
      setTaggedNotes(filtered);
    } catch {
      setTaggedNotes([]);
    } finally {
      setLoading(false);
    }
  }, [user, decodedTag]);

  useEffect(() => {
    loadTaggedNotes();
  }, [loadTaggedNotes]);

  const allTags = useMemo(
    () => [...new Set(taggedNotes.flatMap((n) => n.tags ?? []))],
    [taggedNotes],
  );

  if (!decodedTag) return null;

  const sorted = sortNotes(taggedNotes, sortBy);
  const notes = searchQuery ? searchNotes(sorted, searchQuery) : sorted;

  const handleNoteClick = (note: Note) => {
    navigate(`/notebooks/${note.notebookId}/notes/${note.id}`);
  };

  const handleTagClick = (tag: string) => {
    navigate(`/tags/${encodeURIComponent(tag)}`);
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
          loadTaggedNotes();
        },
        error: () => {
          unmask();
          setDeleteTarget(null);
        },
      });
  };

  if (loading) return null;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="cursor-pointer" title="Sort notes">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {sortOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className="cursor-pointer"
              >
                <Check className={`mr-2 h-4 w-4 ${sortBy === opt.value ? "opacity-100" : "opacity-0"}`} />
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {!isMobile && (
          <div className="ml-auto flex gap-1">
            <Button
              variant={effectiveViewMode === "card" ? "secondary" : "ghost"}
              size="icon-sm"
              className="cursor-pointer"
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={effectiveViewMode === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              className="cursor-pointer"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg">No notes with this tag</p>
          <p className="text-sm">Notes tagged &ldquo;{decodedTag}&rdquo; will appear here</p>
        </div>
      ) : effectiveViewMode === "card" ? (
        <div className="flex flex-wrap gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              query={searchQuery || undefined}
              onClick={() => handleNoteClick(note)}
              onRename={() => setRenameNote(note)}
              onMove={() => setMoveNote(note)}
              onTags={() => setTagsNote(note)}
              onTagClick={handleTagClick}
              onDelete={() => setDeleteTarget(note)}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {notes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              query={searchQuery || undefined}
              onClick={() => handleNoteClick(note)}
              onRename={() => setRenameNote(note)}
              onMove={() => setMoveNote(note)}
              onTags={() => setTagsNote(note)}
              onTagClick={handleTagClick}
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
                  loadTaggedNotes();
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
                loadTaggedNotes();
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
        message={`Are you sure you want to delete "${deleteTarget?.title}"? You can restore it from Trash.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <TagsDialog
        open={tagsNote !== null}
        note={tagsNote}
        allTags={allTags}
        onSave={(tags) => {
          if (!tagsNote) return;
          const unmask = mask("Saving tags...");
          updateNote(tagsNote.id, tagsNote.notebookId, { tags })
            .pipe(take(1))
            .subscribe({
              complete: () => {
                unmask();
                setTagsNote(null);
                loadTaggedNotes();
              },
              error: () => {
                unmask();
                setTagsNote(null);
              },
            });
        }}
        onCancel={() => setTagsNote(null)}
      />
    </div>
  );
};

export default TagView;
