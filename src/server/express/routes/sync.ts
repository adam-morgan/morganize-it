import { Request, Response, Router } from "express";
import { take } from "rxjs";
import { sync } from "@/server/http/routes/sync";
import { handleHttpResponse, makeHttpRequest } from "../util";

type SyncBody = { lastSync?: string };

export const syncRoutes = (router: Router) => {
  router.post("/sync", (req: Request<SyncBody>, res: Response) => {
    sync(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });
};
