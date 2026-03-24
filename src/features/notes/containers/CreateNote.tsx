import { DialogTrigger } from "@/components/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReactNode, useState } from "react";
import { useNotesSlice } from "../notesSlice";
import { take } from "rxjs";
import { useMaskSlice } from "@/features/app";
import { useNavigate } from "react-router-dom";

type CreateNoteProps = {
  notebookId: string;
  trigger: (open: () => void) => ReactNode;
};

const CreateNote = ({ notebookId, trigger }: CreateNoteProps) => {
  const [title, setTitle] = useState("");
  const { mask } = useMaskSlice();
  const { createNote } = useNotesSlice();
  const navigate = useNavigate();

  return (
    <DialogTrigger
      title="Create Note"
      content={
        <div className="flex flex-col gap-2 pt-2">
          <Label htmlFor="note-title">Note Title</Label>
          <Input
            autoFocus
            required
            name="title"
            id="note-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      }
      size="xs"
      actions={[
        {
          label: "Create",
          disabled: !Boolean(title?.trim()),
          onClick: () => {
            const unmask = mask("Creating note...");
            createNote(notebookId, title.trim()).pipe(take(1)).subscribe({
              next: (note) => {
                unmask();
                navigate(`/notebooks/${notebookId}/notes/${note.id}`);
              },
              error: unmask,
            });
          },
        },
        { label: "Cancel" },
      ]}
      trigger={trigger}
      onOpen={() => setTitle("")}
    />
  );
};

export default CreateNote;
