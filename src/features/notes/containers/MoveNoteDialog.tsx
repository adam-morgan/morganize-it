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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useNotebooksSlice } from "../notebooksSlice";

type MoveNoteDialogProps = {
  open: boolean;
  note: Note | null;
  onMove: (targetNotebookId: string) => void;
  onCancel: () => void;
};

const MoveNoteDialog = ({ open, note, onMove, onCancel }: MoveNoteDialogProps) => {
  const [targetNotebookId, setTargetNotebookId] = useState("");
  const { notebooks } = useNotebooksSlice();

  const otherNotebooks = notebooks.filter((nb) => nb.id !== note?.notebookId);

  useEffect(() => {
    if (open) setTargetNotebookId("");
  }, [open]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move Note</AlertDialogTitle>
          <AlertDialogDescription>
            Move &quot;{note?.title}&quot; to another notebook
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Label>Destination Notebook</Label>
          <Select value={targetNotebookId} onValueChange={setTargetNotebookId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a notebook" />
            </SelectTrigger>
            <SelectContent>
              {otherNotebooks.map((nb) => (
                <SelectItem key={nb.id} value={nb.id}>
                  {nb.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!targetNotebookId}
            onClick={() => onMove(targetNotebookId)}
          >
            Move
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MoveNoteDialog;
