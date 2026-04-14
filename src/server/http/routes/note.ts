import { getNotePermissionResolver, getNoteService } from "@/server/features/notes";
import { NotifyingReactiveRoutes } from "./notifying-reactive-routes";
import { affectedUsersForNote } from "@/server/features/realtime";

export class NoteRoutes extends NotifyingReactiveRoutes<Note> {
  constructor() {
    super(getNoteService(), getNotePermissionResolver(), {
      resourceType: "note",
      resolveUsers: ({ entity, id }) =>
        affectedUsersForNote(id, entity?.notebookId, entity?.userId),
      buildMeta: ({ entity }) => {
        const meta: { notebookId?: string; deletedAt?: string | null } = {};
        if (entity?.notebookId) meta.notebookId = entity.notebookId;
        if (entity?.deletedAt !== undefined) meta.deletedAt = entity.deletedAt ?? null;
        return meta;
      },
    });
  }
}
