import { create } from "zustand";

export type PaletteMode = "light" | "dark";

type ThemeSlice = {
  mode: PaletteMode;
  setPaletteMode: (paletteMode: PaletteMode) => void;
  toggleMode: () => void;
};

const applyMode = (mode: PaletteMode) => {
  document.documentElement.classList.toggle("dark", mode === "dark");
};

const getStoredMode = (): PaletteMode => {
  const stored = localStorage.getItem("theme");
  return stored === "light" ? "light" : "dark";
};

const initialMode = getStoredMode();

export const useThemeSlice = create<ThemeSlice>((set, get) => ({
  mode: initialMode,
  setPaletteMode: (mode) => {
    localStorage.setItem("theme", mode);
    applyMode(mode);
    set({ mode });
  },
  toggleMode: () => {
    const newMode = get().mode === "dark" ? "light" : "dark";
    get().setPaletteMode(newMode);
  },
}));

applyMode(initialMode);
