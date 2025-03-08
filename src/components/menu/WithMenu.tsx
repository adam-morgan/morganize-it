import { ReactNode, useState } from "react";
import { Menu as MuiMenu, MenuItem as MuiMenuItem } from "@mui/material";

import styles from "./WithMenu.module.css";

type MenuItem = {
  label: string;
  onClick: () => void;
};

type WithMenuProps = {
  items: MenuItem[];
  children: ReactNode;
};

const WithMenu = (props: WithMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <div className={styles.wrapper} onClick={(e) => setAnchorEl(e.currentTarget)}>
        {props.children}
      </div>
      <MuiMenu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {props.items.map((item, index) => (
          <MuiMenuItem
            key={index}
            onClick={() => {
              item.onClick();
              setAnchorEl(null);
            }}
          >
            {item.label}
          </MuiMenuItem>
        ))}
      </MuiMenu>
    </>
  );
};

export default WithMenu;
