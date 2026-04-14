import { Request, Response, Router } from "express";
import { take } from "rxjs";
import {
  createShare,
  deleteShare,
  listSharedNotebooks,
  listSharedNotes,
  listSharesForResource,
  updateShare,
} from "@/server/http/routes/shares";
import { handleHttpResponse, makeHttpRequest } from "../util";

type CreateShareBody = {
  resourceType: ShareResourceType;
  resourceId: string;
  sharedWithUserId: string;
  permission: SharePermission;
};

type UpdateShareBody = { permission: SharePermission };

export const sharesRoutes = (router: Router) => {
  router.get("/shares/notebooks", (req: Request<void>, res: Response) => {
    listSharedNotebooks(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.get("/shares/notes", (req: Request<void>, res: Response) => {
    listSharedNotes(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.get("/shares/resource", (req: Request<void>, res: Response) => {
    listSharesForResource(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.post("/shares", (req: Request<CreateShareBody>, res: Response) => {
    createShare(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.patch("/shares/:id", (req: Request<UpdateShareBody>, res: Response) => {
    updateShare(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.delete("/shares/:id", (req: Request<void>, res: Response) => {
    deleteShare(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });
};
