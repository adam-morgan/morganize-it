import { from, map, Observable } from "rxjs";
import { v4 as uuid } from "uuid";
import { ApiNotesService } from "./api-notes-service";
import { CachedNotesService } from "./cached-notes-service";
import { getCacheDb } from "./cache-db";
import { enqueueCreate, enqueueUpdate, enqueueDelete } from "./mutation-queue";
import { QueueProcessor } from "./queue-processor";
import { deleteNoteAttachmentBlobs } from "./attachment-cache";

/**
 * Authenticated notes service used for both online and offline writes.
 *
 * Reads are inherited verbatim from CachedNotesService (cache-only). Writes are
 * cache-first: the change is applied to IndexedDB and queued immediately, then
 * the Observable resolves from the local entity without waiting on the network.
 * When online, a flush is kicked opportunistically; the server contract is
 * unchanged — only the ordering (local write first, network second) differs.
 */
export class OfflineNotesService extends CachedNotesService {
  constructor(
    api: ApiNotesService,
    userId: string,
    private processor: QueueProcessor
  ) {
    super(api, userId);
  }

  // --- Notebooks ---

  createNotebook(name: string): Observable<Notebook> {
    const now = new Date().toISOString();

    const notebook: Notebook = {
      id: uuid(),
      name,
      userId: this.userId,
      updatedAt: now,
    };

    const cached: SyncNotebook = { ...notebook, accessLevel: "owner" };

    return from(this.persistCreate("notebooks", "notebook", cached, notebook)).pipe(
      map(() => notebook)
    );
  }

  updateNotebook(id: string, name: string): Observable<Notebook> {
    return from(this.persistNotebookUpdate(id, name));
  }

  deleteNotebook(id: string): Observable<void> {
    return from(this.persistNotebookDelete(id)).pipe(map(() => undefined));
  }

  // --- Notes ---

  createNote(note: Omit<Note, "id">): Observable<Note> {
    const full: Note = { ...note, id: uuid() };

    return from(this.persistCreate("notes", "note", full)).pipe(map(() => full));
  }

  updateNote(id: string, data: Partial<Note>): Observable<Note> {
    return from(this.persistNoteUpdate(id, data));
  }

  deleteNote(id: string): Observable<void> {
    return from(this.persistEntityDelete("notes", "note", id)).pipe(map(() => undefined));
  }

  // --- write helpers ---

  private async persistCreate(
    store: "notebooks" | "notes",
    entityType: "notebook" | "note",
    entity: { id: string; notebookId?: string },
    payload: object = entity
  ): Promise<void> {
    const db = await getCacheDb(this.userId);
    await db.put(store, entity);

    await enqueueCreate(
      this.userId,
      entityType,
      entity.id,
      payload as Record<string, unknown>,
      entity.notebookId
    );
    this.afterWrite();
  }

  private async persistNoteUpdate(id: string, data: Partial<Note>): Promise<Note> {
    const db = await getCacheDb(this.userId);
    const existing = (await db.get("notes", id)) as Note | undefined;
    const merged = { ...(existing ?? {}), ...data, id } as Note;

    await db.put("notes", merged);
    await enqueueUpdate(
      this.userId,
      "note",
      id,
      { ...data } as unknown as Record<string, unknown>,
      merged.notebookId
    );

    this.afterWrite();
    return merged;
  }

  private async persistNotebookUpdate(id: string, name: string): Promise<Notebook> {
    const now = new Date().toISOString();
    const db = await getCacheDb(this.userId);
    const existing = (await db.get("notebooks", id)) as Notebook | undefined;
    const merged = {
      ...(existing ?? { id, userId: this.userId }),
      id,
      name,
      updatedAt: now,
    } as Notebook;

    await db.put("notebooks", merged);
    // Server overrides updatedAt for notebooks, so the body only carries name.
    await enqueueUpdate(this.userId, "notebook", id, { name });

    this.afterWrite();
    return merged;
  }

  private async persistEntityDelete(
    store: "notebooks" | "notes",
    entityType: "notebook" | "note",
    id: string
  ): Promise<void> {
    const { neverSynced } = await enqueueDelete(this.userId, entityType, id);
    const db = await getCacheDb(this.userId);

    if (neverSynced) {
      // It never reached the server (its create was dropped) — hard remove it.
      await db.delete(store, id);
    } else {
      // Mirror the server's soft delete so a replay/sync can reconcile it.
      const existing = (await db.get(store, id)) as Record<string, unknown> | undefined;
      if (existing) {
        await db.put(store, { ...existing, deletedAt: new Date().toISOString() });
      }
    }

    if (entityType === "note") {
      await deleteNoteAttachmentBlobs(this.userId, id);
    }

    this.afterWrite();
  }

  private async persistNotebookDelete(id: string): Promise<void> {
    const { neverSynced, droppedNoteIds } = await enqueueDelete(this.userId, "notebook", id);
    const db = await getCacheDb(this.userId);
    const childNotes = (await db.getAllFromIndex("notes", "notebookId", id)) as Note[];

    if (neverSynced) {
      // The notebook never reached the server. Hard-remove it and the child
      // notes whose creates were dropped alongside it.
      const tx = db.transaction(["notebooks", "notes"], "readwrite");
      await tx.objectStore("notebooks").delete(id);
      for (const noteId of droppedNoteIds) {
        await tx.objectStore("notes").delete(noteId);
      }
      await tx.done;
    } else {
      // Soft-delete the notebook and cascade to its notes locally, mirroring the
      // server's cascade. No per-note delete is queued — the server does that.
      const now = new Date().toISOString();
      const tx = db.transaction(["notebooks", "notes"], "readwrite");

      const nb = (await tx.objectStore("notebooks").get(id)) as Record<string, unknown> | undefined;
      if (nb) {
        await tx.objectStore("notebooks").put({ ...nb, deletedAt: now });
      }

      for (const note of childNotes) {
        await tx.objectStore("notes").put({ ...note, deletedAt: now });
      }

      await tx.done;
    }

    for (const note of childNotes) {
      await deleteNoteAttachmentBlobs(this.userId, note.id);
    }

    this.afterWrite();
  }

  // Reflect the new queue length immediately, then try to flush in the
  // background. The flush is intentionally not awaited — the UI already has its
  // optimistic value from the cache write above.
  private afterWrite(): void {
    void this.processor.refreshCounts();
    void this.processor.flushIfOnline();
  }
}
