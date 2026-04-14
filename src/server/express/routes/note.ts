import { Request, Response, Router } from "express";
import { createReactiveServiceRoutes } from "../reactive-service-routes";
import { NoteRoutes } from "@/server/http/routes/note";
import { getNoteService } from "@/server/features/notes";
import { firstValueFrom } from "rxjs";
import { affectedUsersForNote, publishEvent } from "@/server/features/realtime";
import { getAttachmentStorage } from "@/server/features/attachments";

export const noteRoutes = (router: Router) => {
  router.delete("/notes/:id/permanent", (req: Request, res: Response) => {
    if (!req.jwtUserId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const svc = getNoteService();
    (async () => {
      const result = await firstValueFrom(svc.find({ criteria: { id: req.params.id }, includeSoftDeleted: true }, req.jwtUserId));
      if (result.items.length === 0) {
        res.status(404).json({ message: "Not found" });
        return;
      }

      const note = result.items[0];
      // Capture affected users BEFORE delete — cascade removes share rows.
      const userIds = await firstValueFrom(
        affectedUsersForNote(req.params.id, note.notebookId, note.userId)
      );
      await firstValueFrom(svc.permanentDelete(req.params.id));
      await firstValueFrom(getAttachmentStorage().deleteAllForNote(req.params.id));
      await firstValueFrom(
        publishEvent(
          {
            type: "resource.changed",
            resourceType: "note",
            resourceId: req.params.id,
            notebookId: note.notebookId,
            action: "deleted",
          },
          userIds
        )
      );
      res.status(204).end();
    })().catch((err) => {
      res.status(500).json({ message: (err as Error).message });
    });
  });

  createReactiveServiceRoutes(router, "/notes", new NoteRoutes());
};
