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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  TiptapLink,
  HorizontalRule,
  TaskList,
  TaskItem.configure({ nested: true }),
  TiptapUnderline,
  HighlightExtension,
  CustomKeymap,
  slashCommand,
];

// --- Formatting toolbar (works on mobile + desktop) ---

const EditorToolbar = () => {
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
  const allTags = [...new Set(Object.values(allNotesMap).flat().flatMap((n) => n.tags ?? []))];
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialContent = note.content ? tryParseJSON(note.content) : undefined;

  const saveContent = useCallback(
    (json: JSONContent, text: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateNote(note.id, note.notebookId, {
          content: JSON.stringify(json),
          textContent: text,
        })
          .pipe(take(1))
          .subscribe({
            error: () => useAlertSlice.getState().errorAlert("Failed to save note content"),
          });
      }, 1500);
    },
    [note.id, note.notebookId, updateNote]
  );

  const saveTitle = useCallback(
    (newTitle: string) => {
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
      titleTimerRef.current = setTimeout(() => {
        updateNote(note.id, note.notebookId, { title: newTitle })
          .pipe(take(1))
          .subscribe({
            error: () => useAlertSlice.getState().errorAlert("Failed to save note title"),
          });
      }, 1500);
    },
    [note.id, note.notebookId, updateNote]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    };
  }, []);

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
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
          placeholder="Untitled"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
              <FolderInput className="h-4 w-4" />
              Move to...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowTagsDialog(true)}>
              <Tag className="h-4 w-4" />
              Tags...
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b px-4 py-2">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} onClick={(t) => navigate(`/tags/${encodeURIComponent(t)}`)} />
          ))}
        </div>
      )}

      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className="relative flex w-full flex-1 flex-col overflow-hidden"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            attributes: {
              class: "novel-editor focus:outline-none p-6",
            },
          }}
          onUpdate={({ editor }) => {
            const json = editor.getJSON();
            const text = editor.getText();
            saveContent(json, text);
          }}
          slotBefore={<EditorToolbar />}
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
            </EditorBubble>
        </EditorContent>
      </EditorRoot>
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
