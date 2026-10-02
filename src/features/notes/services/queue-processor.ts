import { firstValueFrom } from "rxjs";
import { apiPost, apiPatch, apiDelete } from "@/utils/fetch";
import { useNetworkSlice } from "@/features/network/networkSlice";
import { getCacheDb } from "./cache-db";
import { requestUploadUrl, confirmUpload, uploadFileToUrl } from "./attachment-service";
import { getCachedAttachment, rekeyAttachment } from "./attachment-cache";
import {
  PendingMutation,
  listForFlush,
  putMutation,
  removeMutation,
  resetInflight,
  retryFailed,
  counts,
} from "./mutation-queue";

const MAX_RETRIES = 8;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60_000;

const backoff = (retryCount: number): number => {
  const exp = Math.min(BASE_BACKOFF_MS * 2 ** retryCount, MAX_BACKOFF_MS);
  // Full jitter to avoid synchronized retries across tabs/devices.
  return Math.round(exp / 2 + Math.random() * (exp / 2));
};

const statusOf = (err: unknown): number | undefined =>
  err && typeof err === "object" && "status" in err
    ? (err as { status?: number }).status
    : undefined;

const messageOf = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/**
 * Drains the offline mutation queue against the API. One instance per user
 * (see getQueueProcessor). A single-flight guard plus the per-user instance
 * means there is never more than one concurrent drain for a user, so replay is
 * strictly ordered and idempotent.
 */
export class QueueProcessor {
  private flushing = false;
  private currentFlush: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private recoveredInflight = false;

  constructor(private userId: string) {}

  flushIfOnline(): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return Promise.resolve();
    }
    return this.flush();
  }

  // `force` ignores backoff — used when connectivity has just been confirmed.
  async flush(options?: { force?: boolean }): Promise<void> {
    if (this.flushing) {
      return this.currentFlush ?? Promise.resolve();
    }

    this.flushing = true;
    this.currentFlush = this.runFlush(options?.force ?? false);

    return this.currentFlush;
  }

  async retryFailed(): Promise<void> {
    await retryFailed(this.userId);
    await this.flush({ force: true });
  }

  private async runFlush(force: boolean): Promise<void> {
    try {
      if (!this.recoveredInflight) {
        await resetInflight(this.userId);
        this.recoveredInflight = true;
      }

      await this.drain(force);
    } catch (err) {
      // Never reject: flush runs before every sync pull, so a transient IDB
      // error here must not break syncing. Per-mutation errors are already
      // handled in drain(); this only catches unexpected failures.
      console.warn("Queue flush failed:", err);
    } finally {
      this.flushing = false;
      this.currentFlush = null;
      await this.refreshCounts().catch(() => {});
    }
  }

  async refreshCounts(): Promise<void> {
    const { pending, failed } = await counts(this.userId);
    const slice = useNetworkSlice.getState();
    slice.setPendingCount(pending);
    slice.setFailedCount(failed);
  }

  private async drain(force: boolean): Promise<void> {
    for (;;) {
      const batch = await listForFlush(this.userId, force ? Infinity : Date.now());
      if (batch.length === 0) {
        break;
      }

      let progressed = false;

      for (const mutation of batch) {
        await putMutation(this.userId, { ...mutation, status: "inflight" });

        try {
          const response = await this.send(mutation);
          await this.applyServerResponse(mutation, response);
          await removeMutation(this.userId, mutation.id);
          progressed = true;
        } catch (err) {
          const dropped = await this.handleError(mutation, err);

          if (!dropped) {
            // Transient failure: preserve FIFO/dependency order by stopping the
            // drain here and retrying the whole queue after a backoff.
            this.scheduleRetry(mutation.retryCount + 1);
            return;
          }

          progressed = true;
        }
      }

      if (!progressed) {
        break;
      }
    }
  }

  private send(mutation: PendingMutation): Promise<unknown> {
    if (mutation.entityType === "attachment") {
      return this.sendAttachmentUpload(mutation);
    }

    const base = mutation.entityType === "note" ? "/notes" : "/notebooks";

    switch (mutation.op) {
      case "create":
        return firstValueFrom(apiPost(base, mutation.payload ?? {}));
      case "update":
        return firstValueFrom(apiPatch(`${base}/${mutation.entityId}`, mutation.payload ?? {}));
      case "delete":
        return firstValueFrom(apiDelete(`${base}/${mutation.entityId}`));
    }
  }

  // Replays an attachment upload queued offline: read the stored blob, run the
  // 3-step handshake, then re-key the cached blob from the temporary id to the
  // server's canonical attachment id. Returns the updated note.
  private async sendAttachmentUpload(mutation: PendingMutation): Promise<unknown> {
    const payload = mutation.payload as { noteId: string; filename: string; mimeType: string };
    const noteId = payload.noteId;
    const tempId = mutation.entityId;

    const cached = await getCachedAttachment(this.userId, noteId, tempId);
    if (!cached) {
      // Blob is gone (evicted) — nothing we can upload. Drop the mutation.
      return null;
    }

    const { uploadUrl, fileId } = await firstValueFrom(
      requestUploadUrl(noteId, payload.filename, payload.mimeType)
    );

    await uploadFileToUrl(uploadUrl, cached.blob);

    const updatedNote = await firstValueFrom(
      confirmUpload(noteId, fileId, payload.filename, payload.mimeType)
    );

    await rekeyAttachment(this.userId, noteId, tempId, fileId);

    return updatedNote;
  }

  // After a successful create/update, write the server's canonical entity back
  // into the cache. This is mandatory for notebooks, whose `updatedAt` the
  // server overrides — without it the cache and lastSync would diverge.
  private async applyServerResponse(mutation: PendingMutation, response: unknown): Promise<void> {
    if (mutation.op === "delete" || response == null || typeof response !== "object") {
      return;
    }

    const db = await getCacheDb(this.userId);

    // An attachment upload returns the updated note, keyed by its noteId.
    if (mutation.entityType === "attachment") {
      const noteId = mutation.parentId as string;
      const existing = (await db.get("notes", noteId)) as Record<string, unknown> | undefined;
      await db.put("notes", { ...(existing ?? {}), ...(response as Record<string, unknown>) });
      return;
    }

    const store = mutation.entityType === "note" ? "notes" : "notebooks";
    const existing = (await db.get(store, mutation.entityId)) as Record<string, unknown> | undefined;

    // Preserve sync-only fields (accessLevel, ownerName, ...) the plain entity
    // API doesn't return, mirroring notesSlice's merge strategy.
    await db.put(store, { ...(existing ?? {}), ...(response as Record<string, unknown>) });
  }

  // Returns true if the mutation was resolved (dropped) and the drain may
  // continue; false if it was a transient failure that should stop the drain.
  private async handleError(mutation: PendingMutation, err: unknown): Promise<boolean> {
    const status = statusOf(err);

    // Deleting something already gone, or recreating something that exists:
    // treat as success and let the next sync pull the canonical state.
    if (status === 404 && (mutation.op === "delete" || mutation.op === "update")) {
      await removeMutation(this.userId, mutation.id);
      return true;
    }
    if (status === 409 && mutation.op === "create") {
      await removeMutation(this.userId, mutation.id);
      return true;
    }

    const transient =
      status === undefined || status >= 500 || status === 401 || status === 429;

    if (transient) {
      // No HTTP status => the request never reached the server. Being offline
      // is not the mutation's fault, so it backs off without using up retries.
      const networkFailure = status === undefined;
      const retryCount = networkFailure
        ? Math.min(mutation.retryCount + 1, MAX_RETRIES - 1)
        : mutation.retryCount + 1;

      if (!networkFailure && retryCount >= MAX_RETRIES) {
        await putMutation(this.userId, {
          ...mutation,
          status: "failed",
          retryCount,
          lastError: messageOf(err),
        });
        return true; // poison — keep as failed, but unblock the drain
      }

      await putMutation(this.userId, {
        ...mutation,
        status: "pending",
        retryCount,
        nextAttempt: Date.now() + backoff(retryCount),
        lastError: messageOf(err),
      });
      return false;
    }

    // Non-retryable client error (400/403/...): park as failed so we don't loop.
    await putMutation(this.userId, {
      ...mutation,
      status: "failed",
      retryCount: mutation.retryCount + 1,
      lastError: messageOf(err),
    });
    return true;
  }

  private scheduleRetry(retryCount: number): void {
    if (this.retryTimer) {
      return;
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flushIfOnline();
    }, backoff(retryCount));
  }
}

const instances: Record<string, QueueProcessor> = {};

// One processor per user so the single-flight guard actually serializes drains.
export const getQueueProcessor = (userId: string): QueueProcessor => {
  if (!instances[userId]) {
    instances[userId] = new QueueProcessor(userId);
  }

  return instances[userId];
};
