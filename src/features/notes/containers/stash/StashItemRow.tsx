import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StashAction = {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
};

type StashItemRowProps = {
  title: React.ReactNode;
  subtitle: string;
  actions: StashAction[];
  onClick?: () => void;
};

const StashItemRow = ({ title, subtitle, actions, onClick }: StashItemRowProps) => (
  <div
    className={cn(
      "flex items-center justify-between rounded-md border px-4 py-3",
      onClick && "cursor-pointer transition-colors hover:bg-accent/50"
    )}
    onClick={onClick}
  >
    <div className="min-w-0">
      <p className="truncate font-medium">{title}</p>
      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
    </div>
    <div className="flex shrink-0 items-center gap-1">
      {actions.map(({ title: actionTitle, icon: Icon, onClick: onAction, destructive }) => (
        <Button
          key={actionTitle}
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 cursor-pointer", destructive && "text-destructive hover:text-destructive")}
          title={actionTitle}
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  </div>
);

export default StashItemRow;
