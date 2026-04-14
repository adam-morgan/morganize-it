import { v4 as uuid } from "uuid";
import { catchError, defer, map, mergeMap, Observable, of, switchMap, throwError } from "rxjs";
import { HttpRequest } from "../request";
import { HttpResponse } from "../response";
import { getFriendshipService } from "@/server/features/friends";
import { getAuthService } from "@/server/features/auth";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/server/errors";
import {
  affectedUsersForFriendship,
  publishEvent,
  RealtimeAction,
  RealtimeResourceType,
} from "@/server/features/realtime";

const publishFriendship = (
  friendship: Friendship,
  resourceType: RealtimeResourceType,
  action: RealtimeAction
): Observable<Friendship> =>
  publishEvent(
    {
      type: "resource.changed",
      resourceType,
      resourceId: friendship.id,
      action,
    },
    affectedUsersForFriendship(friendship)
  ).pipe(map(() => friendship));

const errToResponse = (e: { code?: number; message: string }): HttpResponse<ApiError> => ({
  status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
  body: { message: e.message },
});

const requireAuth = <T>(
  req: HttpRequest<T>
): Observable<HttpResponse<ApiError>> | null => {
  if (!req.userId) {
    return of({ status: 401, body: { message: "Unauthorized" } });
  }
  return null;
};

export const listFriends = (
  req: HttpRequest<void>
): Observable<HttpResponse<Friend[] | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;

  return getFriendshipService()
    .listFriends(req.userId!)
    .pipe(
      map((friends) => ({ status: 200, body: friends }) as HttpResponse<Friend[]>),
      catchError((e) => of(errToResponse(e)))
    );
};

export const listIncomingRequests = (
  req: HttpRequest<void>
): Observable<HttpResponse<FriendRequest[] | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;

  return getFriendshipService()
    .listIncomingRequests(req.userId!)
    .pipe(
      map((items) => ({ status: 200, body: items }) as HttpResponse<FriendRequest[]>),
      catchError((e) => of(errToResponse(e)))
    );
};

export const listOutgoingRequests = (
  req: HttpRequest<void>
): Observable<HttpResponse<FriendRequest[] | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;

  return getFriendshipService()
    .listOutgoingRequests(req.userId!)
    .pipe(
      map((items) => ({ status: 200, body: items }) as HttpResponse<FriendRequest[]>),
      catchError((e) => of(errToResponse(e)))
    );
};

type FriendRequestBody = { email: string };

export const sendFriendRequest = (
  req: HttpRequest<FriendRequestBody>
): Observable<HttpResponse<Friendship | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const email = (req.body?.email ?? "").trim().toLowerCase();
  if (!email) {
    return of({ status: 400, body: { message: "Email required" } });
  }

  return defer(() => getAuthService().getUserByEmail(email, false)).pipe(
    switchMap((target) => {
      if (!target) {
        return throwError(() => new NotFoundError("No user with that email"));
      }
      if (target.id === me) {
        return throwError(() => new BadRequestError("Cannot friend yourself"));
      }
      return getFriendshipService()
        .findBetween(me, target.id)
        .pipe(
          switchMap((existing) => {
            const now = new Date().toISOString();

            if (existing) {
              if (existing.status === "accepted") {
                return throwError(() => new ConflictError("Already friends"));
              }
              // Pending exists. If the other side requested first, accepting it forms the friendship.
              if (existing.recipientId === me) {
                return getFriendshipService()
                  .updateStatus(existing.id, "accepted")
                  .pipe(
                    mergeMap((accepted) =>
                      publishFriendship(accepted, "friendship", "accepted")
                    )
                  );
              }
              // Otherwise we already sent a pending request — return it.
              return of(existing);
            }

            const friendship: Friendship = {
              id: uuid(),
              requesterId: me,
              recipientId: target.id,
              status: "pending",
              createdAt: now,
              updatedAt: now,
            };
            return getFriendshipService()
              .create(friendship)
              .pipe(
                mergeMap((created) =>
                  publishFriendship(created, "friend-request", "created")
                )
              );
          })
        );
    }),
    map((friendship) => ({ status: 201, body: friendship }) as HttpResponse<Friendship>),
    catchError((e) => of(errToResponse(e)))
  );
};

export const acceptFriendRequest = (
  req: HttpRequest<void>
): Observable<HttpResponse<Friendship | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const id = req.params.id;

  return getFriendshipService()
    .findById(id)
    .pipe(
      switchMap((existing) => {
        if (!existing) return throwError(() => new NotFoundError("Friendship not found"));
        if (existing.recipientId !== me) {
          return throwError(() => new ForbiddenError("Forbidden"));
        }
        if (existing.status === "accepted") return of(existing);
        return getFriendshipService()
          .updateStatus(id, "accepted")
          .pipe(
            mergeMap((accepted) => publishFriendship(accepted, "friendship", "accepted"))
          );
      }),
      map((friendship) => ({ status: 200, body: friendship }) as HttpResponse<Friendship>),
      catchError((e) => of(errToResponse(e)))
    );
};

const denyOrCancel = (
  req: HttpRequest<void>,
  asRecipient: boolean
): Observable<HttpResponse<void | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const id = req.params.id;

  return getFriendshipService()
    .findById(id)
    .pipe(
      switchMap((existing) => {
        if (!existing) return throwError(() => new NotFoundError("Friendship not found"));
        if (existing.status !== "pending") {
          return throwError(() => new BadRequestError("Friendship is not pending"));
        }
        const expectedSide = asRecipient ? existing.recipientId : existing.requesterId;
        if (expectedSide !== me) {
          return throwError(() => new ForbiddenError("Forbidden"));
        }
        return getFriendshipService()
          .delete(id)
          .pipe(
            mergeMap(() =>
              publishFriendship(
                existing,
                "friend-request",
                asRecipient ? "declined" : "deleted"
              )
            )
          );
      }),
      map(() => ({ status: 204 }) as HttpResponse<void>),
      catchError((e) => of(errToResponse(e)))
    );
};

export const denyFriendRequest = (req: HttpRequest<void>) => denyOrCancel(req, true);
export const cancelFriendRequest = (req: HttpRequest<void>) => denyOrCancel(req, false);

export const removeFriend = (
  req: HttpRequest<void>,
  onAfterDelete?: (friendship: Friendship) => Observable<void>
): Observable<HttpResponse<void | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const id = req.params.id;

  return getFriendshipService()
    .findById(id)
    .pipe(
      switchMap((existing) => {
        if (!existing) return throwError(() => new NotFoundError("Friendship not found"));
        if (existing.requesterId !== me && existing.recipientId !== me) {
          return throwError(() => new ForbiddenError("Forbidden"));
        }
        return getFriendshipService()
          .delete(id)
          .pipe(
            switchMap(() => (onAfterDelete ? onAfterDelete(existing) : of(undefined))),
            mergeMap(() => publishFriendship(existing, "friendship", "deleted"))
          );
      }),
      map(() => ({ status: 204 }) as HttpResponse<void>),
      catchError((e) => of(errToResponse(e)))
    );
};
