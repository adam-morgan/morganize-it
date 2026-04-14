import { useReactiveQueryWithMask } from "@/hooks/useReactiveQuery";
import { Plus, ChevronRight, ChevronDown, MoreVertical, Pencil, Trash2, FileText, Share2, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { CreateNotebook, useNotebooksSlice, useNotesSlice } from "../../notes";
import { useState } from "react";
import { take } from "rxjs";
import { useMaskSlice, useAlertSlice } from "../../app";
import RenameDialog from "@/features/notes/containers/RenameDialog";
import DeleteConfirmDialog from "@/features/notes/containers/DeleteConfirmDialog";
import { ShareDialog, useSharesSlice } from "@/features/shares";
import { useNavigate, useMatch } from "react-router-dom";

const AppMenu = () => {
  const { notebooks, updateNotebook, deleteNotebook } = useNotebooksSlice();
  const { expandedNotebookId, expandNotebook, loadNotes, notes } =
    useNotesSlice();
  const reactiveQuery = useReactiveQueryWithMask();
  const { mask } = useMaskSlice();
  const navigate = useNavigate();
  const removeShare = useSharesSlice((s) => s.removeShare);

  const notebookMatch = useMatch("/notebooks/:notebookId/*");
  const currentNotebookId = notebookMatch?.params.notebookId ?? null;
  const noteMatch = useMatch("/notebooks/:notebookId/notes/:noteId");
  const currentNoteId = noteMatch?.params.noteId ?? null;

  const [renameTarget, setRenameTarget] = useState<Notebook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notebook | null>(null);
  const [shareTarget, setShareTarget] = useState<Notebook | null>(null);

  const { errorAlert, successAlert } = useAlertSlice();

  // Derive owned, shared, and shadow notebooks from unified state
  const ownedNotebooks = notebooks.filter((nb) => nb.accessLevel === "owner");
  const sharedNotebooks = notebooks.filter(
    (nb) => nb.accessLevel === "read" || nb.accessLevel === "readwrite"
  );
  const shadowNotebooks = notebooks.filter((nb) => nb.accessLevel === "none");

  const handleLeaveShare = (shareId: string, notebookId: string) => {
    const unmask = mask("Leaving share...");
    removeShare(shareId)
      .pipe(take(1))
      .subscribe({
        complete: () => {
          unmask();
          successAlert("Left share");
          if (currentNotebookId === notebookId) navigate("/");
        },
        error: (err) => {
          unmask();
          errorAlert((err as Error).message ?? "Failed to leave share");
        },
      });
  };

  const handleNotebookRowClick = (notebook: Notebook) => {
    navigate(`/notebooks/${notebook.id}`);
    if (expandedNotebookId === notebook.id) {
      expandNotebook(null);
    } else {
      expandNotebook(notebook.id);
      reactiveQuery(() => loadNotes(notebook.id), "Loading...", () => {});
    }
  };

  const handleRename = (newName: string) => {
    if (!renameTarget) return;
    const unmask = mask("Renaming...");
    updateNotebook(renameTarget.id, newName)
      .pipe(take(1))
      .subscribe({
        complete: () => {
          unmask();
          setRenameTarget(null);
        },
        error: () => {
          unmask();
          setRenameTarget(null);
        },
      });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const unmask = mask("Deleting...");
    deleteNotebook(deleteTarget.id)
      .pipe(take(1))
      .subscribe({
        complete: () => {
          unmask();
          setDeleteTarget(null);
          if (currentNotebookId === deleteTarget.id) {
            navigate("/");
          }
        },
        error: () => {
          unmask();
          setDeleteTarget(null);
        },
      });
  };

  const handleNoteClick = (noteId: string, notebookId: string) => {
    navigate(`/notebooks/${notebookId}/notes/${noteId}`);
  };

  return (
    <nav className="w-full">
      <ul className="py-2">
        <li>
          <button
            className="w-full cursor-pointer px-4 py-2 text-left text-sm hover:bg-accent"
            onClick={() => navigate("/")}
          >
            Home
          </button>
        </li>
      </ul>
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">My Notebooks</span>
          <CreateNotebook
            trigger={(open) => (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={open}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          />
        </div>
      </div>
      <ul>
        {(ownedNotebooks ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((notebook) => {
          const isExpanded = expandedNotebookId === notebook.id;
          const isSelected = currentNotebookId === notebook.id;
          const notebookNotes = notes[notebook.id] ?? [];

          return (
            <li key={notebook.id}>
              <div
                className={`group flex w-full items-center px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
                  isSelected ? "font-medium" : ""
                }`}
                onClick={() => handleNotebookRowClick(notebook)}
              >
                <span className="mr-1 shrink-0 p-0.5 rounded">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="flex-1 truncate">{notebook.name}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => setRenameTarget(notebook)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShareTarget(notebook)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(notebook)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {isExpanded && (
                <ul className="ml-4">
                  {notebookNotes.length === 0 ? (
                    <li className="px-4 py-1.5 text-xs text-muted-foreground italic">
                      No notes
                    </li>
                  ) : (
                    notebookNotes.slice(0, 10).map((note) => (
                      <li key={note.id}>
                        <button
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs border-l-2 hover:bg-accent ${
                            currentNoteId === note.id ? "border-primary" : "border-transparent"
                          }`}
                          onClick={() => handleNoteClick(note.id, notebook.id)}
                        >
                          <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{note.title}</span>
                        </button>
                      </li>
                    ))
                  )}
                  {notebookNotes.length > 10 && (
                    <li className="px-4 py-1 text-xs text-muted-foreground">
                      +{notebookNotes.length - 10} more
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {(sharedNotebooks.length > 0 || shadowNotebooks.length > 0) && (
        <>
          <div className="mt-4 px-4 py-2">
            <Separator />
          </div>
          <div className="px-4 py-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Shared With Me
            </span>
          </div>
          <ul>
            {sharedNotebooks
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((notebook) => {
                const isExpanded = expandedNotebookId === notebook.id;
                const isSelected = currentNotebookId === notebook.id;
                const allNotes = notes[notebook.id] ?? [];
                return (
                  <li key={`shared-nb-${notebook.id}`}>
                    <div
                      className={`group flex w-full items-center px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
                        isSelected ? "font-medium" : ""
                      }`}
                      onClick={() => handleNotebookRowClick(notebook)}
                      title={`Shared by ${notebook.ownerName} (${notebook.accessLevel === "readwrite" ? "read & write" : "read only"})`}
                    >
                      <span className="mr-1 shrink-0 p-0.5 rounded">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <Users className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{notebook.name}</span>
                      {notebook.shareId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 md:opacity-0 md:group-hover:opacity-100"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem
                              onClick={() => handleLeaveShare(notebook.shareId!, notebook.id)}
                              className="text-destructive"
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Leave share
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {isExpanded && (
                      <ul className="ml-4">
                        {allNotes.length === 0 ? (
                          <li className="px-4 py-1.5 text-xs text-muted-foreground italic">
                            No notes
                          </li>
                        ) : (
                          allNotes.slice(0, 10).map((note) => (
                            <li key={note.id}>
                              <button
                                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs border-l-2 hover:bg-accent ${
                                  currentNoteId === note.id
                                    ? "border-primary"
                                    : "border-transparent"
                                }`}
                                onClick={() => handleNoteClick(note.id, notebook.id)}
                              >
                                <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="truncate">{note.title}</span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            {shadowNotebooks
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((shadow) => {
                const isExpanded = expandedNotebookId === shadow.id;
                const isSelected = currentNotebookId === shadow.id;
                const shadowNotes = notes[shadow.id] ?? [];
                return (
                  <li key={`shadow-nb-${shadow.id}`}>
                    <div
                      className={`group flex w-full items-center px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
                        isSelected ? "font-medium" : ""
                      }`}
                      onClick={() => handleNotebookRowClick(shadow as unknown as Notebook)}
                      title={`Notes shared by ${shadow.ownerName}`}
                    >
                      <span className="mr-1 shrink-0 p-0.5 rounded">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <Users className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-muted-foreground">
                        {shadow.name}
                      </span>
                    </div>
                    {isExpanded && (
                      <ul className="ml-4">
                        {shadowNotes.map((note) => (
                          <li key={note.id}>
                            <button
                              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs border-l-2 hover:bg-accent ${
                                currentNoteId === note.id
                                  ? "border-primary"
                                  : "border-transparent"
                              }`}
                              onClick={() => handleNoteClick(note.id, shadow.id)}
                            >
                              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{note.title}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
          </ul>
        </>
      )}

      <div className="mt-4 px-4 py-2">
        <Separator />
      </div>
      <ul>
        <li>
          <button
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm hover:bg-accent text-muted-foreground"
            onClick={() => navigate("/trash")}
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </button>
        </li>
      </ul>

      {renameTarget && (
        <RenameDialog
          open={true}
          currentName={renameTarget.name}
          label="Notebook Name"
          onRename={handleRename}
          onCancel={() => setRenameTarget(null)}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title="Delete Notebook"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All notes in this notebook will also be deleted. You can restore them from Trash.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {shareTarget && (
        <ShareDialog
          open={true}
          resourceType="notebook"
          resourceId={shareTarget.id}
          resourceName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
    </nav>
  );
};

export default AppMenu;
