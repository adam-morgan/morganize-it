import { mergeMap, Observable, of } from "rxjs";
import { HttpRequest } from "../request";
import { HttpResponse } from "../response";
import { AuthenticatedReactiveRoutes } from "../authenticated-reactive-routes";
import { ReactiveService } from "@/server/db/reactive-service";
import { PermissionResolver } from "@/server/permissions";
import {
  publishEvent,
  RealtimeAction,
  RealtimeResourceType,
} from "@/server/features/realtime";

const isSuccess = (status: number): boolean => status >= 200 && status < 300;

export interface NotifyConfig<T extends Entity> {
  resourceType: RealtimeResourceType;
  /**
   * Resolve the userIds to notify after a successful mutation. The entity is
   * the mutation result for create/update/patch. For delete the entity is
   * undefined and the route id is provided in `id`.
   */
  resolveUsers(args: {
    action: RealtimeAction;
    entity?: T;
    id: string;
  }): Observable<string[]>;
  /**
   * Optional builder for extra event metadata (notebookId, deletedAt, etc).
   */
  buildMeta?(args: {
    action: RealtimeAction;
    entity?: T;
    id: string;
  }): { notebookId?: string; deletedAt?: string | null };
}

export class NotifyingReactiveRoutes<T extends Entity> extends AuthenticatedReactiveRoutes<T> {
  constructor(
    svc: ReactiveService<T>,
    permissionResolver: PermissionResolver<T> | undefined,
    private readonly notify: NotifyConfig<T>
  ) {
    super(svc, permissionResolver);
  }

  private fanOut(
    action: RealtimeAction,
    id: string,
    entity?: T
  ): Observable<void> {
    return this.notify.resolveUsers({ action, entity, id }).pipe(
      mergeMap((userIds) => {
        const meta = this.notify.buildMeta?.({ action, entity, id }) ?? {};
        return publishEvent(
          {
            type: "resource.changed",
            resourceType: this.notify.resourceType,
            resourceId: id,
            action,
            ...meta,
          },
          userIds
        );
      })
    );
  }

  private tapSuccess<R>(
    response$: Observable<HttpResponse<R>>,
    action: RealtimeAction,
    idFrom: (resp: HttpResponse<R>) => string | undefined
  ): Observable<HttpResponse<R>> {
    return response$.pipe(
      mergeMap((resp) => {
        if (!isSuccess(resp.status)) return of(resp);
        const id = idFrom(resp);
        if (!id) return of(resp);
        const entity =
          resp.body && typeof resp.body === "object"
            ? (resp.body as unknown as T)
            : undefined;
        return this.fanOut(action, id, entity).pipe(mergeMap(() => of(resp)));
      })
    );
  }

  override create(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    return this.tapSuccess(super.create(req), "created", (resp) =>
      typeof resp.body === "object" && resp.body && "id" in (resp.body as object)
        ? (resp.body as T).id
        : undefined
    );
  }

  override update(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    return this.tapSuccess(super.update(req), "updated", () => req.params.id);
  }

  override patch(req: HttpRequest<T>): Observable<HttpResponse<T | ApiError>> {
    return this.tapSuccess(super.patch(req), "updated", () => req.params.id);
  }

  override delete(req: HttpRequest<T>): Observable<HttpResponse<void | ApiError>> {
    return this.tapSuccess(super.delete(req), "deleted", () => req.params.id);
  }
}
