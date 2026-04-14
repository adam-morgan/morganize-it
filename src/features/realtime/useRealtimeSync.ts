import { useEffect } from "react";
import { auditTime, filter, groupBy, mergeMap, Subscription, take } from "rxjs";
import { useAuthSlice } from "@/features/auth";
import { useNotebooksSlice } from "@/features/notes";
import { useFriendsSlice } from "@/features/friends/friendsSlice";
import { getWebSocketClient } from "./websocket-client";
import { RealtimeEvent } from "./event-types";

const BURST_COALESCE_MS = 500;

const triggerSync = (event: RealtimeEvent): void => {
  // All resource changes funnel through a single resync that pulls everything
  // (owned + shared) from the unified /sync endpoint.
  useNotebooksSlice.getState().resync().pipe(take(1)).subscribe({
    error: (err) => console.warn("realtime resync failed", err),
  });

  // Friendship changes still refresh the friends slice separately.
  if (event.resourceType === "friendship" || event.resourceType === "friend-request") {
    useFriendsSlice.getState().refresh().pipe(take(1)).subscribe({
      error: (err) => console.warn("realtime refreshFriends failed", err),
    });
  }
};

export const useRealtimeSync = (): void => {
  const user = useAuthSlice((s) => s.user);
  const isAuthed = user != null && !(user as GuestUser).isGuest;

  useEffect(() => {
    if (!isAuthed) return;
    const client = getWebSocketClient();
    client.start();

    // Coalesce bursts per (resourceType, action) so a flurry of edits triggers
    // one refetch instead of N — but a friend request and a note edit don't
    // suppress each other.
    const sub: Subscription = client.incoming$
      .pipe(
        filter((e) => e.type === "resource.changed"),
        groupBy((e) => `${e.resourceType}:${e.action ?? "none"}`),
        mergeMap((group$) => group$.pipe(auditTime(BURST_COALESCE_MS)))
      )
      .subscribe(triggerSync);

    return () => {
      sub.unsubscribe();
      client.stop();
    };
  }, [isAuthed]);
};
