import { UserEntityPermissionResolver } from "@/server/permissions/user-entity-permission-resolver";
import { getNoteService } from "../services";

export class NotePermissionResolver extends UserEntityPermissionResolver<Note> {
  constructor() {
    super(getNoteService());
  }
}
