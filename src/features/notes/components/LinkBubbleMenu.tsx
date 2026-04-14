import { useState, useEffect, useCallback } from "react";
import { BubbleMenu } from "@tiptap/react";
import { useEditor } from "novel";
import { Pencil, ExternalLink, Unlink, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const LinkBubbleMenu = () => {
  const { editor } = useEditor();
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState("");

  const currentHref = editor?.getAttributes("link").href ?? "";

  // Sync url state when the link under cursor changes
  useEffect(() => {
    if (!isEditing) {
      setUrl(currentHref);
    }
  }, [currentHref, isEditing]);

  const startEditing = useCallback(() => {
    setUrl(currentHref);
    setIsEditing(true);
  }, [currentHref]);

  const cancelEditing = useCallback(() => {
    setUrl(currentHref);
    setIsEditing(false);
  }, [currentHref]);

  const saveUrl = useCallback(() => {
    if (!editor || !url.trim()) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    setIsEditing(false);
  }, [editor, url]);

  const openLink = useCallback(() => {
    if (currentHref) {
      window.open(currentHref, "_blank", "noopener");
    }
  }, [currentHref]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  }, [editor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveUrl();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditing();
      }
    },
    [saveUrl, cancelEditing],
  );

  if (!editor) return null;

  const btn = (onClick: () => void, icon: React.ReactNode, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className="h-8 w-8 cursor-pointer p-0"
      onClick={onClick}
      title={label}
    >
      {icon}
    </Button>
  );

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        placement: "bottom",
        appendTo: "parent",
      }}
      shouldShow={({ editor }) => editor.isActive("link") && editor.state.selection.empty}
    >
      <div className="flex max-w-[90vw] items-center overflow-hidden rounded-md border border-muted bg-background shadow-xl">
        {isEditing ? (
          <div className="flex items-center gap-1 p-1">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://..."
              className="h-8 w-56 text-sm"
              autoFocus
            />
            {btn(saveUrl, <Check className="h-4 w-4" />, "Save")}
            {btn(cancelEditing, <X className="h-4 w-4" />, "Cancel")}
          </div>
        ) : (
          <div className="flex items-center gap-0.5 px-1">
            <button
              type="button"
              onClick={startEditing}
              className="max-w-48 cursor-pointer truncate px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
              title={currentHref}
            >
              {currentHref}
            </button>
            <Separator orientation="vertical" className="mx-0.5 h-6" />
            {btn(startEditing, <Pencil className="h-4 w-4" />, "Edit link")}
            {btn(openLink, <ExternalLink className="h-4 w-4" />, "Open in new tab")}
            {btn(removeLink, <Unlink className="h-4 w-4 text-destructive" />, "Remove link")}
          </div>
        )}
      </div>
    </BubbleMenu>
  );
};

export default LinkBubbleMenu;
