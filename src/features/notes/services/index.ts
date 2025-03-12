import { LocalNotesService } from "./local-notes-service";
import { NotesService } from "./notes-service";

export const getNotesService = (_user: User): NotesService => {
  // TODO
  return new LocalNotesService();
};
