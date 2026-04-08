import { ApiNotesService } from "./api-notes-service";
import { CachedNotesService } from "./cached-notes-service";
import { LocalNotesService } from "./local-notes-service";
import { NotesService } from "./notes-service";
import { SyncManager } from "./sync-manager";

export const getNotesService = (user: User): NotesService => {
  if ((user as GuestUser).isGuest) {
    return new LocalNotesService();
  }
  return new CachedNotesService(new ApiNotesService(user.id as string), user.id as string);
};

export const getSyncManager = (user: User): SyncManager | null => {
  if ((user as GuestUser).isGuest) {
    return null;
  }
  return new SyncManager(user.id as string);
};
