import { createTheme, Theme } from "@mui/material";
import { create } from "zustand";

export type PaletteMode = "light" | "dark";

type ThemeSlice = {
  muiTheme: Theme;
  setPaletteMode: (paletteMode: PaletteMode) => void;
};

const createMuiTheme = (paletteMode: PaletteMode): Theme => {
  return createTheme({
    palette: {
      mode: paletteMode,
    },
  });
};

export const useThemeSlice = create<ThemeSlice>((set) => ({
  muiTheme: createMuiTheme("dark"),
  setPaletteMode: (paletteMode) => set({ muiTheme: createMuiTheme(paletteMode) }),
}));
