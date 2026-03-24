import { ReactNode } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DrawerProps = {
  width?: string;
  open?: boolean;
  variant?: "permanent" | "persistent" | "temporary";
  onClose?: () => void;
  children: ReactNode;
};

const Drawer = ({
  width = "240px",
  open = true,
  variant = "permanent",
  onClose,
  children,
}: DrawerProps) => {
  if (variant === "temporary") {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
        <SheetContent side="left" className="w-[240px] p-0">
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-225",
        open ? "translate-x-0" : "-translate-x-full"
      )}
      style={{ width }}
    >
      {children}
    </aside>
  );
};

export default Drawer;
