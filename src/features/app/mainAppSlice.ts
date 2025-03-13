import { create } from "zustand";

type MainAppSlice = {
  // Initialization
  initialized: boolean;
  initialize: (breakpoint: string) => void;

  // Drawer
  drawerOpen: boolean;
  drawerClosing: boolean;
  setDrawerOpen: (drawerOpen: boolean) => void;
};

export const useMainAppSlice = create<MainAppSlice>((set) => ({
  // Initialization
  initialized: false,
  initialize: (breakpoint) => {
    if (breakpoint === "xs") {
      set({ drawerOpen: false });
    } else {
      set({ drawerOpen: true });
    }

    set({ initialized: true });
  },

  // Drawer
  drawerOpen: false,
  drawerClosing: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}));
