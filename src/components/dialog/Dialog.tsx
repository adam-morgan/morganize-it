import {
  Dialog as ShadDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KeyboardEvent, ReactNode } from "react";

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
  const actions = props.actions;
  const primaryAction = actions?.[actions.length - 1];

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }
    if (!primaryAction || primaryAction.disabled) return;
    e.preventDefault();
    primaryAction.onClick();
  };

  return (
    <ShadDialog open={props.open}>
      <DialogContent
        className={sizeClasses[props.size ?? "sm"]}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </DialogHeader>
        {props.content}
        {actions?.length && (
          <DialogFooter>
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={index === actions.length - 1 ? "default" : "outline"}
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
