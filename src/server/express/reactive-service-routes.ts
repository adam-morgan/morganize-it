import { Request, Response, Router } from "express";
import { TableID } from "../db/reactive-service";
import { ReactiveRoutes } from "../http";
import { handleHttpResponse, makeHttpRequest } from "./util";
import { take } from "rxjs";

export const createReactiveServiceRoutes = <T, ID extends TableID>(
  router: Router,
  routePrefix: string,
  reactiveRoutes: ReactiveRoutes<T, ID>
) => {
  router.post(`/${routePrefix}`, (req: Request<T>, res: Response<T | ApiError>) => {
    reactiveRoutes
      .create(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });
};
