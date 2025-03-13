import { ReactNode, useState } from "react";
import Prompt from "./Prompt";

type PromptTriggerProps = {
  trigger: (open: () => void) => ReactNode;
  title: string;
  promptText: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

const DialogTrigger = (props: PromptTriggerProps) => {
  const [open, setOpen] = useState(false);

  const onConfirm = () => {
    props.onConfirm();
    setOpen(false);
  };

  const onCancel = () => {
    props.onCancel?.();
    setOpen(false);
  };

  return (
    <>
      {props.trigger(() => setOpen(true))}
      <Prompt open={open} {...props} onConfirm={onConfirm} onCancel={onCancel} />
    </>
  );
};

export default DialogTrigger;
