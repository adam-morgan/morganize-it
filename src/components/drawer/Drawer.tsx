import { ReactNode } from "react";
import { Box, Drawer as MuiDrawer } from "@mui/material";

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
  return (
    <Box component="nav" sx={{ width, flexShrink: { sm: 0 } }}>
      <MuiDrawer
        variant={variant}
        open={open}
        onClose={onClose}
        transitionDuration={225}
        sx={{
          "& .MuiDrawer-paper": { boxSizing: "border-box", width },
        }}
        slotProps={{
          root: {
            keepMounted: true,
          },
        }}
      >
        {children}
      </MuiDrawer>
    </Box>
  );
};

export default Drawer;
