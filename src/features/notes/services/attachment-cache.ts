import { firstValueFrom } from "rxjs";
import { getCacheDb } from "./cache-db";
import { getAttachmentDownloadUrl } from "./attachment-service";
import { useNetworkSlice } from "@/features/network/networkSlice";

const STORE = "attachments";

// Eagerly cache attachments up to this total per user, evicting least-recently
// used blobs when full. Files larger than the per-file cap are never cached.
const BUDGET_BYTES = 100 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export type CachedAttachment = {
  key: string; // `${noteId}#${attachmentId}`
  noteId: string;
  attachmentId: string;
  blob: Blob;
  mimeType: string;
  filename: string;
  size: number;
  cachedAt: number;
  lastAccess: number;
  // A queued offline upload's only copy of the file: never evicted.
  pinned?: boolean;
};

type PutOptions = {
  pinned?: boolean;
  // Background prefetch only fills free space; it never evicts other files.
  evict?: boolean;
};

const keyOf = (noteId: string, attachmentId: string): string => `${noteId}#${attachmentId}`;

// Returns the cached blob (and bumps its LRU recency) or undefined.
export const getCachedAttachment = async (
  userId: string,
  noteId: string,
  attachmentId: string
): Promise<CachedAttachment | undefined> => {
  const db = await getCacheDb(userId);
  const record = (await db.get(STORE, keyOf(noteId, attachmentId))) as CachedAttachment | undefined;

  // The recency bump is best-effort: a failed write (quota, Safari blob
  // quirks) must not stop the user from opening a file we already have.
  if (record) {
    db.put(STORE, { ...record, lastAccess: Date.now() }).catch(() => {});
  }

  return record;
};

const totalBytes = async (userId: string): Promise<number> => {
  const db = await getCacheDb(userId);
  const all = (await db.getAll(STORE)) as CachedAttachment[];
  return all.reduce((sum, a) => sum + (a.size ?? 0), 0);
};

// Evict least-recently-used blobs until `incoming` more bytes would fit.
const evictToBudget = async (userId: string, incoming: number, evict: boolean): Promise<boolean> => {
  if (incoming > BUDGET_BYTES) {
    return false;
  }

  const db = await getCacheDb(userId);
  let used = await totalBytes(userId);

  if (used + incoming <= BUDGET_BYTES) {
    return true;
  }

  if (!evict) {
    return false;
  }

  // Oldest access first.
  const byLru = (await db.getAllFromIndex(STORE, "lastAccess")) as CachedAttachment[];

  for (const victim of byLru) {
    if (used + incoming <= BUDGET_BYTES) {
      break;
    }

    if (victim.pinned) {
      continue;
    }

    await db.delete(STORE, victim.key);
    used -= victim.size ?? 0;
  }

  return used + incoming <= BUDGET_BYTES;
};

export const putAttachmentBlob = async (
  userId: string,
  noteId: string,
  attachmentId: string,
  blob: Blob,
  filename: string,
  mimeType: string,
  options: PutOptions = {}
): Promise<boolean> => {
  const { pinned = false, evict = true } = options;

  if (blob.size > MAX_FILE_BYTES) {
    return false;
  }

  const fits = await evictToBudget(userId, blob.size, evict);

  if (!fits && !pinned) {
    return false;
  }

  const now = Date.now();
  const db = await getCacheDb(userId);

  const record: CachedAttachment = {
    key: keyOf(noteId, attachmentId),
    noteId,
    attachmentId,
    blob,
    mimeType,
    filename,
    size: blob.size,
    cachedAt: now,
    lastAccess: now,
    pinned,
  };

  await db.put(STORE, record);
  return true;
};

// Re-key a cached blob after an offline upload is confirmed and the server
// assigns its canonical attachment id.
export const rekeyAttachment = async (
  userId: string,
  noteId: string,
  fromId: string,
  toId: string
): Promise<void> => {
  const db = await getCacheDb(userId);
  const record = (await db.get(STORE, keyOf(noteId, fromId))) as CachedAttachment | undefined;

  if (!record) {
    return;
  }

  const tx = db.transaction(STORE, "readwrite");
  await tx.store.delete(record.key);
  await tx.store.put({
    ...record,
    key: keyOf(noteId, toId),
    attachmentId: toId,
    pinned: false,
  });
  await tx.done;
};

export const deleteNoteAttachmentBlobs = async (userId: string, noteId: string): Promise<void> => {
  const db = await getCacheDb(userId);
  const blobs = (await db.getAllFromIndex(STORE, "noteId", noteId)) as CachedAttachment[];

  const tx = db.transaction(STORE, "readwrite");
  for (const blob of blobs) {
    await tx.store.delete(blob.key);
  }
  await tx.done;
};

type NoteWithAttachments = { id: string; attachments?: Attachment[] };

const prefetchInFlight: Record<string, Promise<void>> = {};
const skipForSession = new Set<string>();

// Download and cache any attachments referenced by the given notes that aren't
// cached yet. Best-effort: failures per attachment are skipped, and files that
// failed or don't fit are not retried for the rest of the session. Only one
// run per user at a time; overlapping calls share it. Must only be called
// while online.
export const cacheMissingAttachments = (userId: string, notes: NoteWithAttachments[]): Promise<void> => {
  if (!prefetchInFlight[userId]) {
    prefetchInFlight[userId] = prefetch(userId, notes).finally(() => {
      delete prefetchInFlight[userId];
    });
  }

  return prefetchInFlight[userId];
};

const prefetch = async (userId: string, notes: NoteWithAttachments[]): Promise<void> => {
  const db = await getCacheDb(userId);
  let free = BUDGET_BYTES - (await totalBytes(userId));

  for (const note of notes) {
    for (const attachment of note.attachments ?? []) {
      const key = keyOf(note.id, attachment.id);

      if (skipForSession.has(key) || (await db.get(STORE, key))) {
        continue;
      }

      const controller = new AbortController();

      try {
        const { downloadUrl } = await firstValueFrom(
          getAttachmentDownloadUrl(note.id, attachment.id)
        );

        const response = await fetch(downloadUrl, { signal: controller.signal });

        if (!response.ok) {
          skipForSession.add(key);
          continue;
        }

        const length = Number(response.headers.get("Content-Length") ?? 0);

        if (length > MAX_FILE_BYTES || length > free) {
          controller.abort();
          skipForSession.add(key);
          continue;
        }

        const blob = await response.blob();
        const stored = await putAttachmentBlob(
          userId,
          note.id,
          attachment.id,
          blob,
          attachment.filename,
          attachment.mimeType,
          { evict: false }
        );

        if (stored) {
          free -= blob.size;
        } else {
          skipForSession.add(key);
        }
      } catch (err) {
        const status = (err as { status?: number })?.status;

        // Lost connectivity: stop and let a later sync pick up where we left off.
        if (status === undefined && (!navigator.onLine || !useNetworkSlice.getState().online)) {
          return;
        }

        // Best-effort — skip this attachment and keep going, but leave a
        // breadcrumb (e.g. a CORS failure) for remote debugging.
        skipForSession.add(key);
        console.warn(`Failed to cache attachment ${attachment.id} (note ${note.id}):`, err);
      }
    }
  }
};
