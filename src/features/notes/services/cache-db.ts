import { IDBPDatabase, openDB } from "idb";

const DB_VERSION = 6;

const getDbName = (userId: string) => `morganizeit-cache-${userId}`;

let dbPromises: Record<string, Promise<IDBPDatabase>> = {};

export const getCacheDb = (userId: string): Promise<IDBPDatabase> => {
  const name = getDbName(userId);

  if (!dbPromises[name]) {
    dbPromises[name] = openDB(name, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains("notebooks")) {
          const notebooks = db.createObjectStore("notebooks", { keyPath: "id" });
          notebooks.createIndex("updatedAt", "updatedAt");
        }

        if (!db.objectStoreNames.contains("notes")) {
          const notes = db.createObjectStore("notes", { keyPath: "id" });
          notes.createIndex("notebookId", "notebookId");
          notes.createIndex("updatedAt", "updatedAt");
        }

        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }

        // v5: offline write queue + attachment blob cache. Purely additive — we
        // must NOT touch the existing notebooks/notes/meta stores here, so an
        // online user's valid v4 cache survives the 4 -> 5 upgrade untouched.
        if (!db.objectStoreNames.contains("mutations")) {
          const mutations = db.createObjectStore("mutations", { keyPath: "id" });
          mutations.createIndex("timestamp", "timestamp");
          mutations.createIndex("entityId", "entityId");
          mutations.createIndex("status", "status");
        }

        if (!db.objectStoreNames.contains("attachments")) {
          const attachments = db.createObjectStore("attachments", { keyPath: "key" });
          attachments.createIndex("noteId", "noteId");
          attachments.createIndex("lastAccess", "lastAccess");
        }

        // v4: unified stores — drop separate shared stores from v2/v3 and
        // clear owned stores so the first sync pulls everything fresh (old
        // entries lack the accessLevel field added in v4).
        for (const name of ["shared-notebooks", "shared-notes", "shared-notebook-notes"]) {
          if (db.objectStoreNames.contains(name)) {
            db.deleteObjectStore(name);
          }
        }
        if (oldVersion < 4) {
          tx.objectStore("notebooks").clear();
          tx.objectStore("notes").clear();
          tx.objectStore("meta").clear();
        }

        // v6: force one full re-sync to recover notebooks dropped from the cache by
        // the shadow-notebook sync bug.
        if (oldVersion > 0 && oldVersion < 6) {
          tx.objectStore("meta").delete("lastSync");
        }
      },
    });
  }

  return dbPromises[name];
};

export const getLastSync = async (userId: string): Promise<string | null> => {
  const db = await getCacheDb(userId);
  const record = await db.get("meta", "lastSync");
  return record?.value ?? null;
};

export const setLastSync = async (userId: string, timestamp: string): Promise<void> => {
  const db = await getCacheDb(userId);
  await db.put("meta", { key: "lastSync", value: timestamp });
};

// Client clock time of the last successful sync. Unlike `lastSync` (a server
// cursor based on owned items' updatedAt) this measures how stale the cache is.
export const getLastSyncedAt = async (userId: string): Promise<number | null> => {
  const db = await getCacheDb(userId);
  const record = await db.get("meta", "lastSyncedAt");
  return record?.value ?? null;
};

export const setLastSyncedAt = async (userId: string, timestamp: number): Promise<void> => {
  const db = await getCacheDb(userId);
  await db.put("meta", { key: "lastSyncedAt", value: timestamp });
};

export const hasCachedEntities = async (userId: string): Promise<boolean> => {
  const db = await getCacheDb(userId);
  const [notebooks, notes] = await Promise.all([db.count("notebooks"), db.count("notes")]);
  return notebooks > 0 || notes > 0;
};

export const replaceEntityCache = async (
  userId: string,
  notebooks: SyncNotebook[],
  notes: SyncNote[],
  lastSync: string | null
): Promise<void> => {
  const db = await getCacheDb(userId);
  const tx = db.transaction(["notebooks", "notes", "meta"], "readwrite");
  const notebookStore = tx.objectStore("notebooks");
  const noteStore = tx.objectStore("notes");
  const metaStore = tx.objectStore("meta");

  await Promise.all([notebookStore.clear(), noteStore.clear(), metaStore.clear()]);

  await Promise.all([
    ...notebooks.map((nb) => notebookStore.put(nb)),
    ...notes.map((note) => noteStore.put(note)),
    ...(lastSync ? [metaStore.put({ key: "lastSync", value: lastSync })] : []),
  ]);

  await tx.done;
};

// Full wipe of everything for this user, including the mutation queue and cached
// attachments. Use on logout only — never for routine re-syncs.
export const clearCache = async (userId: string): Promise<void> => {
  const db = await getCacheDb(userId);
  const tx = db.transaction(
    ["notebooks", "notes", "meta", "mutations", "attachments"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("notebooks").clear(),
    tx.objectStore("notes").clear(),
    tx.objectStore("meta").clear(),
    tx.objectStore("mutations").clear(),
    tx.objectStore("attachments").clear(),
    tx.done,
  ]);
};
