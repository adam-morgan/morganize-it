import { DialogTrigger } from "@/components/dialog";
import { TextField } from "@mui/material";
import { ReactNode, useState } from "react";
import { useNotebooksSlice } from "../notebooksSlice";
import { take } from "rxjs";

type CreateNotebookButtonProps = {
  trigger: (open: () => void) => ReactNode;
};

const CreateNotebook = ({ trigger }: CreateNotebookButtonProps) => {
  const [name, setName] = useState("");
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
            createNotebook(name).pipe(take(1)).subscribe();
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
