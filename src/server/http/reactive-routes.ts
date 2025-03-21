import { ReactiveService } from "@/server/db/reactive-service";
import { HttpRequest } from "./request";
import { catchError, map, Observable, of } from "rxjs";
import { HttpResponse } from "./response";

export class ReactiveRoutes<T> {
  constructor(private svc: ReactiveService<T>) {}

  public create(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    return this.svc.create(req.body).pipe(
      map((createdObj) => ({ status: 201, body: createdObj })),
      catchError((e) => of({ status: e.code ?? 500, body: { message: e.message } }))
    );
  }
}
