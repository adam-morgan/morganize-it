import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  friend: Friend | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmRemoveFriendDialog = ({ friend, onConfirm, onCancel }: Props) => {
  return (
    <AlertDialog open={friend != null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Friend</AlertDialogTitle>
          <AlertDialogDescription>
            Remove <strong>{friend?.name}</strong> from your friends? Any notebooks or notes
            shared between you will be revoked immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmRemoveFriendDialog;
