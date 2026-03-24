import { DialogTrigger } from "@/components/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReactNode, useState } from "react";
import { useNotebooksSlice } from "../notebooksSlice";
import { take } from "rxjs";
import { useMaskSlice } from "@/features/app";

type CreateNotebookButtonProps = {
  trigger: (open: () => void) => ReactNode;
};

const CreateNotebook = ({ trigger }: CreateNotebookButtonProps) => {
  const [name, setName] = useState("");
  const { mask } = useMaskSlice();
  const { createNotebook } = useNotebooksSlice();

  return (
    <DialogTrigger
      title="Create Notebook"
      content={
        <div className="flex flex-col gap-2 pt-2">
          <Label htmlFor="notebook-name">Notebook Name</Label>
          <Input
            autoFocus
            required
            name="name"
            id="notebook-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      }
      size="xs"
      actions={[
        {
          label: "Create",
          disabled: !Boolean(name?.trim()),
          onClick: () => {
            const unmask = mask("Creating notebook...");
            createNotebook(name).pipe(take(1)).subscribe({
              complete: unmask,
              error: unmask,
            });
          },
        },
        { label: "Cancel" },
      ]}
      trigger={trigger}
      onOpen={() => setName("")}
    ></DialogTrigger>
  );
};

export default CreateNotebook;
