import { DialogTrigger } from "@/components/dialog";
import { TextField } from "@mui/material";
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
        <TextField
          autoFocus
          required
          margin="dense"
          name="name"
          label="Notebook Name"
          type="text"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
