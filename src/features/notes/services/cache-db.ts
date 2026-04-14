import { IDBPDatabase, openDB } from "idb";

const DB_VERSION = 4;

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

export const clearCache = async (userId: string): Promise<void> => {
  const db = await getCacheDb(userId);
  const tx = db.transaction(["notebooks", "notes", "meta"], "readwrite");
  await Promise.all([
    tx.objectStore("notebooks").clear(),
    tx.objectStore("notes").clear(),
    tx.objectStore("meta").clear(),
    tx.done,
  ]);
};
