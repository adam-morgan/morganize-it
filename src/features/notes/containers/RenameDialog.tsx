import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

type RenameDialogProps = {
  open: boolean;
  currentName: string;
  label: string;
  onRename: (newName: string) => void;
  onCancel: () => void;
};

const RenameDialog = ({ open, currentName, label, onRename, onCancel }: RenameDialogProps) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rename</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Label>{label}</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onRename(name.trim());
              }
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!name.trim() || name.trim() === currentName}
            onClick={() => onRename(name.trim())}
          >
            Rename
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RenameDialog;
