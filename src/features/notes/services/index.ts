import { ApiNotesService } from "./api-notes-service";
import { LocalNotesService } from "./local-notes-service";
import { NotesService } from "./notes-service";

export const getNotesService = (user: User): NotesService => {
  if ((user as GuestUser).isGuest) {
    return new LocalNotesService();
  }
  return new ApiNotesService(user.id as string);
};
