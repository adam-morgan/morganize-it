import Dialog from "./Dialog";

type PromptProps = {
  open: boolean;
  title: string;
  promptText: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

const Prompt = (props: PromptProps) => {
  return (
    <Dialog
      open={props.open}
      title={props.title}
      description={props.promptText}
      actions={[
        { label: "Yes", onClick: props.onConfirm },
        { label: "No", onClick: props.onCancel ?? (() => {}) },
      ]}
    />
  );
};

export default Prompt;
