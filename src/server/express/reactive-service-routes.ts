import { Request, Response, Router } from "express";
import { ReactiveRoutes } from "../http";
import { handleHttpResponse, makeHttpRequest } from "./util";
import { take } from "rxjs";

export const createReactiveServiceRoutes = <T>(
  router: Router,
  routePrefix: string,
  reactiveRoutes: ReactiveRoutes<T>
) => {
  router.post(`/${routePrefix}`, (req: Request<T>, res: Response<T | ApiError>) => {
    reactiveRoutes
      .create(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });
};
