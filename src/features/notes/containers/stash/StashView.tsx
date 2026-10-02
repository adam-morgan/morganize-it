import { useState } from "react";
import { LucideIcon } from "lucide-react";
import { HighlightedText, searchNotes } from "../../search/search-utils";
import SearchInput from "./SearchInput";
import StashItemRow, { StashAction } from "./StashItemRow";

type StashViewProps<NB extends Notebook, N extends Note> = {
  notebooks: NB[];
  notes: N[];
  emptyIcon: LucideIcon;
  emptyMessage: string;
  searchPlaceholder: string;
  headerActions?: React.ReactNode;
  notebookSubtitle: (notebook: NB) => string;
  noteSubtitle: (note: N) => string;
  notebookActions: (notebook: NB) => StashAction[];
  noteActions: (note: N) => StashAction[];
  onOpenNotebook?: (notebook: NB) => void;
  onOpenNote?: (note: N) => void;
};

export const formatStashDate = (dateStr?: string | null) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "";

const StashView = <NB extends Notebook, N extends Note>({
  notebooks,
  notes,
  emptyIcon: EmptyIcon,
  emptyMessage,
  searchPlaceholder,
  headerActions,
  notebookSubtitle,
  noteSubtitle,
  notebookActions,
  noteActions,
  onOpenNotebook,
  onOpenNote,
}: StashViewProps<NB, N>) => {
  const [query, setQuery] = useState("");

  const trimmed = query.trim().toLowerCase();
  const visibleNotebooks = trimmed
    ? notebooks.filter((nb) => nb.name.toLowerCase().includes(trimmed))
    : notebooks;
  const visibleNotes = searchNotes(notes, query) as N[];

  const hasItems = notebooks.length > 0 || notes.length > 0;
  const hasMatches = visibleNotebooks.length > 0 || visibleNotes.length > 0;

  const highlight = (text: string) => (trimmed ? HighlightedText({ text, query }) : text);

  if (!hasItems) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <EmptyIcon className="mb-3 h-12 w-12 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} className="flex-1" />
        {headerActions}
      </div>

      {!hasMatches && (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing matches &ldquo;{query}&rdquo;</p>
      )}

      {visibleNotebooks.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Notebooks</h2>
          <div className="space-y-1">
            {visibleNotebooks.map((nb) => (
              <StashItemRow
                key={nb.id}
                title={highlight(nb.name)}
                subtitle={notebookSubtitle(nb)}
                actions={notebookActions(nb)}
                onClick={onOpenNotebook ? () => onOpenNotebook(nb) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {visibleNotes.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Notes</h2>
          <div className="space-y-1">
            {visibleNotes.map((note) => (
              <StashItemRow
                key={note.id}
                title={highlight(note.title || "Untitled")}
                subtitle={noteSubtitle(note)}
                actions={noteActions(note)}
                onClick={onOpenNote ? () => onOpenNote(note) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StashView;
