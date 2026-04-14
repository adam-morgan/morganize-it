import { getNotebookPermissionResolver, getNotebookService } from "@/server/features/notes";
import { NotifyingReactiveRoutes } from "./notifying-reactive-routes";
import { affectedUsersForNotebook } from "@/server/features/realtime";

export class NotebookRoutes extends NotifyingReactiveRoutes<Notebook> {
  constructor() {
    super(getNotebookService(), getNotebookPermissionResolver(), {
      resourceType: "notebook",
      resolveUsers: ({ entity, id }) =>
        affectedUsersForNotebook(id, entity?.userId),
      buildMeta: ({ entity }) =>
        entity?.deletedAt !== undefined ? { deletedAt: entity.deletedAt ?? null } : {},
    });
  }
}
