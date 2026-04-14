import { Request, Response, Router } from "express";
import { createReactiveServiceRoutes } from "../reactive-service-routes";
import { NotebookRoutes } from "@/server/http/routes/notebook";
import { getNotebookService, getNoteService } from "@/server/features/notes";
import { firstValueFrom } from "rxjs";
import { affectedUsersForNotebook, publishEvent } from "@/server/features/realtime";
import { getAttachmentStorage } from "@/server/features/attachments";

export const notebookRoutes = (router: Router) => {
  router.delete("/notebooks/:id/permanent", (req: Request, res: Response) => {
    if (!req.jwtUserId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const svc = getNotebookService();
    (async () => {
      const result = await firstValueFrom(svc.find({ criteria: { id: req.params.id }, includeSoftDeleted: true }, req.jwtUserId));
      if (result.items.length === 0) {
        res.status(404).json({ message: "Not found" });
        return;
      }

      // Clean up attachments for all notes in this notebook before cascade deletes them.
      const notesResult = await firstValueFrom(
        getNoteService().find({ criteria: { notebookId: req.params.id }, includeSoftDeleted: true }, req.jwtUserId)
      );
      const storage = getAttachmentStorage();
      for (const n of notesResult.items) {
        if (n.attachments && n.attachments.length > 0) {
          await firstValueFrom(storage.deleteAllForNote(n.id));
        }
      }

      // Capture affected users BEFORE delete — cascade removes share rows.
      const userIds = await firstValueFrom(affectedUsersForNotebook(req.params.id));
      await firstValueFrom(svc.permanentDelete(req.params.id));
      await firstValueFrom(
        publishEvent(
          {
            type: "resource.changed",
            resourceType: "notebook",
            resourceId: req.params.id,
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

  createReactiveServiceRoutes(router, "/notebooks", new NotebookRoutes());
};
