import { useEffect } from "react";
import { take } from "rxjs";
import { useAuthSlice } from "@/features/auth";
import { useNotebooksSlice } from "@/features/notes/notebooksSlice";
import { getQueueProcessor } from "@/features/notes/services";
import { useNetworkSlice } from "./networkSlice";

const PROBE_INTERVAL_MS = 30_000;

const reconnect = () => {
  const user = useAuthSlice.getState().user;

  if (!user || (user as GuestUser).isGuest) {
    return;
  }

  const processor = getQueueProcessor(user as User);

  if (!processor) {
    return;
  }

  processor.flush({ force: true }).finally(() => {
    useNotebooksSlice
      .getState()
      .resync()
      .pipe(take(1))
      .subscribe({ error: () => {} });
  });
};

/**
 * Tracks connectivity and reacts to reconnection. Mount once (in MainApp).
 *
 * navigator.onLine is only a hint; utils/fetch flips the flag on every API
 * response or network failure. On regaining connectivity we flush the queue
 * and then resync so local edits land before the pull.
 */
export const useNetworkStatus = () => {
  const setOnline = useNetworkSlice((s) => s.setOnline);
  const online = useNetworkSlice((s) => s.online);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      reconnect();
    };

    const handleOffline = () => setOnline(false);

    setOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  // The browser's `online` event is unreliable (iOS standalone PWAs, captive
  // portals), so while we think we're offline keep probing with a real sync.
  // Any successful API response flips the flag back via utils/fetch.
  useEffect(() => {
    if (online) {
      return;
    }

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        reconnect();
      }
    };

    const timer = setInterval(reconnect, PROBE_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [online]);

  // Seed the pending/failed counts on mount so the indicator reflects any work
  // left queued from a previous session.
  useEffect(() => {
    const user = useAuthSlice.getState().user;
    if (!user || (user as GuestUser).isGuest) {
      return;
    }

    void getQueueProcessor(user as User)?.refreshCounts();
  }, []);
};
