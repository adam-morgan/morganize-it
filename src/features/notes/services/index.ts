import { ApiNotesService } from "./api-notes-service";
import { LocalNotesService } from "./local-notes-service";
import { NotesService } from "./notes-service";
import { OfflineNotesService } from "./offline-notes-service";
import { QueueProcessor, getQueueProcessor as getProcessor } from "./queue-processor";
import { SyncManager } from "./sync-manager";

export const getNotesService = (user: User): NotesService => {
  if ((user as GuestUser).isGuest) {
    return new LocalNotesService();
  }

  const userId = user.id as string;
  return new OfflineNotesService(new ApiNotesService(userId), userId, getProcessor(userId));
};

export const getQueueProcessor = (user: User): QueueProcessor | null => {
  if ((user as GuestUser).isGuest) {
    return null;
  }

  return getProcessor(user.id as string);
};

export const getSyncManager = (user: User): SyncManager | null => {
  if ((user as GuestUser).isGuest) {
    return null;
  }

  return new SyncManager(user.id as string);
};
