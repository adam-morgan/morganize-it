import { useEffect, useRef, useCallback } from "react";
import { forkJoin, take } from "rxjs";
import { useNotebooksSlice } from "@/features/notes";
import { useAuthSlice } from "@/features/auth";
import { useFriendsSlice } from "@/features/friends/friendsSlice";
import { useRealtimeSync } from "@/features/realtime";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_SYNC_INTERVAL_MS = 10_000; // 10 seconds

export const useAppSync = () => {
  const resyncNotebooks = useNotebooksSlice((s) => s.resync);
  const refreshFriends = useFriendsSlice((s) => s.refresh);
  const initialized = useNotebooksSlice((s) => s.initialized);
  const user = useAuthSlice((s) => s.user);

  // Push channel: subscribe to server-sent change events and trigger the same
  // resync entrypoints used by the visibility/poll triggers below.
  useRealtimeSync();

  const lastSyncRef = useRef(0);
  const syncInProgressRef = useRef(false);

  const doSync = useCallback(() => {
    if (!initialized) return;
    if (!user || (user as GuestUser).isGuest) return;
    if (syncInProgressRef.current) return;

    const now = Date.now();
    if (now - lastSyncRef.current < MIN_SYNC_INTERVAL_MS) return;

    syncInProgressRef.current = true;
    lastSyncRef.current = now;

    forkJoin({
      notebooks: resyncNotebooks(),
      friends: refreshFriends(),
    })
      .pipe(take(1))
      .subscribe({
        next: () => {
          syncInProgressRef.current = false;
        },
        error: (err) => {
          console.warn("Background sync failed:", err);
          syncInProgressRef.current = false;
        },
      });
  }, [initialized, user, resyncNotebooks, refreshFriends]);

  // Sync when app becomes visible (primary mechanism)
  useEffect(() => {
    if (!initialized) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        doSync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [initialized, doSync]);

  // Periodic polling (safety net for both devices open simultaneously)
  useEffect(() => {
    if (!initialized) return;

    const timer = setInterval(doSync, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [initialized, doSync]);
};
