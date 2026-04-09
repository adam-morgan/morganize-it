import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, FolderInput, Tag, Trash2 } from "lucide-react";
import { formatRelativeTime } from "./NoteCard";
import { HighlightedText, getSnippet, SnippetText } from "../search/search-utils";
import TagBadge from "../components/TagBadge";

type NoteListItemProps = {
  note: Note;
  query?: string;
  onClick: () => void;
  onRename: () => void;
  onMove: () => void;
  onTags: () => void;
  onTagClick: (tag: string) => void;
  onDelete: () => void;
};

const NoteListItem = ({ note, query, onClick, onRename, onMove, onTags, onTagClick, onDelete }: NoteListItemProps) => {
  const snippet = query ? getSnippet(note.textContent, query) : null;

  return (
    <div
      className="flex cursor-pointer items-center gap-2 px-3 py-3 transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1 flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <p className="truncate text-sm font-medium">
            {query ? HighlightedText({ text: note.title, query }) : note.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {snippet ? SnippetText({ snippet }) : (note.textContent || "Empty note")}
          </p>
        </div>
        {(note.tags ?? []).length > 0 && (
          <div className="flex gap-1">
            {(note.tags ?? []).slice(0, 2).map((tag) => (
              <TagBadge key={tag} tag={tag} query={query} onClick={onTagClick} />
            ))}
            {(note.tags ?? []).length > 2 && (
              <span className="text-xs text-muted-foreground">+{(note.tags ?? []).length - 2}</span>
            )}
          </div>
        )}
        <span className="shrink-0 text-xs text-muted-foreground/60">
          {formatRelativeTime(note.updatedAt)}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMove}>
            <FolderInput className="mr-2 h-4 w-4" />
            Move to...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onTags}>
            <Tag className="mr-2 h-4 w-4" />
            Tags...
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NoteListItem;
