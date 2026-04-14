import { from, map, Observable, switchMap } from "rxjs";
import { apiPost } from "@/utils/fetch";
import { getCacheDb, getLastSync, setLastSync, clearCache } from "./cache-db";

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SyncResult = {
  notebooks: SyncNotebook[];
  notes: SyncNote[];
};

export class SyncManager {
  constructor(private userId: string) {}

  sync(): Observable<SyncResult> {
    return from(getLastSync(this.userId)).pipe(
      switchMap((lastSync) => {
        const isStale =
          lastSync != null &&
          Date.now() - new Date(lastSync).getTime() > STALE_THRESHOLD_MS;

        if (isStale) {
          return from(clearCache(this.userId)).pipe(
            switchMap(() => this.fetchAndApply(null))
          );
        }

        return this.fetchAndApply(lastSync);
      })
    );
  }

  hasCache(): Observable<boolean> {
    return from(getLastSync(this.userId)).pipe(map((v) => v != null));
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

    // Update lastSync from max updatedAt of owned items only
    const ownedTimestamps = [
      ...response.notebooks
        .filter((n) => n.userId === this.userId)
        .map((n) => n.updatedAt),
      ...response.notes
        .filter((n) => n.userId === this.userId)
        .map((n) => n.updatedAt),
    ].filter(Boolean);

    if (ownedTimestamps.length > 0) {
      const maxTimestamp = ownedTimestamps.sort().pop()!;
      await setLastSync(this.userId, maxTimestamp);
    } else if (response.notebooks.length === 0 && response.notes.length === 0) {
      const lastSync = await getLastSync(this.userId);
      if (!lastSync) {
        await setLastSync(this.userId, new Date().toISOString());
      }
    }

    // Read full current state from IDB
    const currentNotebooks = (await db.getAll("notebooks")) as SyncNotebook[];
    const currentNotes = (await db.getAll("notes")) as SyncNote[];

    return {
      notebooks: currentNotebooks.filter((n) => !n.deletedAt),
      notes: currentNotes.filter((n) => !n.deletedAt),
    };
  }
}
