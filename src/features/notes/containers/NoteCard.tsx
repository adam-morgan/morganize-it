import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, FolderInput, Trash2 } from "lucide-react";

type NoteCardProps = {
  note: Note;
  onClick: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
};

const formatRelativeTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const NoteCard = ({ note, onClick, onRename, onMove, onDelete }: NoteCardProps) => {
  return (
    <Card
      className="w-72 cursor-pointer gap-2 transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle className="text-sm font-medium leading-tight line-clamp-2 flex-1 pr-2">
          {note.title}
        </CardTitle>
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
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground line-clamp-3">
          {note.textContent || "Empty note"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground/60">
          Edited {formatRelativeTime(note.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
};

export default NoteCard;
