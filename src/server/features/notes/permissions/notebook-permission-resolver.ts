import { UserEntityPermissionResolver } from "@/server/permissions/user-entity-permission-resolver";
import { getNotebookService } from "../services";

export class NotebookPermissionResolver extends UserEntityPermissionResolver<Notebook> {
  constructor() {
    super(getNotebookService());
  }
}
