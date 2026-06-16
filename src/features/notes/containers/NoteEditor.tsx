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
  TextStyle,
  Color,
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
import { Markdown } from "tiptap-markdown";
import { Extension } from "@tiptap/core";
import { DOMParser as PMDOMParser, DOMSerializer as PMDOMSerializer } from "@tiptap/pm/model";
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
  Palette,
  Ban,
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

const CopyAsMarkdown = Extension.create({
  name: "copyAsMarkdown",
  addKeyboardShortcuts() {
    return {
      "Mod-Alt-c": () => {
        const { editor } = this;
        const serializer = editor.storage?.markdown?.serializer;
        if (!serializer) return false;

        const { view } = editor;
        const { from, to, empty } = view.state.selection;
        if (empty) return false;

        const slice = view.state.doc.slice(from, to);
        const docNode = view.state.schema.topNodeType.create(null, slice.content);
        const markdown = serializer.serialize(docNode);
        if (typeof markdown !== "string") return false;

        const fragment = PMDOMSerializer.fromSchema(view.state.schema)
          .serializeFragment(slice.content);
        const wrapper = document.createElement("div");
        wrapper.appendChild(fragment);
        const html = wrapper.innerHTML;

        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          void navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": new Blob([markdown], { type: "text/plain" }),
              "text/html": new Blob([html], { type: "text/html" }),
            }),
          ]);
        } else if (navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(markdown);
        } else {
          return false;
        }

        return true;
      },
    };
  },
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
  TextStyle,
  Color,
  CustomKeymap,
  slashCommand,
  Table.configure({
    resizable: false,
    HTMLAttributes: { class: "novel-table" },
  }),
  TableRow,
  TableCell,
  TableHeader,
  Markdown.configure({
    html: false,
    tightLists: true,
    bulletListMarker: "-",
    linkify: true,
    breaks: false,
    transformPastedText: true,
    transformCopiedText: false,
  }),
  CopyAsMarkdown,
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

// --- Color popover button (text color + highlight, shared by toolbar + bubble menu) ---

type Preset = { name: string; value: string | null };

const PRESET_TEXT_COLORS: Preset[] = [
  { name: "Default", value: null },
  { name: "Red", value: "#e53935" },
  { name: "Orange", value: "#fb8c00" },
  { name: "Yellow", value: "#fdd835" },
  { name: "Green", value: "#43a047" },
  { name: "Blue", value: "#1e88e5" },
  { name: "Purple", value: "#8e24aa" },
  { name: "Black", value: "#1f2937" },
  { name: "Gray", value: "#757575" },
];

const PRESET_HIGHLIGHT_COLORS: Preset[] = [
  { name: "None", value: null },
  { name: "Red", value: "#ff0000" },
  { name: "Orange", value: "#fb8c00" },
  { name: "Yellow", value: "#fdd835" },
  { name: "Green", value: "#43a047" },
  { name: "Blue", value: "#1e88e5" },
  { name: "Purple", value: "#8e24aa" },
  { name: "Black", value: "#1f2937" },
  { name: "Gray", value: "#757575" },
];

type ColorPreset = { name: string; highlight: string | null; text: string | null };

// Highlight backgrounds mirror PRESET_HIGHLIGHT_COLORS; each text color is chosen for
// WCAG AA contrast (>=4.5:1) against its highlight. Light backgrounds -> black text,
// dark backgrounds -> white text. Pure #000/#fff are used (not the #1f2937 text preset,
// which fails AA on red/blue).
const PRESET_COMBOS: ColorPreset[] = [
  { name: "None", highlight: null, text: null }, // clears both
  { name: "Red", highlight: "#ff0000", text: "#000000" }, // 5.25:1
  { name: "Orange", highlight: "#fb8c00", text: "#000000" }, // 8.84:1
  { name: "Yellow", highlight: "#fdd835", text: "#000000" }, // 15.0:1
  { name: "Green", highlight: "#43a047", text: "#000000" }, // 6.35:1
  { name: "Blue", highlight: "#1e88e5", text: "#000000" }, // 5.70:1
  { name: "Purple", highlight: "#8e24aa", text: "#ffffff" }, // 7.04:1
  { name: "Black", highlight: "#1f2937", text: "#ffffff" }, // 14.7:1
  { name: "Gray", highlight: "#757575", text: "#ffffff" }, // 4.6:1
];

const ColorSwatchGrid = ({
  presets,
  current,
  onPick,
  kind,
}: {
  presets: Preset[];
  current: string | null;
  onPick: (color: string | null) => void;
  kind: "text" | "highlight";
}) => {
  const normalize = (v: string | null) => (v ? v.toLowerCase() : null);
  const currentNorm = normalize(current);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1">
        {presets.map((p, i) => {
          const isCurrent = normalize(p.value) === currentNorm;
          const isClear = p.value === null;
          return (
            <button
              key={i}
              type="button"
              title={p.name}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(p.value)}
              className={`flex h-8 cursor-pointer items-center justify-center gap-1 rounded border text-xs ${isCurrent ? "ring-2 ring-primary" : ""}`}
              style={
                isClear
                  ? undefined
                  : kind === "text"
                    ? { color: p.value ?? undefined }
                    : { backgroundColor: p.value ?? undefined }
              }
            >
              {isClear ? <Ban className="h-3.5 w-3.5" /> : kind === "text" ? "A" : <span className="px-1">A</span>}
            </button>
          );
        })}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="color"
          value={current ?? "#000000"}
          onChange={(e) => onPick(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border bg-transparent p-0"
          onMouseDown={(e) => e.stopPropagation()}
        />
        <span>Custom…</span>
      </label>
    </div>
  );
};

const PresetSwatchGrid = ({
  presets,
  currentText,
  currentHighlight,
  onPick,
}: {
  presets: ColorPreset[];
  currentText: string | null;
  currentHighlight: string | null;
  onPick: (preset: ColorPreset) => void;
}) => {
  const normalize = (v: string | null) => (v ? v.toLowerCase() : null);
  const textNorm = normalize(currentText);
  const highlightNorm = normalize(currentHighlight);

  return (
    <div className="grid grid-cols-3 gap-1">
      {presets.map((p, i) => {
        const isCurrent = normalize(p.highlight) === highlightNorm && normalize(p.text) === textNorm;
        const isClear = p.highlight === null && p.text === null;

        return (
          <button
            key={i}
            type="button"
            title={p.name}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(p)}
            className={`flex h-8 cursor-pointer items-center justify-center gap-1 rounded border text-xs ${isCurrent ? "ring-2 ring-primary" : ""}`}
            style={isClear ? undefined : { backgroundColor: p.highlight ?? undefined, color: p.text ?? undefined }}
          >
            {isClear ? <Ban className="h-3.5 w-3.5" /> : <span className="px-1 font-medium">A</span>}
          </button>
        );
      })}
    </div>
  );
};

const ColorPopoverButton = ({ className }: { className?: string }) => {
  const { editor } = useEditor();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"presets" | "text" | "highlight">("presets");

  if (!editor) return null;

  const currentTextColor: string | null = editor.getAttributes("textStyle").color ?? null;
  const currentHighlight: string | null = editor.getAttributes("highlight").color ?? null;
  const hasAny = Boolean(currentTextColor || currentHighlight);

  const normalize = (v: string | null) => (v ? v.toLowerCase() : null);

  const matchedPreset = PRESET_COMBOS.find(
    (p) =>
      normalize(p.highlight) === normalize(currentHighlight) && normalize(p.text) === normalize(currentTextColor),
  );

  // Default to Presets when nothing is set (matches the None preset) or the current
  // text+highlight pair is a known preset; otherwise fall back to whichever single
  // attribute is set (highlight wins when both are set but the pair isn't a preset).
  const computeDefaultTab = (): "presets" | "text" | "highlight" => {
    if (matchedPreset) return "presets";

    return currentHighlight ? "highlight" : "text";
  };

  const applyText = (color: string | null) => {
    if (color === null) editor.chain().focus().unsetColor().run();
    else editor.chain().focus().setColor(color).run();
  };

  const applyHighlight = (color: string | null) => {
    if (color === null) editor.chain().focus().unsetHighlight().run();
    else editor.chain().focus().setHighlight({ color }).run();
  };

  const applyPreset = (p: ColorPreset) => {
    let chain = editor.chain().focus();

    chain = p.highlight === null ? chain.unsetHighlight() : chain.setHighlight({ color: p.highlight });
    chain = p.text === null ? chain.unsetColor() : chain.setColor(p.text);

    chain.run();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setTab(computeDefaultTab());
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className={`h-8 w-8 cursor-pointer p-0 ${hasAny ? "bg-accent" : ""} ${className ?? ""}`}
          title="Color"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-2"
        side="bottom"
        align="start"
        onFocusOutside={(e) => e.preventDefault()}
      >
        <div className="mb-2 flex gap-1 border-b">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTab("presets")}
            className={`cursor-pointer px-3 py-1 text-sm ${tab === "presets" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          >
            Presets
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTab("text")}
            className={`cursor-pointer px-3 py-1 text-sm ${tab === "text" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          >
            Text
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setTab("highlight")}
            className={`cursor-pointer px-3 py-1 text-sm ${tab === "highlight" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          >
            Highlight
          </button>
        </div>
        {tab === "presets" ? (
          <PresetSwatchGrid
            presets={PRESET_COMBOS}
            currentText={currentTextColor}
            currentHighlight={currentHighlight}
            onPick={applyPreset}
          />
        ) : tab === "text" ? (
          <ColorSwatchGrid
            presets={PRESET_TEXT_COLORS}
            current={currentTextColor}
            onPick={applyText}
            kind="text"
          />
        ) : (
          <ColorSwatchGrid
            presets={PRESET_HIGHLIGHT_COLORS}
            current={currentHighlight}
            onPick={applyHighlight}
            kind="highlight"
          />
        )}
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
      <ColorPopoverButton />

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
            handlePaste: (view, event) => {
              const editor = editorRef.current;
              const parser = editor?.storage?.markdown?.parser;
              if (!editor || !parser) return false;

              const clipboard = (event as ClipboardEvent).clipboardData;
              if (!clipboard) return false;

              const shiftHeld = (view as unknown as { input?: { shiftKey?: boolean } })
                .input?.shiftKey;
              if (shiftHeld) return false;

              const text = clipboard.getData("text/plain");
              if (!text) return false;

              const looksLikeMarkdown =
                /^#{1,6} \S/m.test(text) ||
                /^\s*[-*+] \S/m.test(text) ||
                /^\s*\d+\.\s+\S/m.test(text) ||
                /^\s*[-*+] \[[ xX]\]\s/m.test(text) ||
                /^>\s+\S/m.test(text) ||
                /^```/m.test(text) ||
                /\*\*[^*\n]+\*\*/.test(text) ||
                /__[^_\n]+__/.test(text) ||
                /~~[^~\n]+~~/.test(text) ||
                /`[^`\n]+`/.test(text) ||
                /\[[^\]\n]+\]\([^)\n]+\)/.test(text);

              if (!looksLikeMarkdown) return false;

              const parsedHtml = parser.parse(text);
              if (typeof parsedHtml !== "string" || !parsedHtml) return false;

              const wrapper = document.createElement("div");
              wrapper.innerHTML = parsedHtml;
              const slice = PMDOMParser.fromSchema(view.state.schema).parseSlice(
                wrapper,
                { preserveWhitespace: true },
              );
              view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
              return true;
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
              <ColorPopoverButton className="rounded-none" />
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
