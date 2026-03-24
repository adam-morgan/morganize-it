import Prompt from "@/components/dialog/Prompt";

type DeleteConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const DeleteConfirmDialog = ({ open, title, message, onConfirm, onCancel }: DeleteConfirmDialogProps) => {
  return (
    <Prompt
      open={open}
      title={title}
      promptText={message}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

export default DeleteConfirmDialog;
