import { getNotePermissionResolver, getNoteService } from "@/server/features/notes";
import { AuthenticatedReactiveRoutes } from "../authenticated-reactive-routes";

export class NoteRoutes extends AuthenticatedReactiveRoutes<Note> {
  constructor() {
    super(getNoteService(), getNotePermissionResolver());
  }
}
