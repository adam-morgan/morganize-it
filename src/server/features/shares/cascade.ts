import { forkJoin, mergeMap, Observable, of, switchMap } from "rxjs";
import { getShareService } from "./services";
import {
  affectedUsersForShare,
  publishEvent,
} from "@/server/features/realtime";

/**
 * Delete every share between two users, in either direction. Used when a
 * friendship is removed so neither party retains access to the other's
 * shared resources. Each removed share is fanned out as a `share.deleted`
 * realtime event so connected clients drop the resource from their UI.
 */
export const revokeSharesBetween = (
  userIdA: string,
  userIdB: string
): Observable<void> => {
  const svc = getShareService();
  return forkJoin([
    svc.findOwnedByDirected(userIdA, userIdB),
    svc.findOwnedByDirected(userIdB, userIdA),
  ]).pipe(
    switchMap(([fromA, fromB]) => {
      const all = [...fromA, ...fromB];
      if (all.length === 0) return of(undefined);
      return forkJoin(
        all.map((s) =>
          svc.delete(s.id).pipe(
            mergeMap(() =>
              publishEvent(
                {
                  type: "resource.changed",
                  resourceType: "share",
                  resourceId: s.id,
                  action: "deleted",
                },
                affectedUsersForShare(s)
              )
            )
          )
        )
      ).pipe(switchMap(() => of(undefined)));
    })
  );
};
