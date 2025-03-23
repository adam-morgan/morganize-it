import { Request, Response, Router } from "express";
import { take } from "rxjs";
import { ReactiveRoutes } from "../http";
import { handleHttpResponse, makeHttpRequest } from "./util";

export const createReactiveServiceRoutes = <T extends Entity>(
  router: Router,
  routePrefix: string,
  reactiveRoutes: ReactiveRoutes<T>
) => {
  router.get(`${routePrefix}`, (req: Request<FindOptions>, res: Response<T[] | ApiError>) => {
    reactiveRoutes
      .find(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.post(`${routePrefix}/find`, (req: Request<FindOptions>, res: Response<T[] | ApiError>) => {
    reactiveRoutes
      .find(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.get(`${routePrefix}/:id`, (req: Request<T>, res: Response<T | ApiError>) => {
    reactiveRoutes
      .findById(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.post(`${routePrefix}`, (req: Request<T>, res: Response<T | ApiError>) => {
    reactiveRoutes
      .create(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.put(`${routePrefix}/:id`, (req: Request<T>, res: Response<T | ApiError>) => {
    reactiveRoutes
      .update(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.patch(`${routePrefix}/:id`, (req: Request<T>, res: Response<T | ApiError>) => {
    reactiveRoutes
      .patch(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.delete(`${routePrefix}/:id`, (req: Request<T>, res: Response<void | ApiError>) => {
    reactiveRoutes
      .delete(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });
};
