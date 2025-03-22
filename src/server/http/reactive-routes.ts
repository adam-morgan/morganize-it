import { ReactiveService } from "@/server/db/reactive-service";
import { catchError, map, Observable, of } from "rxjs";
import { v4 as uuid } from "uuid";
import { HttpRequest } from "./request";
import { HttpResponse } from "./response";

export class ReactiveRoutes<T extends Entity> {
  constructor(private svc: ReactiveService<T>) {}

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
}
