import { firstValueFrom } from "rxjs";
import { getCacheDb } from "./cache-db";
import { getAttachmentDownloadUrl } from "./attachment-service";

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

  if (record) {
    await db.put(STORE, { ...record, lastAccess: Date.now() });
  }

  return record;
};

const totalBytes = async (userId: string): Promise<number> => {
  const db = await getCacheDb(userId);
  const all = (await db.getAll(STORE)) as CachedAttachment[];
  return all.reduce((sum, a) => sum + (a.size ?? 0), 0);
};

// Evict least-recently-used blobs until `incoming` more bytes would fit.
const evictToBudget = async (userId: string, incoming: number): Promise<boolean> => {
  if (incoming > BUDGET_BYTES) {
    return false;
  }

  const db = await getCacheDb(userId);
  let used = await totalBytes(userId);

  if (used + incoming <= BUDGET_BYTES) {
    return true;
  }

  // Oldest access first.
  const byLru = (await db.getAllFromIndex(STORE, "lastAccess")) as CachedAttachment[];

  for (const victim of byLru) {
    if (used + incoming <= BUDGET_BYTES) {
      break;
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
  mimeType: string
): Promise<boolean> => {
  if (blob.size > MAX_FILE_BYTES) {
    return false;
  }

  const fits = await evictToBudget(userId, blob.size);
  if (!fits) {
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

// Download and cache any attachments referenced by the given notes that aren't
// cached yet. Resilient and best-effort: failures per attachment are skipped so
// one bad download never blocks the rest. Runs sequentially to avoid hammering
// the network/storage on the first fill. Must only be called while online.
export const cacheMissingAttachments = async (
  userId: string,
  notes: NoteWithAttachments[]
): Promise<void> => {
  const db = await getCacheDb(userId);

  for (const note of notes) {
    for (const attachment of note.attachments ?? []) {
      const existing = await db.get(STORE, keyOf(note.id, attachment.id));
      if (existing) {
        continue;
      }

      try {
        const { downloadUrl } = await firstValueFrom(
          getAttachmentDownloadUrl(note.id, attachment.id)
        );

        const response = await fetch(downloadUrl);
        if (!response.ok) {
          continue;
        }

        const blob = await response.blob();
        await putAttachmentBlob(userId, note.id, attachment.id, blob, attachment.filename, attachment.mimeType);
      } catch (err) {
        // Best-effort — skip this attachment and keep going, but leave a
        // breadcrumb (e.g. a CORS failure) for remote debugging.
        console.warn(`Failed to cache attachment ${attachment.id} (note ${note.id}):`, err);
      }
    }
  }
};
