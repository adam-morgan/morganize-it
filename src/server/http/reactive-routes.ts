import { ReactiveService } from "@/server/db/reactive-service";
import { catchError, map, Observable, of } from "rxjs";
import { v4 as uuid } from "uuid";
import { HttpRequest } from "./request";
import { HttpResponse } from "./response";

export class ReactiveRoutes<T extends Entity> {
  constructor(private svc: ReactiveService<T>) {}

  public findById(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    return this.svc.findById(req.params.id, req.userId).pipe(
      map((foundObj) => ({ status: 200, body: foundObj })),
      catchError((e) =>
        of({
          status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
          body: { message: e.message },
        })
      )
    );
  }

  public create(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    return this.svc.create({ ...req.body, id: req.body.id ?? uuid() }).pipe(
      map((createdObj) => ({ status: 201, body: createdObj })),
      catchError((e) =>
        of({
          status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
          body: { message: e.message },
        })
      )
    );
  }

  public update(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    return this.svc.update(req.params.id, { ...req.body, id: req.params.id }).pipe(
      map((updatedObj) => ({ status: 200, body: updatedObj })),
      catchError((e) =>
        of({
          status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
          body: { message: e.message },
        })
      )
    );
  }

  public patch(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    return this.svc.patch(req.params.id, { ...req.body, id: req.params.id }).pipe(
      map((updatedObj) => ({ status: 200, body: updatedObj })),
      catchError((e) =>
        of({
          status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
          body: { message: e.message },
        })
      )
    );
  }

  public delete(req: HttpRequest<T>): Observable<HttpResponse<void | ApiError>> {
    return this.svc.delete(req.params.id).pipe(
      map(() => ({ status: 204 })),
      catchError((e) =>
        of({
          status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
          body: { message: e.message },
        })
      )
    );
  }
}
