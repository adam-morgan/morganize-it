import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { take } from "rxjs";
import { Plus, LayoutGrid, List, ArrowUpDown, Check, MoreVertical, Pencil, Share2, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotesSlice, NoteSortOption } from "../notesSlice";
import { useNotebooksSlice } from "../notebooksSlice";
import { useMaskSlice } from "@/features/app";
import { useAuthSlice } from "@/features/auth";
import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import NoteCard from "./NoteCard";
import NoteListItem from "./NoteListItem";
import CreateNote from "./CreateNote";
import MoveNoteDialog from "./MoveNoteDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import RenameDialog from "./RenameDialog";
import TagsDialog from "./TagsDialog";
import { searchNotes } from "../search/search-utils";
import {
  DropdownMenu as ToolbarDropdownMenu,
  DropdownMenuContent as ToolbarDropdownMenuContent,
  DropdownMenuItem as ToolbarDropdownMenuItem,
  DropdownMenuTrigger as ToolbarDropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareDialog } from "@/features/shares";
import SearchInput from "./stash/SearchInput";
import ArchivedBanner from "./stash/ArchivedBanner";

type ViewMode = "card" | "list";

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
  const {
    notes: allNotesMap,
    loadNotes,
    getSortedNotes,
    sortBy,
    setSortBy,
    deleteNote,
    updateNote,
    setNoteArchived,
  } = useNotesSlice();
  const { notebooks, updateNotebook, setNotebookArchived, deleteNotebook } = useNotebooksSlice();
  const { mask } = useMaskSlice();
  const myUserId = useAuthSlice((s) => s.user?.id);
  const reactiveQuery = useReactiveQueryWithMask();

  const isMobile = useIsMobile();
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem("viewMode");
    return stored === "list" ? "list" : "card";
  });
  const setViewMode = (mode: ViewMode) => {
    localStorage.setItem("viewMode", mode);
    setViewModeState(mode);
  };
  const [renameNote, setRenameNote] = useState<Note | null>(null);
  const [moveNote, setMoveNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Note | null>(null);
  const [tagsNote, setTagsNote] = useState<Note | null>(null);
  const [shareNote, setShareNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [renameNotebookOpen, setRenameNotebookOpen] = useState(false);
  const [shareNotebookOpen, setShareNotebookOpen] = useState(false);
  const [deleteNotebookOpen, setDeleteNotebookOpen] = useState(false);
  const [archiveNotebookOpen, setArchiveNotebookOpen] = useState(false);

  const effectiveViewMode = isMobile ? "list" : viewMode;

  const notebook = notebooks.find((nb) => nb.id === notebookId) as SyncNotebook | undefined;
  const accessLevel: ShareAccessLevel = notebook?.accessLevel ?? "none";

  const canEditNotebook = accessLevel === "owner" || accessLevel === "readwrite";
  const canDeleteNotebook = accessLevel === "owner";
  const canShareNotebook = accessLevel === "owner";
  const canCreateNote = accessLevel === "owner" || accessLevel === "readwrite";

  useEffect(() => {
    if (notebookId) {
      reactiveQuery(() => loadNotes(notebookId), "Loading notes...", () => {});
    }
  }, [notebookId]);

  if (!notebookId || !notebook) {
    return null;
  }

  const isNotebookArchived = !!notebook.archivedAt;
  const allNotes = getSortedNotes(notebookId).filter((n) => !n.archivedAt);
  const notes = searchQuery ? searchNotes(allNotes, searchQuery) : allNotes;
  const allTags = [...new Set(Object.values(allNotesMap).flat().flatMap((n) => n.tags ?? []))];

  const handleTagClick = (tag: string) => {
    navigate(`/tags/${encodeURIComponent(tag)}`);
  };

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

  const handleArchiveNote = () => {
    if (!archiveTarget) return;
    const unmask = mask("Archiving note...");
    setNoteArchived(archiveTarget.id, archiveTarget.notebookId, true).pipe(take(1)).subscribe({
      complete: () => {
        unmask();
        setArchiveTarget(null);
      },
      error: () => {
        unmask();
        setArchiveTarget(null);
      },
    });
  };

  const handleSetNotebookArchived = (archived: boolean) => {
    const unmask = mask(archived ? "Archiving notebook..." : "Unarchiving notebook...");
    setNotebookArchived(notebook.id, archived).pipe(take(1)).subscribe({
      complete: () => {
        unmask();
        setArchiveNotebookOpen(false);
      },
      error: () => {
        unmask();
        setArchiveNotebookOpen(false);
      },
    });
  };

  const handleNoteClick = (note: Note) => {
    navigate(`/notebooks/${notebookId}/notes/${note.id}`);
  };

  return (
    <div className="p-6">
      {isNotebookArchived && (
        <ArchivedBanner
          message="This notebook is archived."
          onUnarchive={canDeleteNotebook ? () => handleSetNotebookArchived(false) : undefined}
        />
      )}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search notes..."
          className="w-48"
        />
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
        {canCreateNote && (
          <CreateNote
            notebookId={notebookId}
            trigger={(open) => (
              <Button onClick={open} size="icon-sm" className="cursor-pointer" title="New Note">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          />
        )}
        {!isMobile && (
          <div className="ml-auto flex items-center gap-1">
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
            {(canEditNotebook || canShareNotebook || canDeleteNotebook) && (
              <ToolbarDropdownMenu>
                <ToolbarDropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="cursor-pointer">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </ToolbarDropdownMenuTrigger>
                <ToolbarDropdownMenuContent align="end">
                  {canEditNotebook && (
                    <ToolbarDropdownMenuItem onClick={() => setRenameNotebookOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </ToolbarDropdownMenuItem>
                  )}
                  {canShareNotebook && (
                    <ToolbarDropdownMenuItem onClick={() => setShareNotebookOpen(true)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </ToolbarDropdownMenuItem>
                  )}
                  {canDeleteNotebook && (
                    <ToolbarDropdownMenuItem
                      onClick={() =>
                        isNotebookArchived ? handleSetNotebookArchived(false) : setArchiveNotebookOpen(true)
                      }
                    >
                      {isNotebookArchived ? (
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                      ) : (
                        <Archive className="mr-2 h-4 w-4" />
                      )}
                      {isNotebookArchived ? "Unarchive" : "Archive"}
                    </ToolbarDropdownMenuItem>
                  )}
                  {canDeleteNotebook && (
                    <ToolbarDropdownMenuItem
                      onClick={() => setDeleteNotebookOpen(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </ToolbarDropdownMenuItem>
                  )}
                </ToolbarDropdownMenuContent>
              </ToolbarDropdownMenu>
            )}
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg">No notes yet</p>
          <p className="text-sm">Create a note to get started</p>
        </div>
      ) : (
        effectiveViewMode === "card" ? (
          <div className="flex flex-wrap gap-4">
            {notes.map((note) => {
              const owned = note.userId === myUserId;
              const noteEditable = owned || (note as SyncNote).accessLevel === "readwrite";
              return (
                <NoteCard
                  key={note.id}
                  note={note}
                  query={searchQuery || undefined}
                  onClick={() => handleNoteClick(note)}
                  onRename={noteEditable ? () => setRenameNote(note) : undefined}
                  onMove={owned ? () => setMoveNote(note) : undefined}
                  onTags={noteEditable ? () => setTagsNote(note) : undefined}
                  onShare={owned ? () => setShareNote(note) : undefined}
                  onTagClick={handleTagClick}
                  onArchive={owned ? () => setArchiveTarget(note) : undefined}
                  onDelete={owned ? () => setDeleteTarget(note) : undefined}
                />
              );
            })}
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {notes.map((note) => {
              const owned = note.userId === myUserId;
              const noteEditable = owned || (note as SyncNote).accessLevel === "readwrite";
              return (
                <NoteListItem
                  key={note.id}
                  note={note}
                  query={searchQuery || undefined}
                  onClick={() => handleNoteClick(note)}
                  onRename={noteEditable ? () => setRenameNote(note) : undefined}
                  onMove={owned ? () => setMoveNote(note) : undefined}
                  onTags={noteEditable ? () => setTagsNote(note) : undefined}
                  onShare={owned ? () => setShareNote(note) : undefined}
                  onTagClick={handleTagClick}
                  onArchive={owned ? () => setArchiveTarget(note) : undefined}
                  onDelete={owned ? () => setDeleteTarget(note) : undefined}
                />
              );
            })}
          </div>
        )
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
        message={`Are you sure you want to delete "${deleteTarget?.title}"? You can restore it from Trash.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <DeleteConfirmDialog
        open={archiveTarget !== null}
        title="Archive Note"
        message={`Are you sure you want to archive "${archiveTarget?.title}"? You can find it under Archived.`}
        onConfirm={handleArchiveNote}
        onCancel={() => setArchiveTarget(null)}
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
              },
              error: () => {
                unmask();
                setTagsNote(null);
              },
            });
        }}
        onCancel={() => setTagsNote(null)}
      />

      {renameNotebookOpen && (
        <RenameDialog
          open={true}
          currentName={notebook.name}
          label="Notebook Name"
          onRename={(newName) => {
            const unmask = mask("Renaming...");
            updateNotebook(notebook.id, newName)
              .pipe(take(1))
              .subscribe({
                complete: () => {
                  unmask();
                  setRenameNotebookOpen(false);
                },
                error: () => {
                  unmask();
                  setRenameNotebookOpen(false);
                },
              });
          }}
          onCancel={() => setRenameNotebookOpen(false)}
        />
      )}

      {shareNotebookOpen && (
        <ShareDialog
          open={true}
          resourceType="notebook"
          resourceId={notebook.id}
          resourceName={notebook.name}
          onClose={() => setShareNotebookOpen(false)}
        />
      )}

      {shareNote && (
        <ShareDialog
          open={true}
          resourceType="note"
          resourceId={shareNote.id}
          resourceName={shareNote.title || "Untitled"}
          onClose={() => setShareNote(null)}
        />
      )}

      <DeleteConfirmDialog
        open={archiveNotebookOpen}
        title="Archive Notebook"
        message={`Are you sure you want to archive "${notebook.name}"? You can find it under Archived.`}
        onConfirm={() => handleSetNotebookArchived(true)}
        onCancel={() => setArchiveNotebookOpen(false)}
      />

      <DeleteConfirmDialog
        open={deleteNotebookOpen}
        title="Delete Notebook"
        message={`Are you sure you want to delete "${notebook.name}"? All notes in this notebook will also be deleted. You can restore them from Trash.`}
        onConfirm={() => {
          const unmask = mask("Deleting notebook...");
          deleteNotebook(notebook.id)
            .pipe(take(1))
            .subscribe({
              complete: () => {
                unmask();
                setDeleteNotebookOpen(false);
                navigate("/");
              },
              error: () => {
                unmask();
                setDeleteNotebookOpen(false);
              },
            });
        }}
        onCancel={() => setDeleteNotebookOpen(false)}
      />
    </div>
  );
};

export default NotebookView;
