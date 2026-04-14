import { BubbleMenu } from "@tiptap/react";
import { useEditor } from "novel";
import {
  Plus,
  Minus,
  Rows3,
  Columns3,
  PanelTop,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const TableBubbleMenu = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  const btn = (onClick: () => void, icon: React.ReactNode, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className="h-8 w-8 p-0"
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
        placement: "top",
        appendTo: "parent",
      }}
      shouldShow={({ editor }) => editor.isActive("table")}
    >
      <div className="flex max-w-[90vw] items-center overflow-x-auto rounded-md border border-muted bg-background shadow-xl">
        <div className="flex items-center gap-0.5 px-1" title="Rows">
          <Rows3 className="ml-1 h-3 w-3 text-muted-foreground" />
          {btn(
            () => editor.chain().focus().addRowAfter().run(),
            <Plus className="h-4 w-4" />,
            "Add row"
          )}
          {btn(
            () => editor.chain().focus().deleteRow().run(),
            <Minus className="h-4 w-4" />,
            "Delete row"
          )}
        </div>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <div className="flex items-center gap-0.5 px-1" title="Columns">
          <Columns3 className="ml-1 h-3 w-3 text-muted-foreground" />
          {btn(
            () => editor.chain().focus().addColumnAfter().run(),
            <Plus className="h-4 w-4" />,
            "Add column"
          )}
          {btn(
            () => editor.chain().focus().deleteColumn().run(),
            <Minus className="h-4 w-4" />,
            "Delete column"
          )}
        </div>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {btn(
          () => editor.chain().focus().toggleHeaderRow().run(),
          <PanelTop className="h-4 w-4" />,
          "Toggle header row"
        )}

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {btn(
          () => editor.chain().focus().deleteTable().run(),
          <Trash2 className="h-4 w-4 text-destructive" />,
          "Delete table"
        )}
      </div>
    </BubbleMenu>
  );
};

export default TableBubbleMenu;
