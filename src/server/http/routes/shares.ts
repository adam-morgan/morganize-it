import { v4 as uuid } from "uuid";
import { catchError, defer, forkJoin, map, mergeMap, Observable, of, switchMap, throwError } from "rxjs";
import { HttpRequest } from "../request";
import { HttpResponse } from "../response";
import { getShareService, getShareAccessService } from "@/server/features/shares";
import { getFriendshipService } from "@/server/features/friends";
import { getAuthService } from "@/server/features/auth";
import { getNotebookService, getNoteService } from "@/server/features/notes/services";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/server/errors";
import { affectedUsersForShare, publishEvent } from "@/server/features/realtime";

const errToResponse = (e: { code?: number; message: string }): HttpResponse<ApiError> => ({
  status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
  body: { message: e.message },
});

const requireAuth = <T>(req: HttpRequest<T>) => {
  if (!req.userId) {
    return of({ status: 401, body: { message: "Unauthorized" } } as HttpResponse<ApiError>);
  }
  return null;
};

const requireOwner = (
  userId: string,
  resourceType: ShareResourceType,
  resourceId: string
): Observable<void> =>
  (resourceType === "notebook"
    ? getShareAccessService().getNotebookAccess(userId, resourceId)
    : getShareAccessService().getNoteAccess(userId, resourceId)
  ).pipe(
    switchMap((level) =>
      level === "owner" ? of(undefined) : throwError(() => new ForbiddenError("Forbidden"))
    )
  );

/** GET /shares/resource?type=notebook|note&id=... — list shares for a resource. */
export const listSharesForResource = (
  req: HttpRequest<void>
): Observable<HttpResponse<ShareWithUser[] | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;

  const me = req.userId!;
  const type = req.query.type as ShareResourceType | undefined;
  const id = req.query.id as string | undefined;
  if (!type || !id) return of({ status: 400, body: { message: "type and id required" } });

  return requireOwner(me, type, id).pipe(
    switchMap(() => getShareService().findForResource(type, id)),
    switchMap((shares) => {
      if (shares.length === 0) return of([] as ShareWithUser[]);
      return forkJoin(
        shares.map((s) =>
          defer(() => getAuthService().getUser(s.sharedWithUserId, false)).pipe(
            map((user): ShareWithUser => ({
              ...s,
              user: { id: user.id, name: user.name, email: user.email },
            }))
          )
        )
      );
    }),
    map((items) => ({ status: 200, body: items }) as HttpResponse<ShareWithUser[]>),
    catchError((e) => of(errToResponse(e)))
  );
};

type CreateShareBody = {
  resourceType: ShareResourceType;
  resourceId: string;
  sharedWithUserId: string;
  permission: SharePermission;
};

/** POST /shares — owner-only; recipient must be an accepted friend. */
export const createShare = (
  req: HttpRequest<CreateShareBody>
): Observable<HttpResponse<Share | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const body = req.body;
  if (
    !body?.resourceType ||
    !body?.resourceId ||
    !body?.sharedWithUserId ||
    !body?.permission
  ) {
    return of({
      status: 400,
      body: { message: "resourceType, resourceId, sharedWithUserId, permission required" },
    });
  }
  if (body.sharedWithUserId === me) {
    return of({ status: 400, body: { message: "Cannot share with yourself" } });
  }

  return requireOwner(me, body.resourceType, body.resourceId).pipe(
    switchMap(() =>
      getFriendshipService()
        .findBetween(me, body.sharedWithUserId)
        .pipe(
          switchMap((friendship) => {
            if (!friendship || friendship.status !== "accepted") {
              return throwError(
                () => new BadRequestError("Recipient is not an accepted friend")
              );
            }
            return of(undefined);
          })
        )
    ),
    switchMap(() =>
      getShareService().findExisting(body.resourceType, body.resourceId, body.sharedWithUserId)
    ),
    switchMap((existing) => {
      if (existing) return throwError(() => new ConflictError("Already shared with this user"));
      // Resolve denormalized notebookId.
      const notebookIdSource =
        body.resourceType === "notebook"
          ? of(body.resourceId)
          : getNoteService()
              .findById(body.resourceId)
              .pipe(map((n) => n.notebookId));
      return notebookIdSource.pipe(
        switchMap((notebookId) => {
          const now = new Date().toISOString();
          const share: Share = {
            id: uuid(),
            resourceType: body.resourceType,
            resourceId: body.resourceId,
            ownerId: me,
            sharedWithUserId: body.sharedWithUserId,
            permission: body.permission,
            notebookId,
            createdAt: now,
            updatedAt: now,
          };
          return getShareService().create(share);
        })
      );
    }),
    mergeMap((share) =>
      publishEvent(
        {
          type: "resource.changed",
          resourceType: "share",
          resourceId: share.id,
          action: "created",
        },
        affectedUsersForShare(share)
      ).pipe(map(() => share))
    ),
    map((share) => ({ status: 201, body: share }) as HttpResponse<Share>),
    catchError((e) => of(errToResponse(e)))
  );
};

type UpdateShareBody = { permission: SharePermission };

/** PATCH /shares/:id — owner-only; update permission. */
export const updateShare = (
  req: HttpRequest<UpdateShareBody>
): Observable<HttpResponse<Share | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const id = req.params.id;
  const permission = req.body?.permission;
  if (!permission) return of({ status: 400, body: { message: "permission required" } });

  return getShareService()
    .findById(id)
    .pipe(
      switchMap((share) => {
        if (!share) return throwError(() => new NotFoundError("Share not found"));
        return requireOwner(me, share.resourceType, share.resourceId).pipe(
          switchMap(() =>
            getShareService().update(id, {
              ...share,
              permission,
              updatedAt: new Date().toISOString(),
            })
          )
        );
      }),
      mergeMap((share) =>
        publishEvent(
          {
            type: "resource.changed",
            resourceType: "share",
            resourceId: share.id,
            action: "updated",
          },
          affectedUsersForShare(share)
        ).pipe(map(() => share))
      ),
      map((share) => ({ status: 200, body: share }) as HttpResponse<Share>),
      catchError((e) => of(errToResponse(e)))
    );
};

/** DELETE /shares/:id — owner of resource OR recipient (leave). */
export const deleteShare = (
  req: HttpRequest<void>
): Observable<HttpResponse<void | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const id = req.params.id;

  return getShareService()
    .findById(id)
    .pipe(
      switchMap((share) => {
        if (!share) return throwError(() => new NotFoundError("Share not found"));
        const doDelete = (): Observable<Share> =>
          getShareService().delete(id).pipe(map(() => share));
        if (share.sharedWithUserId === me) {
          // Recipient leaving the share.
          return doDelete();
        }
        return requireOwner(me, share.resourceType, share.resourceId).pipe(
          switchMap(() => doDelete())
        );
      }),
      mergeMap((share) =>
        publishEvent(
          {
            type: "resource.changed",
            resourceType: "share",
            resourceId: share.id,
            action: "deleted",
          },
          affectedUsersForShare(share)
        ).pipe(map(() => undefined))
      ),
      map(() => ({ status: 204 }) as HttpResponse<void>),
      catchError((e) => of(errToResponse(e)))
    );
};

/** GET /shares/notebooks — notebooks shared WITH me. */
export const listSharedNotebooks = (
  req: HttpRequest<void>
): Observable<HttpResponse<SharedNotebook[] | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;

  return getShareService()
    .findSharedWith(me, "notebook")
    .pipe(
      switchMap((shares) => {
        if (shares.length === 0) return of([] as SharedNotebook[]);
        return forkJoin(
          shares.map((share) =>
            forkJoin([
              getNotebookService()
                .findById(share.resourceId)
                .pipe(catchError(() => of(undefined))),
              defer(() => getAuthService().getUser(share.ownerId, false)).pipe(
                catchError(() => of(undefined))
              ),
            ]).pipe(
              map(([notebook, owner]) => {
                if (!notebook || notebook.deletedAt || !owner) return undefined;
                return {
                  ...notebook,
                  permission: share.permission,
                  ownerName: owner.name,
                  ownerEmail: owner.email,
                  shareId: share.id,
                } as SharedNotebook;
              })
            )
          )
        ).pipe(map((items) => items.filter((i): i is SharedNotebook => i != null)));
      }),
      map((items) => ({ status: 200, body: items }) as HttpResponse<SharedNotebook[]>),
      catchError((e) => of(errToResponse(e)))
    );
};

/** GET /shares/notes — notes shared with me, with parent notebook hydration. */
export const listSharedNotes = (
  req: HttpRequest<void>
): Observable<HttpResponse<SharedNote[] | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;

  return getShareService()
    .findSharedWith(me, "note")
    .pipe(
      switchMap((shares) => {
        if (shares.length === 0) return of([] as SharedNote[]);
        return forkJoin(
          shares.map((share) =>
            forkJoin([
              getNoteService()
                .findById(share.resourceId)
                .pipe(catchError(() => of(undefined))),
              getNotebookService()
                .findById(share.notebookId)
                .pipe(catchError(() => of(undefined))),
              defer(() => getAuthService().getUser(share.ownerId, false)).pipe(
                catchError(() => of(undefined))
              ),
            ]).pipe(
              map(([note, notebook, owner]) => {
                if (!note || note.deletedAt || !notebook || notebook.deletedAt || !owner)
                  return undefined;
                return {
                  ...note,
                  permission: share.permission,
                  ownerName: owner.name,
                  ownerEmail: owner.email,
                  parentNotebookName: notebook.name,
                  shareId: share.id,
                } as SharedNote;
              })
            )
          )
        ).pipe(map((items) => items.filter((i): i is SharedNote => i != null)));
      }),
      map((items) => ({ status: 200, body: items }) as HttpResponse<SharedNote[]>),
      catchError((e) => of(errToResponse(e)))
    );
};
