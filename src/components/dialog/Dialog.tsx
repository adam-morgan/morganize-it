import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogProps as MatDialogProps,
  DialogTitle,
  Dialog as MatDialog,
} from "@mui/material";
import { ReactNode } from "react";

export type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  content?: ReactNode;
  size?: MatDialogProps["maxWidth"];
  actions?: {
    label: string;
    onClick: () => void | Promise<void>;
    disabled?: boolean;
  }[];
};

const Dialog = (props: DialogProps) => {
  return (
    <MatDialog open={props.open} fullWidth maxWidth={props.size ?? "sm"}>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        {props.description && <DialogContentText>{props.description}</DialogContentText>}
        {props.content}
      </DialogContent>
      {props.actions?.length && (
        <DialogActions>
          {props.actions.map((action, index) => (
            <Button key={index} disabled={action.disabled === true} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </DialogActions>
      )}
    </MatDialog>
  );
};

export default Dialog;
