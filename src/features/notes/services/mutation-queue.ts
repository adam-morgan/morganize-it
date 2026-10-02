import { v4 as uuid } from "uuid";
import { getCacheDb } from "./cache-db";

export type MutationEntityType = "notebook" | "note" | "attachment";
export type MutationOp = "create" | "update" | "delete";

// pending  — eligible to flush once `nextAttempt` (if any) has elapsed
// inflight — currently being sent; never coalesced against
// failed   — exhausted retries (poison); excluded from auto-drain, kept for the
//            UI / manual retry so queued work is never silently dropped
export type MutationStatus = "pending" | "inflight" | "failed";

export type PendingMutation = {
  id: string; // the mutation's own id, NOT the entity id
  entityType: MutationEntityType;
  op: MutationOp;
  entityId: string;
  parentId?: string; // for notes: the notebookId (dependency / cascade anchor)
  payload: Record<string, unknown> | null; // request body for create/update
  timestamp: number; // FIFO ordering key
  seq: number; // monotonic tiebreaker for same-millisecond enqueues
  retryCount: number;
  status: MutationStatus;
  nextAttempt?: number; // epoch ms; backoff gate for transient retries
  lastError?: string;
};

const STORE = "mutations";

// Monotonic per-session counter. Resets on reload, which is fine: across
// sessions ordering is dominated by `timestamp`; `seq` only breaks ties within
// a single millisecond inside one session.
let seqCounter = 0;
const nextSeq = (): number => seqCounter++;

const getAll = async (userId: string): Promise<PendingMutation[]> => {
  const db = await getCacheDb(userId);
  return (await db.getAll(STORE)) as PendingMutation[];
};

export const enqueueCreate = async (
  userId: string,
  entityType: MutationEntityType,
  entityId: string,
  payload: Record<string, unknown>,
  parentId?: string
): Promise<void> => {
  const db = await getCacheDb(userId);

  const mutation: PendingMutation = {
    id: uuid(),
    entityType,
    op: "create",
    entityId,
    parentId,
    payload,
    timestamp: Date.now(),
    seq: nextSeq(),
    retryCount: 0,
    status: "pending",
  };

  await db.put(STORE, mutation);
};

// An offline attachment upload. The blob lives in the `attachments` store under
// `${noteId}#${tempFileId}`; this just records the intent to run the 3-step
// upload handshake on reconnect. Ordered after the note's create via timestamp.
export const enqueueAttachmentUpload = async (
  userId: string,
  noteId: string,
  tempFileId: string,
  filename: string,
  mimeType: string
): Promise<void> => {
  const db = await getCacheDb(userId);

  const mutation: PendingMutation = {
    id: uuid(),
    entityType: "attachment",
    op: "create",
    entityId: tempFileId,
    parentId: noteId,
    payload: { noteId, filename, mimeType },
    timestamp: Date.now(),
    seq: nextSeq(),
    retryCount: 0,
    status: "pending",
  };

  await db.put(STORE, mutation);
};

// Coalesces repeated edits to the same entity. An update folds into a pending
// create (so the create POSTs the already-edited entity) or into a prior
// pending update (latest-wins per field). Never coalesces against an inflight
// record — a fresh record is enqueued instead.
export const enqueueUpdate = async (
  userId: string,
  entityType: MutationEntityType,
  entityId: string,
  payload: Record<string, unknown>,
  parentId?: string
): Promise<void> => {
  const db = await getCacheDb(userId);
  const forEntity = ((await db.getAllFromIndex(STORE, "entityId", entityId)) as PendingMutation[]);

  const create = forEntity.find((m) => m.op === "create" && m.status !== "inflight");
  if (create) {
    create.payload = { ...(create.payload ?? {}), ...payload };
    await db.put(STORE, create);
    return;
  }

  const update = forEntity.find((m) => m.op === "update" && m.status !== "inflight");
  if (update) {
    // Keep the original timestamp/seq so the FIFO position is preserved.
    update.payload = { ...(update.payload ?? {}), ...payload };
    await db.put(STORE, update);
    return;
  }

  const mutation: PendingMutation = {
    id: uuid(),
    entityType,
    op: "update",
    entityId,
    parentId,
    payload,
    timestamp: Date.now(),
    seq: nextSeq(),
    retryCount: 0,
    status: "pending",
  };

  await db.put(STORE, mutation);
};

// Returns:
//  - neverSynced: the entity had a pending (un-sent) create, so it never reached
//    the server — all of its queued mutations are dropped and nothing is sent.
//  - droppedNoteIds: when a never-synced notebook is deleted, the ids of child
//    notes whose creates were also dropped (so the caller can purge their cache).
export const enqueueDelete = async (
  userId: string,
  entityType: MutationEntityType,
  entityId: string
): Promise<{ neverSynced: boolean; droppedNoteIds: string[] }> => {
  const db = await getCacheDb(userId);
  const all = await getAll(userId);
  const forEntity = all.filter((m) => m.entityId === entityId);

  const pendingCreate = forEntity.find((m) => m.op === "create" && m.status !== "inflight");
  const inflight = forEntity.some((m) => m.status === "inflight");
  const droppedNoteIds: string[] = [];

  const tx = db.transaction(STORE, "readwrite");

  if (pendingCreate && !inflight) {
    // Never reached the server — drop every queued mutation for this entity.
    for (const m of forEntity) {
      await tx.store.delete(m.id);
    }

    // Deleting a never-synced notebook also voids its child notes' un-sent
    // creates (their notebook will never exist server-side).
    if (entityType === "notebook") {
      for (const child of all.filter((m) => m.parentId === entityId && m.status !== "inflight")) {
        await tx.store.delete(child.id);
        if (child.op === "create") {
          droppedNoteIds.push(child.entityId);
        }
      }
    }

    await tx.done;
    return { neverSynced: true, droppedNoteIds };
  }

  // Entity was synced (or a create is mid-flight): drop pending updates/deletes
  // and enqueue a single delete.
  for (const m of forEntity) {
    if (m.status !== "inflight" && (m.op === "update" || m.op === "delete")) {
      await tx.store.delete(m.id);
    }
  }

  const mutation: PendingMutation = {
    id: uuid(),
    entityType,
    op: "delete",
    entityId,
    payload: null,
    timestamp: Date.now(),
    seq: nextSeq(),
    retryCount: 0,
    status: "pending",
  };

  await tx.store.put(mutation);
  await tx.done;

  return { neverSynced: false, droppedNoteIds };
};

// Mutations eligible to send right now, in FIFO order. Stops at the first one
// still backing off so a later mutation never overtakes one it may depend on
// (e.g. a note create overtaking its notebook create).
export const listForFlush = async (userId: string, now: number): Promise<PendingMutation[]> => {
  const all = await getAll(userId);
  const pending = all
    .filter((m) => m.status === "pending")
    .sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);

  const ready: PendingMutation[] = [];

  for (const m of pending) {
    if (m.nextAttempt != null && m.nextAttempt > now) break;

    ready.push(m);
  }

  return ready;
};

export const retryFailed = async (userId: string): Promise<number> => {
  const db = await getCacheDb(userId);
  const tx = db.transaction(STORE, "readwrite");
  const all = (await tx.store.getAll()) as PendingMutation[];
  const failed = all.filter((m) => m.status === "failed");

  for (const m of failed) {
    await tx.store.put({ ...m, status: "pending", retryCount: 0, nextAttempt: undefined });
  }

  await tx.done;

  return failed.length;
};

export const putMutation = async (userId: string, mutation: PendingMutation): Promise<void> => {
  const db = await getCacheDb(userId);
  await db.put(STORE, mutation);
};

export const removeMutation = async (userId: string, id: string): Promise<void> => {
  const db = await getCacheDb(userId);
  await db.delete(STORE, id);
};

// Recover from an app close / crash mid-flush: anything left inflight is reset
// to pending so it gets re-attempted.
export const resetInflight = async (userId: string): Promise<void> => {
  const db = await getCacheDb(userId);
  const tx = db.transaction(STORE, "readwrite");
  const all = (await tx.store.getAll()) as PendingMutation[];

  for (const m of all) {
    if (m.status === "inflight") {
      await tx.store.put({ ...m, status: "pending" });
    }
  }

  await tx.done;
};

export const counts = async (userId: string): Promise<{ pending: number; failed: number }> => {
  const all = await getAll(userId);
  return {
    pending: all.filter((m) => m.status !== "failed").length,
    failed: all.filter((m) => m.status === "failed").length,
  };
};
