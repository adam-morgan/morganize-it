import { create } from "zustand";

type NetworkSlice = {
  // Whether the app currently believes it can reach the server. Seeded from
  // navigator.onLine but treated as a hint — the authoritative signal is
  // whether API requests get a response (see utils/fetch).
  online: boolean;

  // Number of queued offline writes not yet confirmed by the server.
  pendingCount: number;

  // Number of queued writes that exhausted their retries (need attention).
  failedCount: number;

  setOnline: (online: boolean) => void;
  setPendingCount: (pendingCount: number) => void;
  setFailedCount: (failedCount: number) => void;
};

export const useNetworkSlice = create<NetworkSlice>((set) => ({
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingCount: 0,
  failedCount: 0,

  setOnline: (online) => set({ online }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setFailedCount: (failedCount) => set({ failedCount }),
}));
