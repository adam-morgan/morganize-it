import { Request, Response, Router } from "express";
import { take } from "rxjs";
import { ReactiveRoutes } from "../http";
import { handleHttpResponse, makeHttpRequest } from "./util";

export const createReactiveServiceRoutes = <T extends Entity>(
  router: Router,
  routePrefix: string,
  reactiveRoutes: ReactiveRoutes<T>
) => {
  router.post(`${routePrefix}`, (req: Request<T>, res: Response<T | ApiError>) => {
    reactiveRoutes
      .create(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });
};
