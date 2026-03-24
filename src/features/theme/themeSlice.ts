import { create } from "zustand";

export type PaletteMode = "light" | "dark";

type ThemeSlice = {
  mode: PaletteMode;
  setPaletteMode: (paletteMode: PaletteMode) => void;
};

const applyMode = (mode: PaletteMode) => {
  document.documentElement.classList.toggle("dark", mode === "dark");
};

export const useThemeSlice = create<ThemeSlice>((set) => ({
  mode: "dark",
  setPaletteMode: (mode) => {
    applyMode(mode);
    set({ mode });
  },
}));

// Apply default dark mode on load
applyMode("dark");
