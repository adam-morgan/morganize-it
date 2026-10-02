import { useEffect } from "react";
import { take } from "rxjs";
import { useAuthSlice } from "@/features/auth";
import { useNotebooksSlice } from "@/features/notes/notebooksSlice";
import { getQueueProcessor } from "@/features/notes/services";
import { useNetworkSlice } from "./networkSlice";

/**
 * Tracks connectivity and reacts to reconnection. Mount once (in MainApp).
 *
 * navigator.onLine is only a hint; the queue processor independently flips the
 * flag offline when a flush hits a network error. On regaining connectivity we
 * flush the queue and then resync so local edits land before the pull.
 */
export const useNetworkStatus = () => {
  const setOnline = useNetworkSlice((s) => s.setOnline);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);

      const user = useAuthSlice.getState().user;
      if (!user || (user as GuestUser).isGuest) {
        return;
      }

      const processor = getQueueProcessor(user as User);
      if (!processor) {
        return;
      }

      processor.flush().finally(() => {
        useNotebooksSlice
          .getState()
          .resync()
          .pipe(take(1))
          .subscribe({ error: () => {} });
      });
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
