import { ReactNode, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MenuItem = {
  label: string;
  onClick: () => void;
};

type WithMenuProps = {
  items: MenuItem[];
  children: ReactNode;
};

const WithMenu = (props: WithMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">{props.children}</div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {props.items.map((item, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => {
              item.onClick();
              setOpen(false);
            }}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WithMenu;
