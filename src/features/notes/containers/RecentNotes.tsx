import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecentNotesSlice } from "../recentNotesSlice";
import { useNotebooksSlice } from "../notebooksSlice";
import { formatRelativeTime } from "./NoteCard";

const PlaceholderCard = () => (
  <Card className="w-56 animate-pulse">
    <CardHeader className="pb-0">
      <div className="h-4 w-3/4 rounded bg-muted" />
    </CardHeader>
    <CardContent>
      <div className="mt-2 space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
      <div className="mt-3 h-3 w-1/3 rounded bg-muted" />
    </CardContent>
  </Card>
);

const RecentNotes = () => {
  const { recentNotes, loaded, loadRecentNotes } = useRecentNotesSlice();
  const { notebooks } = useNotebooksSlice();
  const navigate = useNavigate();

  useEffect(() => {
    const sub = loadRecentNotes().subscribe();
    return () => sub.unsubscribe();
  }, []);

  const notebookName = (notebookId: string) =>
    notebooks.find((nb) => nb.id === notebookId)?.name ?? "";

  if (!loaded) {
    return (
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Recently Opened</h2>
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 4 }, (_, i) => <PlaceholderCard key={i} />)}
        </div>
      </div>
    );
  }

  if (recentNotes.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase text-muted-foreground">Recently Opened</h2>
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
    </div>
  );
};

export default RecentNotes;
