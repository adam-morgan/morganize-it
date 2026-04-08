import { HighlightedText, getSnippet, SnippetText } from "./search-utils";
import { formatRelativeTime } from "../containers/NoteCard";

type SearchResultItemProps = {
  note: Note;
  notebookName?: string;
  query: string;
  selected?: boolean;
  onClick: () => void;
};

const SearchResultItem = ({
  note,
  notebookName,
  query,
  selected,
  onClick,
}: SearchResultItemProps) => {
  const snippet = getSnippet(note.textContent, query);

  return (
    <button
      className={`w-full cursor-pointer px-3 py-2.5 text-left transition-colors hover:bg-accent/50 ${selected ? "bg-accent" : ""}`}
      onClick={onClick}
      type="button"
    >
      <p className="truncate text-sm font-medium">
        {HighlightedText({ text: note.title, query })}
      </p>
      {snippet && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {SnippetText({ snippet })}
        </p>
      )}
      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground/60">
        {notebookName && <span>{notebookName}</span>}
        <span>{formatRelativeTime(note.updatedAt)}</span>
      </div>
    </button>
  );
};

export default SearchResultItem;
