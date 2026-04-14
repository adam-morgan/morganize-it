import { Request, Response, Router } from "express";
import { take } from "rxjs";
import {
  getSharedNote,
  getSharedNotebook,
  listSharedNotebookNotes,
} from "@/server/http/routes/shared-resources";
import { handleHttpResponse, makeHttpRequest } from "../util";

export const sharedResourceRoutes = (router: Router) => {
  router.get("/shared/notebooks/:id", (req: Request<void>, res: Response) => {
    getSharedNotebook(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.get("/shared/notebooks/:id/notes", (req: Request<void>, res: Response) => {
    listSharedNotebookNotes(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.get("/shared/notes/:id", (req: Request<void>, res: Response) => {
    getSharedNote(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });
};
