import { catchError, Observable, of, switchMap } from "rxjs";
import { ReactiveRoutes } from "./reactive-routes";
import { HttpRequest } from "./request";
import { HttpResponse } from "./response";
import { ReactiveService } from "../db/reactive-service";
import { PermissionResolver } from "../permissions";

export class AuthenticatedReactiveRoutes<T extends Entity> extends ReactiveRoutes<T> {
  constructor(
    svc: ReactiveService<T>,
    private permissionResolver?: PermissionResolver<T>
  ) {
    super(svc);
  }

  public override findById(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    if (!req.userId) {
      return of({ status: 401, body: { message: "Unauthorized" } });
    }

    return super.findById(req);
  }

  public override create(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    if (!req.userId) {
      return of({ status: 401, body: { message: "Unauthorized" } });
    }

    return (this.permissionResolver?.canCreate(req.userId, req.body) ?? of(true)).pipe(
      switchMap((canCreate) => {
        if (!canCreate) {
          return of({ status: 403, body: { message: "Forbidden" } });
        }

        return super.create(req);
      }),
      catchError((e) =>
        of({
          status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
          body: { message: e.message },
        })
      )
    );
  }

  public override update(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    if (!req.userId) {
      return of({ status: 401, body: { message: "Unauthorized" } });
    }

    const entity = { ...req.body, id: req.params.id };

    return (this.permissionResolver?.canUpdate(req.userId, entity) ?? of(true)).pipe(
      switchMap((canUpdate) => {
        if (!canUpdate) {
          return of({ status: 403, body: { message: "Forbidden" } });
        }

        return super.update(req);
      }),
      catchError((e) =>
        of({
          status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
          body: { message: e.message },
        })
      )
    );
  }

  public override patch(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    if (!req.userId) {
      return of({ status: 401, body: { message: "Unauthorized" } });
    }

    const entity = { ...req.body, id: req.params.id };

    return (this.permissionResolver?.canUpdate(req.userId, entity) ?? of(true)).pipe(
      switchMap((canUpdate) => {
        if (!canUpdate) {
          return of({ status: 403, body: { message: "Forbidden" } });
        }

        return super.patch(req);
      }),
      catchError((e) =>
        of({
          status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
          body: { message: e.message },
        })
      )
    );
  }

  public override delete(req: HttpRequest<T>): Observable<HttpResponse<void | ApiError>> {
    if (!req.userId) {
      return of({ status: 401, body: { message: "Unauthorized" } });
    }

    return (this.permissionResolver?.canDelete(req.userId, req.params.id) ?? of(true)).pipe(
      switchMap((canDelete) => {
        if (!canDelete) {
          return of({ status: 403, body: { message: "Forbidden" } });
        }

        return super.delete(req);
      }),
      catchError((e) =>
        of({
          status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
          body: { message: e.message },
        })
      )
    );
  }
}
