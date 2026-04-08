import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { openDB } from "idb";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthSlice } from "@/features/auth";
import { useNotebooksSlice } from "../notebooksSlice";
import { getCacheDb } from "../services/cache-db";
import { searchNotes } from "./search-utils";
import SearchResultItem from "./SearchResultItem";

type SearchResult = {
  note: Note;
  notebookName: string;
};

const MAX_RESULTS = 20;

const GlobalSearchDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { user } = useAuthSlice();
  const { notebooks } = useNotebooksSlice();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const notebookMap = useCallback(() => {
    const map: Record<string, string> = {};
    for (const nb of notebooks) {
      map[nb.id] = nb.name;
    }
    return map;
  }, [notebooks]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (!user) return;
        const allNotes = await getAllNotes(user);
        const activeNotes = allNotes.filter((n) => !n.deletedAt);
        const matched = searchNotes(activeNotes, query).slice(0, MAX_RESULTS);
        const nbMap = notebookMap();
        setResults(
          matched.map((note) => ({
            note,
            notebookName: nbMap[note.notebookId] || "Unknown",
          })),
        );
        setSelectedIndex(0);
      } catch {
        setResults([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, user, notebookMap]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigate(`/notebooks/${result.note.notebookId}/notes/${result.note.id}`);
      onOpenChange(false);
    },
    [navigate, onOpenChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex, handleSelect],
  );

  useEffect(() => {
    const el = resultsRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Search notes</DialogTitle>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search across all notebooks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <div ref={resultsRef} className="max-h-80 overflow-y-auto">
          {!query.trim() && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Search across all notebooks
            </p>
          )}
          {query.trim() && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notes matching &ldquo;{query}&rdquo;
            </p>
          )}
          {results.map((result, i) => (
            <SearchResultItem
              key={result.note.id}
              note={result.note}
              notebookName={result.notebookName}
              query={query}
              selected={i === selectedIndex}
              onClick={() => handleSelect(result)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

async function getAllNotes(user: User): Promise<Note[]> {
  if ((user as GuestUser).isGuest) {
    const db = await openDB("morganizeit", 2);
    return db.getAll("notes");
  }
  const db = await getCacheDb(user.id);
  return db.getAll("notes");
}

export default GlobalSearchDialog;
