import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Plus } from "lucide-react";
import TagBadge from "../components/TagBadge";
import { useState, useEffect, useRef, useCallback } from "react";

type TagsDialogProps = {
  open: boolean;
  note: Note | null;
  allTags: string[];
  onSave: (tags: string[]) => void;
  onCancel: () => void;
};

type SuggestionItem = {
  label: string;
  value: string;
  isCreate: boolean;
};

const TagsDialog = ({ open, note, allTags, onSave, onCancel }: TagsDialogProps) => {
  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && note) {
      setTags([...(note.tags ?? [])]);
      setInputValue("");
      setSelectedIndex(0);
      setSaving(false);
    }
  }, [open, note]);

  const trimmed = inputValue.trim();

  const suggestions: SuggestionItem[] = (() => {
    if (!trimmed) return [];

    const matchingExisting = allTags
      .filter(
        (t) =>
          t.toLowerCase().includes(trimmed.toLowerCase()) &&
          !tags.includes(t),
      )
      .slice(0, 7)
      .map((t) => ({ label: t, value: t, isCreate: false }));

    const exactMatch = allTags.some(
      (t) => t.toLowerCase() === trimmed.toLowerCase(),
    );
    const alreadyAdded = tags.some(
      (t) => t.toLowerCase() === trimmed.toLowerCase(),
    );

    if (!exactMatch && !alreadyAdded) {
      matchingExisting.push({
        label: `Create tag: "${trimmed}"`,
        value: trimmed,
        isCreate: true,
      });
    }

    return matchingExisting;
  })();

  const addTag = useCallback(
    (tag: string) => {
      const value = tag.trim();
      if (value && !tags.includes(value)) {
        setTags((prev) => [...prev, value]);
      }
      setInputValue("");
      setSelectedIndex(0);
      inputRef.current?.focus();
    },
    [tags],
  );

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex].value);
      }
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      tags.length > 0
    ) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setSelectedIndex(0);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Manage Tags</AlertDialogTitle>
          <AlertDialogDescription>
            Add or remove tags for &quot;{note?.title}&quot;
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <TagBadge key={tag} tag={tag} onRemove={removeTag} />
              ))}
            </div>
          )}
          <div className="relative">
            <Label className="sr-only">Add tag</Label>
            <Input
              ref={inputRef}
              placeholder="Search or create a tag..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={suggestion.value + (suggestion.isCreate ? "-create" : "")}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm ${
                      i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(suggestion.value);
                    }}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    {suggestion.isCreate ? (
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {suggestion.isCreate ? (
                      <span>
                        Create tag: <span className="font-medium">&quot;{suggestion.value}&quot;</span>
                      </span>
                    ) : (
                      <span>{suggestion.label}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving} onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving}
            onClick={() => {
              setSaving(true);
              onSave(tags);
            }}
          >
            Save
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TagsDialog;
