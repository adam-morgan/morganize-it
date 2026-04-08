import { forkJoin, from, map, Observable, switchMap } from "rxjs";
import { apiPost } from "@/utils/fetch";
import { getCacheDb, getLastSync, setLastSync, clearCache } from "./cache-db";

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SyncResult = {
  notebooks: Notebook[];
  notes: Note[];
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
    const criteria = lastSync
      ? { updatedAt: { $gte: lastSync } }
      : undefined;

    const findOptions: FindOptions = {
      ...(criteria && { criteria }),
      includeSoftDeleted: true,
    };

    return forkJoin({
      notebooks: apiPost<FindOptions, PageResult<Notebook>>("/notebooks/find", findOptions).pipe(
        map((r) => r.items)
      ),
      notes: apiPost<FindOptions, PageResult<Note>>("/notes/find", findOptions).pipe(
        map((r) => r.items)
      ),
    }).pipe(
      switchMap(({ notebooks, notes }) =>
        from(this.applyChanges(notebooks, notes))
      )
    );
  }

  private async applyChanges(
    notebooks: Notebook[],
    notes: Note[]
  ): Promise<SyncResult> {
    const db = await getCacheDb(this.userId);

    // Apply notebook changes
    const nbTx = db.transaction("notebooks", "readwrite");
    for (const notebook of notebooks) {
      if (notebook.deletedAt) {
        await nbTx.store.delete(notebook.id);
      } else {
        await nbTx.store.put(notebook);
      }
    }
    await nbTx.done;

    // Apply note changes
    const noteTx = db.transaction("notes", "readwrite");
    for (const note of notes) {
      if (note.deletedAt) {
        await noteTx.store.delete(note.id);
      } else {
        await noteTx.store.put(note);
      }
    }
    await noteTx.done;

    // Determine lastSync from max updatedAt of all returned records
    const allTimestamps = [
      ...notebooks.map((n) => n.updatedAt),
      ...notes.map((n) => n.updatedAt),
    ].filter(Boolean);

    if (allTimestamps.length > 0) {
      const maxTimestamp = allTimestamps.sort().pop()!;
      await setLastSync(this.userId, maxTimestamp);
    } else if (notebooks.length === 0 && notes.length === 0) {
      // No changes from server — if this was a full sync, still mark as synced
      const lastSync = await getLastSync(this.userId);
      if (!lastSync) {
        await setLastSync(this.userId, new Date().toISOString());
      }
    }

    // Read full current state from IDB
    const currentNotebooks = (await db.getAll("notebooks")) as Notebook[];
    const currentNotes = (await db.getAll("notes")) as Note[];

    return {
      notebooks: currentNotebooks.filter((n) => !n.deletedAt),
      notes: currentNotes.filter((n) => !n.deletedAt),
    };
  }
}
