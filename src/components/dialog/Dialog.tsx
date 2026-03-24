import {
  Dialog as ShadDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

export type DialogSize = "xs" | "sm" | "md" | "lg" | "xl";

export type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  content?: ReactNode;
  size?: DialogSize;
  actions?: {
    label: string;
    onClick: () => void | Promise<void>;
    disabled?: boolean;
  }[];
};

const sizeClasses: Record<DialogSize, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

const Dialog = (props: DialogProps) => {
  return (
    <ShadDialog open={props.open}>
      <DialogContent className={sizeClasses[props.size ?? "sm"]}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </DialogHeader>
        {props.content}
        {props.actions?.length && (
          <DialogFooter>
            {props.actions.map((action, index) => (
              <Button
                key={index}
                variant={index === 0 ? "default" : "outline"}
                disabled={action.disabled === true}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </DialogFooter>
        )}
      </DialogContent>
    </ShadDialog>
  );
};

export default Dialog;
