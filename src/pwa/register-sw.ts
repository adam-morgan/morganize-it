import { Workbox } from "workbox-window";
import { useUpdateSlice } from "./updateSlice";

const UPDATE_INTERVAL_MS = 30 * 60 * 1000;
const RELOAD_GUARD_KEY = "preloadErrorReloadAt";
const RELOAD_GUARD_MS = 10_000;

// A chunk that's still missing after a reload is a real error, not a stale
// build, so only reload once per window to avoid a reload loop.
const recentlyReloaded = (): boolean => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);

    if (Date.now() - last < RELOAD_GUARD_MS) return true;

    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // Storage unavailable; fall through and reload.
  }

  return false;
};

export const registerServiceWorker = () => {
  window.addEventListener("vite:preloadError", (event) => {
    if (recentlyReloaded()) return;

    event.preventDefault();
    window.location.reload();
  });

  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
    return;
  }

  const wb = new Workbox("/sw.js", { scope: "/" });

  wb.addEventListener("controlling", (event) => {
    if (event.isUpdate) {
      useUpdateSlice.getState().setUpdateReady(true);
    }
  });

  const checkForUpdate = () => {
    if (navigator.onLine) {
      wb.update().catch(() => {});
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkForUpdate();
    }
  });

  window.addEventListener("online", checkForUpdate);
  setInterval(checkForUpdate, UPDATE_INTERVAL_MS);

  wb.register().catch(() => {});
};
