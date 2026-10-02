import { useNetworkSlice } from "./networkSlice";

/**
 * Compact status chip for the app bar. Renders nothing for online users (whose
 * writes flush near-instantly), so their UI is unchanged. Only surfaces the
 * states that actually warrant attention: offline, and failed-to-sync.
 */
const OfflineIndicator = () => {
  const online = useNetworkSlice((s) => s.online);
  const pendingCount = useNetworkSlice((s) => s.pendingCount);
  const failedCount = useNetworkSlice((s) => s.failedCount);

  if (failedCount > 0) {
    return (
      <span
        className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
        title={`${failedCount} change${failedCount === 1 ? "" : "s"} failed to sync`}
      >
        {failedCount} unsynced
      </span>
    );
  }

  if (!online) {
    return (
      <span
        className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
        title={
          pendingCount > 0
            ? `Offline — ${pendingCount} change${pendingCount === 1 ? "" : "s"} pending`
            : "Offline — changes will sync when you reconnect"
        }
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Offline{pendingCount > 0 ? ` · ${pendingCount}` : ""}
      </span>
    );
  }

  return null;
};

export default OfflineIndicator;
