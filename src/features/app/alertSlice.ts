import * as R from "rambda";
import { create } from "zustand";

type Alert = {
  message: string;
  severity: "error" | "warning" | "info" | "success";
};

type AlertSlice = {
  alertQueue: Alert[];
  errorAlert: (message: string) => void;
  warningAlert: (message: string) => void;
  infoAlert: (message: string) => void;
  successAlert: (message: string) => void;
  getCurrentAlert: () => Alert | undefined;
  popAlert: () => void;
};

export const useAlertSlice = create<AlertSlice>((set, get) => {
  const pushAlert = (message: string, severity: Alert["severity"]) => {
    set((state) => ({ alertQueue: [...state.alertQueue, { message, severity }] }));
  };

  return {
    alertQueue: [],
    errorAlert: (message) => pushAlert(message, "error"),
    warningAlert: (message) => pushAlert(message, "warning"),
    infoAlert: (message) => pushAlert(message, "info"),
    successAlert: (message) => pushAlert(message, "success"),
    getCurrentAlert: () => R.head(get().alertQueue),
    popAlert: () => set((state) => ({ alertQueue: R.tail(state.alertQueue) })),
  };
});
