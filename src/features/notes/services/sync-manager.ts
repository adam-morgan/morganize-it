import { from, Observable, switchMap } from "rxjs";
import { apiPost } from "@/utils/fetch";
import {
  getCacheDb,
  getLastSync,
  setLastSync,
  getLastSyncedAt,
  setLastSyncedAt,
  hasCachedEntities,
  replaceEntityCache,
} from "./cache-db";
import { getQueueProcessor } from "./queue-processor";
import { counts } from "./mutation-queue";
import { cacheMissingAttachments } from "./attachment-cache";

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isOnline = (): boolean => typeof navigator === "undefined" || navigator.onLine;

export type SyncResult = {
  notebooks: SyncNotebook[];
  notes: SyncNote[];
};

export class SyncManager {
  constructor(private userId: string) {}

  sync(): Observable<SyncResult> {
    // Flush local offline writes BEFORE pulling, so the incoming sync echoes our
    // edits back instead of clobbering them. This is the single chokepoint that
    // every sync trigger (visibility, poll, realtime push, share, startup) funnels
    // through, so it's the only place this ordering needs to be enforced.
    return from(getQueueProcessor(this.userId).flushIfOnline()).pipe(
      switchMap(() => from(Promise.all([getLastSync(this.userId), getLastSyncedAt(this.userId)]))),
      switchMap(([lastSync, lastSyncedAt]) => {
        const isStale = lastSyncedAt != null && Date.now() - lastSyncedAt > STALE_THRESHOLD_MS;

        // The full refetch replaces the cache only once the response arrives,
        // so a failed request leaves the offline cache intact.
        if (isStale && isOnline()) {
          return this.fetchAndReplace();
        }

        return this.fetchAndApply(lastSync);
      })
    );
  }

  fullResync(): Observable<SyncResult> {
    return from(this.pushPendingChanges()).pipe(switchMap(() => this.fetchAndReplace()));
  }

  hasCache(): Observable<boolean> {
    return from(
      getLastSync(this.userId).then(
        async (lastSync) => lastSync != null || (await hasCachedEntities(this.userId))
      )
    );
  }

  private fetchAndReplace(): Observable<SyncResult> {
    return apiPost<{ lastSync?: string }, SyncResponse>("/sync", {}).pipe(
      switchMap((response) => from(this.replaceAll(response)))
    );
  }

  private fetchAndApply(lastSync: string | null): Observable<SyncResult> {
    return apiPost<{ lastSync?: string }, SyncResponse>(
      "/sync",
      lastSync ? { lastSync } : {}
    ).pipe(
      switchMap((response) => from(this.applyChanges(response)))
    );
  }

  private async applyChanges(response: SyncResponse): Promise<SyncResult> {
    const db = await getCacheDb(this.userId);

    // --- Notebooks ---
    const nbTx = db.transaction("notebooks", "readwrite");
    // Remove all non-owned notebooks (replaced with fresh shared data)
    const existingNbs = (await nbTx.store.getAll()) as SyncNotebook[];
    for (const nb of existingNbs) {
      if (nb.userId !== this.userId) {
        await nbTx.store.delete(nb.id);
      }
    }
    // Apply all notebooks from response
    for (const nb of response.notebooks) {
      if (nb.deletedAt && nb.userId === this.userId) {
        await nbTx.store.delete(nb.id);
      } else if (!nb.deletedAt) {
        await nbTx.store.put(nb);
      }
    }
    await nbTx.done;

    // --- Notes ---
    const noteTx = db.transaction("notes", "readwrite");
    // Remove all non-owned notes (replaced with fresh shared data)
    const existingNotes = (await noteTx.store.getAll()) as SyncNote[];
    for (const note of existingNotes) {
      if (note.userId !== this.userId) {
        await noteTx.store.delete(note.id);
      }
    }
    // Apply all notes from response
    for (const note of response.notes) {
      if (note.deletedAt && note.userId === this.userId) {
        await noteTx.store.delete(note.id);
      } else if (!note.deletedAt) {
        await noteTx.store.put(note);
      }
    }
    await noteTx.done;

    const latestOwned = this.latestOwnedTimestamp(response);

    if (latestOwned) {
      await setLastSync(this.userId, latestOwned);
    } else if (response.notebooks.length === 0 && response.notes.length === 0) {
      const lastSync = await getLastSync(this.userId);
      if (!lastSync) {
        await setLastSync(this.userId, new Date().toISOString());
      }
    }

    await setLastSyncedAt(this.userId, Date.now());

    return this.readCurrentState();
  }

  private async pushPendingChanges(): Promise<void> {
    if (!isOnline()) {
      throw new Error("You're offline. Reconnect to resync your data.");
    }

    await getQueueProcessor(this.userId).retryFailed();

    const { pending } = await counts(this.userId);

    if (pending > 0) {
      throw new Error(
        `${pending} local change${pending === 1 ? "" : "s"} couldn't be pushed to the server yet. Try again shortly.`
      );
    }
  }

  private async replaceAll(response: SyncResponse): Promise<SyncResult> {
    await replaceEntityCache(
      this.userId,
      response.notebooks.filter((nb) => !nb.deletedAt),
      response.notes.filter((note) => !note.deletedAt),
      this.latestOwnedTimestamp(response) ?? new Date().toISOString()
    );

    await setLastSyncedAt(this.userId, Date.now());

    return this.readCurrentState();
  }

  private latestOwnedTimestamp(response: SyncResponse): string | undefined {
    return [
      ...response.notebooks.filter((n) => n.userId === this.userId).map((n) => n.updatedAt),
      ...response.notes.filter((n) => n.userId === this.userId).map((n) => n.updatedAt),
    ]
      .filter(Boolean)
      .sort()
      .pop();
  }

  private async readCurrentState(): Promise<SyncResult> {
    const db = await getCacheDb(this.userId);
    const currentNotebooks = (await db.getAll("notebooks")) as SyncNotebook[];
    const currentNotes = (await db.getAll("notes")) as SyncNote[];

    const liveNotes = currentNotes.filter((n) => !n.deletedAt);

    // Eagerly cache attachment blobs in the background so they're available
    // offline. Best-effort and online-only (we only reach here after a
    // successful pull), so failures never affect the sync result.
    void cacheMissingAttachments(this.userId, liveNotes).catch(() => {});

    return {
      notebooks: currentNotebooks.filter((n) => !n.deletedAt),
      notes: liveNotes,
    };
  }
}
