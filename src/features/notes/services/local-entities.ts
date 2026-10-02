import { openDB } from "idb";
import { getCacheDb } from "./cache-db";

const openUserDb = (user: User) =>
  (user as GuestUser).isGuest ? openDB("morganizeit", 2) : getCacheDb(user.id);

export const getAllLocalNotes = async (user: User): Promise<SyncNote[]> => {
  const db = await openUserDb(user);

  return db.getAll("notes");
};

export const getAllLocalNotebooks = async (user: User): Promise<SyncNotebook[]> => {
  const db = await openUserDb(user);

  return db.getAll("notebooks");
};
