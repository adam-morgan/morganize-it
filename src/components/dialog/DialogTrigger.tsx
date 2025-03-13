import { ReactNode, useState } from "react";
import Dialog, { DialogProps } from "./Dialog";

type DialogTriggerProps = {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description?: string;
  content?: ReactNode;
  size?: DialogProps["size"];
  actions?: {
    label: string;
    onClick?: () => void | Promise<void>;
    disabled?: boolean;
  }[];
  onOpen?: () => void;
  onClose?: () => void;
};

const DialogTrigger = (props: DialogTriggerProps) => {
  const [open, setOpen] = useState(false);

  const actions = props.actions?.map((action) => ({
    ...action,
    onClick: async () => {
      await action.onClick?.();
      setOpen(false);
      props.onClose?.();
    },
  }));

  return (
    <>
      {props.trigger(() => {
        setOpen(true);
        props.onOpen?.();
      })}
      <Dialog open={open} {...props} actions={actions} />
    </>
  );
};

export default DialogTrigger;
