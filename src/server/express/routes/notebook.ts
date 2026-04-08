import { Request, Response, Router } from "express";
import { createReactiveServiceRoutes } from "../reactive-service-routes";
import { NotebookRoutes } from "@/server/http/routes/notebook";
import { getNotebookService } from "@/server/features/notes";
import { firstValueFrom } from "rxjs";

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
      await firstValueFrom(svc.permanentDelete(req.params.id));
      res.status(204).end();
    })().catch((err) => {
      res.status(500).json({ message: (err as Error).message });
    });
  });

  createReactiveServiceRoutes(router, "/notebooks", new NotebookRoutes());
};
