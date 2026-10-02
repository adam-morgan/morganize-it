import { create } from "zustand";

type UpdateSlice = {
  updateReady: boolean;
  setUpdateReady: (updateReady: boolean) => void;
};

export const useUpdateSlice = create<UpdateSlice>((set) => ({
  updateReady: false,
  setUpdateReady: (updateReady) => set({ updateReady }),
}));
