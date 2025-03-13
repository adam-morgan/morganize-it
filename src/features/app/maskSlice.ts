import { create } from "zustand";
import { v4 as uuid } from "uuid";
import * as R from "rambda";

type MaskSlice = {
  maskStack: { id: string; maskText: string }[];
  mask: (maskText: string) => () => void;
  getMaskText: () => string | undefined;
};

export const useMaskSlice = create<MaskSlice>((set, get) => ({
  // Masker
  maskStack: [],
  mask: (maskText) => {
    const id = uuid();
    set((state) => ({ maskStack: [...state.maskStack, { id, maskText }] }));

    return () => set((state) => ({ maskStack: state.maskStack.filter((mask) => mask.id !== id) }));
  },
  getMaskText: () => R.last(get().maskStack)?.maskText,
}));
