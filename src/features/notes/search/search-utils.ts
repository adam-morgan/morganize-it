import React from "react";

export type SnippetParts = {
  before: string;
  match: string;
  after: string;
};

export const searchNotes = (notes: Note[], query: string): Note[] => {
  if (!query.trim()) return notes;
  const lower = query.toLowerCase();
  return notes.filter(
    (n) =>
      n.title.toLowerCase().includes(lower) ||
      n.textContent.toLowerCase().includes(lower) ||
      (n.tags ?? []).some((tag) => tag.toLowerCase().includes(lower)),
  );
};

export const getSnippet = (
  text: string,
  query: string,
  contextChars = 60,
): SnippetParts | null => {
  if (!query.trim()) return null;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return null;

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + query.length + contextChars);

  return {
    before: (start > 0 ? "..." : "") + text.slice(start, idx),
    match: text.slice(idx, idx + query.length),
    after: text.slice(idx + query.length, end) + (end < text.length ? "..." : ""),
  };
};

export const HighlightedText = ({
  text,
  query,
}: {
  text: string;
  query: string;
}): React.ReactElement => {
  if (!query.trim()) return React.createElement(React.Fragment, null, text);

  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  let idx = lower.indexOf(qLower);
  while (idx !== -1) {
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }
    parts.push(
      React.createElement(
        "mark",
        {
          key: idx,
          className: "bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5",
        },
        text.slice(idx, idx + query.length),
      ),
    );
    lastIndex = idx + query.length;
    idx = lower.indexOf(qLower, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return React.createElement(React.Fragment, null, ...parts);
};

export const SnippetText = ({
  snippet,
}: {
  snippet: SnippetParts;
}): React.ReactElement => {
  return React.createElement(
    React.Fragment,
    null,
    snippet.before,
    React.createElement(
      "mark",
      { className: "bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5" },
      snippet.match,
    ),
    snippet.after,
  );
};
