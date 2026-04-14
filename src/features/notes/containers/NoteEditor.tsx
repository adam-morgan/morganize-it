import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { take } from "rxjs";
import { useMaskSlice, useAlertSlice } from "@/features/app";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorCommandList,
  EditorBubble,
  EditorBubbleItem,
  type EditorInstance,
  type JSONContent,
  useEditor,
  StarterKit,
  TiptapUnderline,
  TiptapLink,
  TaskList,
  TaskItem,
  Placeholder,
  HorizontalRule,
  HighlightExtension,
  CustomKeymap,
  Command,
  createSuggestionItems,
  handleCommandNavigation,
  renderItems,
} from "novel";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  ArrowLeft,
  MoreVertical,
  FolderInput,
  Tag,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  TextQuote,
  Minus,
  CodeSquare,
  Text,
  Share2,
  Table2,
  Paperclip,
  Link2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotesSlice } from "../notesSlice";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import MoveNoteDialog from "./MoveNoteDialog";
import TagsDialog from "./TagsDialog";
import TagBadge from "../components/TagBadge";
import TableBubbleMenu from "../components/TableBubbleMenu";
import LinkBubbleMenu from "../components/LinkBubbleMenu";
import { ShareDialog } from "@/features/shares";
import { useAuthSlice } from "@/features/auth";
import AttachmentList from "../components/AttachmentList";
import AttachmentUploadDialog from "./AttachmentUploadDialog";

// --- Suggestion items (slash commands) ---

export const suggestionItems = createSuggestionItems([
  {
    title: "Text",
    description: "Just start typing with plain text.",
    searchTerms: ["p", "paragraph"],
    icon: <Text size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with a to-do list.",
    searchTerms: ["todo", "task", "list", "check", "checkbox"],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Heading 1",
    description: "Big section heading.",
    searchTerms: ["title", "big", "large"],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading.",
    searchTerms: ["subtitle", "medium"],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading.",
    searchTerms: ["subtitle", "small"],
    icon: <Heading3 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list.",
    searchTerms: ["unordered", "point"],
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a list with numbering.",
    searchTerms: ["ordered"],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote.",
    searchTerms: ["blockquote"],
    icon: <TextQuote size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").toggleBlockquote().run();
    },
  },
  {
    title: "Code",
    description: "Capture a code snippet.",
    searchTerms: ["codeblock"],
    icon: <CodeSquare size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Divider",
    description: "Insert a horizontal divider.",
    searchTerms: ["hr", "separator", "horizontal", "rule"],
    icon: <Minus size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Table",
    description: "Insert a table.",
    searchTerms: ["table", "grid", "rows", "columns"],
    icon: <Table2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
]);

// --- Slash command extension ---

const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});

// --- Editor extensions ---

const starterKit = StarterKit.configure({
  horizontalRule: false,
  dropcursor: { color: "#DBEAFE", width: 4 },
});

const extensions = [
  starterKit,
  Placeholder,
  TiptapLink.configure({
    autolink: false,
    linkOnPaste: false,
    openOnClick: false,
    defaultProtocol: "https",
  }),
  HorizontalRule,
  TaskList,
  TaskItem.configure({ nested: true }),
  TiptapUnderline,
  HighlightExtension,
  CustomKeymap,
  slashCommand,
  Table.configure({
    resizable: false,
    HTMLAttributes: { class: "novel-table" },
  }),
  TableRow,
  TableCell,
  TableHeader,
];

// --- Link popover button (shared by toolbar + bubble menu) ---

const LinkPopoverButton = ({ className }: { className?: string }) => {
  const { editor } = useEditor();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  if (!editor) return null;

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setUrl(editor.getAttributes("link").href ?? "");
    }
    setOpen(nextOpen);
  };

  const apply = () => {
    if (!url.trim()) return;
    editor.chain().focus().setLink({ href: url.trim() }).run();
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      apply();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className={`h-8 w-8 cursor-pointer p-0 ${editor.isActive("link") ? "bg-accent" : ""} ${className ?? ""}`}
          title="Link"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" side="bottom" align="start">
        <div className="flex items-center gap-1">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://..."
            className="h-8 text-sm"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-8 w-8 cursor-pointer p-0"
            onClick={apply}
            title="Apply"
            disabled={!url.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-8 w-8 cursor-pointer p-0"
            onClick={() => setOpen(false)}
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// --- Formatting toolbar (works on mobile + desktop) ---

const EditorToolbar = ({ onAttach }: { onAttach?: () => void }) => {
  const { editor } = useEditor();
  if (!editor) return null;

  const btn = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    label: string
  ) => (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className={`h-8 w-8 p-0 ${active ? "bg-accent" : ""}`}
      onClick={onClick}
      title={label}
    >
      {icon}
    </Button>
  );

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-b px-2 py-1">
      {btn(
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run(),
        <Bold className="h-4 w-4" />,
        "Bold"
      )}
      {btn(
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        <Italic className="h-4 w-4" />,
        "Italic"
      )}
      {btn(
        editor.isActive("underline"),
        () => editor.chain().focus().toggleUnderline().run(),
        <Underline className="h-4 w-4" />,
        "Underline"
      )}
      {btn(
        editor.isActive("strike"),
        () => editor.chain().focus().toggleStrike().run(),
        <Strikethrough className="h-4 w-4" />,
        "Strikethrough"
      )}
      {btn(
        editor.isActive("code"),
        () => editor.chain().focus().toggleCode().run(),
        <Code className="h-4 w-4" />,
        "Inline code"
      )}
      <LinkPopoverButton />

      <Separator orientation="vertical" className="mx-1 h-6" />

      {btn(
        editor.isActive("heading", { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        <Heading1 className="h-4 w-4" />,
        "Heading 1"
      )}
      {btn(
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        <Heading2 className="h-4 w-4" />,
        "Heading 2"
      )}
      {btn(
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        <Heading3 className="h-4 w-4" />,
        "Heading 3"
      )}

      <Separator orientation="vertical" className="mx-1 h-6" />

      {btn(
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        <List className="h-4 w-4" />,
        "Bullet list"
      )}
      {btn(
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        <ListOrdered className="h-4 w-4" />,
        "Numbered list"
      )}
      {btn(
        editor.isActive("taskList"),
        () => editor.chain().focus().toggleTaskList().run(),
        <CheckSquare className="h-4 w-4" />,
        "Task list"
      )}

      <Separator orientation="vertical" className="mx-1 h-6" />

      {btn(
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
        <TextQuote className="h-4 w-4" />,
        "Quote"
      )}
      {btn(
        editor.isActive("codeBlock"),
        () => editor.chain().focus().toggleCodeBlock().run(),
        <CodeSquare className="h-4 w-4" />,
        "Code block"
      )}
      {btn(
        false,
        () => editor.chain().focus().setHorizontalRule().run(),
        <Minus className="h-4 w-4" />,
        "Divider"
      )}
      {btn(
        editor.isActive("table"),
        () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        <Table2 className="h-4 w-4" />,
        "Insert table"
      )}

      {onAttach && (
        <>
          <Separator orientation="vertical" className="mx-1 h-6" />
          {btn(
            false,
            onAttach,
            <Paperclip className="h-4 w-4" />,
            "Attach file"
          )}
        </>
      )}
    </div>
  );
};

// --- Editor component ---

type NoteEditorProps = {
  note: Note;
  onBack: () => void;
};

const NoteEditor = ({ note, onBack }: NoteEditorProps) => {
  const navigate = useNavigate();
  const { notes: allNotesMap, updateNote, deleteNote } = useNotesSlice();
  const { mask } = useMaskSlice();
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState<string[]>(note.tags ?? []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>(note.attachments ?? []);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const allTags = [...new Set(Object.values(allNotesMap).flat().flatMap((n) => n.tags ?? []))];
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  // Tracks the `updatedAt` we last reflected in the editor — lets us detect
  // remote/background updates (different value, no pending local save) and
  // re-seed the editor without clobbering a user mid-typing.
  const lastAppliedUpdatedAtRef = useRef<string>(note.updatedAt);
  // Bumping this remounts <EditorContent> so it picks up the new note.content
  // via `initialContent`. We only bump it for *remote* updates; local saves
  // bypass it so the user's cursor and in-flight edits aren't disturbed.
  const [editorKey, setEditorKey] = useState(0);

  // Access level is computed server-side and attached to the note via the
  // unified sync endpoint. Fall back to checking ownership directly.
  const myUserId = useAuthSlice((s) => s.user?.id);
  const accessLevel: ShareAccessLevel =
    (note as SyncNote).accessLevel ?? (note.userId === myUserId ? "owner" : "none");

  const isNoteOwner = note.userId === myUserId;
  const canEdit = accessLevel === "owner" || accessLevel === "readwrite";
  const canDeleteNote = isNoteOwner;
  const canMoveNote = isNoteOwner;
  const canShareNote = isNoteOwner;

  const initialContent = note.content ? tryParseJSON(note.content) : undefined;

  const saveContent = useCallback(
    (json: JSONContent, text: string) => {
      if (!canEdit) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        updateNote(note.id, note.notebookId, {
          content: JSON.stringify(json),
          textContent: text,
        })
          .pipe(take(1))
          .subscribe({
            next: (saved) => {
              lastAppliedUpdatedAtRef.current = saved.updatedAt;
            },
            error: () => useAlertSlice.getState().errorAlert("Failed to save note content"),
          });
      }, 1500);
    },
    [note.id, note.notebookId, updateNote, canEdit]
  );

  const saveTitle = useCallback(
    (newTitle: string) => {
      if (!canEdit) return;
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
      titleTimerRef.current = setTimeout(() => {
        titleTimerRef.current = null;
        updateNote(note.id, note.notebookId, { title: newTitle })
          .pipe(take(1))
          .subscribe({
            next: (saved) => {
              lastAppliedUpdatedAtRef.current = saved.updatedAt;
            },
            error: () => useAlertSlice.getState().errorAlert("Failed to save note title"),
          });
      }, 1500);
    },
    [note.id, note.notebookId, updateNote, canEdit]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    };
  }, []);

  // Prevent mobile keyboard from opening when tapping task item checkboxes.
  // Tiptap's built-in change handler calls editor.focus() which opens the
  // keyboard on mobile. We intercept the change event in the capturing phase
  // (before it reaches Tiptap's listener on the checkbox element) and toggle
  // the checked state ourselves without focusing.
  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    const handleCheckboxChange = (event: Event) => {
      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) ||
        target.type !== "checkbox" ||
        !target.closest('[data-type="taskItem"]')
      ) {
        return;
      }

      event.stopPropagation();

      const editor = editorRef.current;
      if (!editor?.isEditable) return;

      const checked = target.checked;
      const view = editor.view;
      const taskItemEl = target.closest('[data-type="taskItem"]')!;

      try {
        const pos = view.posAtDOM(taskItemEl, 0);
        const $pos = view.state.doc.resolve(pos);
        for (let d = $pos.depth; d >= 0; d--) {
          const node = $pos.node(d);
          if (node.type.name === "taskItem") {
            view.dispatch(
              view.state.tr.setNodeMarkup($pos.before(d), undefined, {
                ...node.attrs,
                checked,
              })
            );
            break;
          }
        }
      } catch {
        // Fall through — let Tiptap handle it normally if position lookup fails
      }
    };

    wrapper.addEventListener("change", handleCheckboxChange, true);
    return () => wrapper.removeEventListener("change", handleCheckboxChange, true);
  }, []);

  // Sync title/tags/content from a remote update (WebSocket-driven resync,
  // poll, or visibility change). Skip if the user has a local save in flight
  // — their pending edit will land shortly and bring `updatedAt` along.
  useEffect(() => {
    if (note.updatedAt === lastAppliedUpdatedAtRef.current) return;
    if (saveTimerRef.current || titleTimerRef.current) return;

    setTitle(note.title);
    setTags(note.tags ?? []);
    setAttachments(note.attachments ?? []);
    // Force EditorContent to remount with fresh `initialContent`. Cleaner
    // than imperative setContent, which has been unreliable across novel +
    // Tiptap version mixes and silently no-ops when the editor instance
    // hasn't fired `onCreate` yet.
    setEditorKey((k) => k + 1);
    lastAppliedUpdatedAtRef.current = note.updatedAt;
  }, [note.updatedAt, note.title, note.content, note.tags, note.attachments]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    saveTitle(newTitle);
  };

  const handleDelete = () => {
    const unmask = mask("Deleting note...");
    deleteNote(note.id, note.notebookId).pipe(take(1)).subscribe({
      complete: () => {
        unmask();
        onBack();
      },
      error: () => {
        unmask();
      },
    });
  };

  const handleMove = (targetNotebookId: string) => {
    const unmask = mask("Moving note...");
    updateNote(note.id, note.notebookId, { notebookId: targetNotebookId })
      .pipe(take(1))
      .subscribe({
        complete: () => {
          unmask();
          setShowMoveDialog(false);
          onBack();
        },
        error: () => {
          unmask();
          setShowMoveDialog(false);
        },
      });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b">
        <div className={`flex items-center gap-3 px-4 pt-3 ${tags.length > 0 ? "pb-1.5" : "pb-3"}`}>
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            readOnly={!canEdit}
            className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
            placeholder="Untitled"
          />
          {(canEdit || canShareNote || canDeleteNote || canMoveNote) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canMoveNote && (
                  <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
                    <FolderInput className="h-4 w-4" />
                    Move to...
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <DropdownMenuItem onClick={() => setShowTagsDialog(true)}>
                    <Tag className="h-4 w-4" />
                    Tags...
                  </DropdownMenuItem>
                )}
                {canShareNote && (
                  <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                    <Share2 className="h-4 w-4" />
                    Share...
                  </DropdownMenuItem>
                )}
                {canDeleteNote && (
                  <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-3 pl-[64px] pr-4">
            {tags.map((tag) => (
              <TagBadge key={tag} tag={tag} onClick={(t) => navigate(`/tags/${encodeURIComponent(t)}`)} />
            ))}
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <AttachmentList
          noteId={note.id}
          attachments={attachments}
          canEdit={canEdit}
          onAttachmentsChange={setAttachments}
        />
      )}

      <MoveNoteDialog
        open={showMoveDialog}
        note={note}
        onMove={handleMove}
        onCancel={() => setShowMoveDialog(false)}
      />

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        title="Delete Note"
        message={`Are you sure you want to delete "${title}"? You can restore it from Trash.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <TagsDialog
        open={showTagsDialog}
        note={{ ...note, tags }}
        allTags={allTags}
        onSave={(newTags) => {
          const unmask = mask("Saving tags...");
          updateNote(note.id, note.notebookId, { tags: newTags })
            .pipe(take(1))
            .subscribe({
              complete: () => {
                unmask();
                setTags(newTags);
                setShowTagsDialog(false);
              },
              error: () => {
                unmask();
                setShowTagsDialog(false);
              },
            });
        }}
        onCancel={() => setShowTagsDialog(false)}
      />

      {showShareDialog && (
        <ShareDialog
          open={true}
          resourceType="note"
          resourceId={note.id}
          resourceName={title || "Untitled"}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {showUploadDialog && (
        <AttachmentUploadDialog
          open={true}
          noteId={note.id}
          onClose={() => setShowUploadDialog(false)}
          onUploaded={(updatedNote) => {
            setAttachments(updatedNote.attachments ?? []);
            setShowUploadDialog(false);
          }}
        />
      )}

      <div ref={editorWrapperRef} className="flex flex-1 flex-col overflow-hidden">
      <EditorRoot>
        <EditorContent
          key={editorKey}
          initialContent={initialContent}
          extensions={extensions}
          editable={canEdit}
          className="relative flex w-full flex-1 flex-col overflow-hidden"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            transformPastedHTML(html) {
              return html.replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1");
            },
            attributes: {
              class: "novel-editor focus:outline-none p-6",
            },
          }}
          onCreate={({ editor }) => {
            editorRef.current = editor as EditorInstance;
          }}
          onUpdate={({ editor }) => {
            const json = editor.getJSON();
            const text = editor.getText();
            saveContent(json, text);
          }}
          slotBefore={canEdit ? <EditorToolbar onAttach={() => setShowUploadDialog(true)} /> : null}
        >
            <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
              <EditorCommandEmpty className="px-2 text-muted-foreground">
                No results
              </EditorCommandEmpty>
              <EditorCommandList>
                {suggestionItems.map((item) => (
                  <EditorCommandItem
                    value={item.title}
                    onCommand={(val) => item.command?.(val)}
                    className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                    key={item.title}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </EditorCommandItem>
                ))}
              </EditorCommandList>
            </EditorCommand>

            <EditorBubble
              tippyOptions={{
                placement: "bottom",
                appendTo: "parent",
              }}
              className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-background shadow-xl"
            >
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleBold().run()}
              >
                <Button variant="ghost" size="sm" className="rounded-none" type="button">
                  <Bold className="h-4 w-4" />
                </Button>
              </EditorBubbleItem>
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleItalic().run()}
              >
                <Button variant="ghost" size="sm" className="rounded-none" type="button">
                  <Italic className="h-4 w-4" />
                </Button>
              </EditorBubbleItem>
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleUnderline().run()}
              >
                <Button variant="ghost" size="sm" className="rounded-none" type="button">
                  <Underline className="h-4 w-4" />
                </Button>
              </EditorBubbleItem>
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleStrike().run()}
              >
                <Button variant="ghost" size="sm" className="rounded-none" type="button">
                  <Strikethrough className="h-4 w-4" />
                </Button>
              </EditorBubbleItem>
              <EditorBubbleItem
                onSelect={(editor) => editor.chain().focus().toggleCode().run()}
              >
                <Button variant="ghost" size="sm" className="rounded-none" type="button">
                  <Code className="h-4 w-4" />
                </Button>
              </EditorBubbleItem>
              <Separator orientation="vertical" className="h-6" />
              <LinkPopoverButton className="rounded-none" />
            </EditorBubble>

            {canEdit && <TableBubbleMenu />}
            {canEdit && <LinkBubbleMenu />}
        </EditorContent>
      </EditorRoot>
      </div>
    </div>
  );
};

function tryParseJSON(str: string): JSONContent | undefined {
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === "object" && parsed.type) {
      return parsed as JSONContent;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export default NoteEditor;
