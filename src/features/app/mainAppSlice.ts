import { create } from "zustand";

type MainAppSlice = {
  initialized: boolean;
  drawerOpen: boolean;
  drawerClosing: boolean;
  initialize: (breakpoint: string) => void;
  setDrawerOpen: (drawerOpen: boolean) => void;
};

export const useMainAppSlice = create<MainAppSlice>((set) => ({
  initialized: false,
  drawerOpen: false,
  drawerClosing: false,
  initialize: (breakpoint) => {
    if (breakpoint === "xs") {
      set({ drawerOpen: false });
    } else {
      set({ drawerOpen: true });
    }

    set({ initialized: true });
  },
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
}));
