import { from, map, Observable, of, switchMap, throwError, forkJoin } from "rxjs";
import { getTableName } from "@/server/db/dynamo/client";
import { friendshipsTableSchema } from "@/server/db/dynamo/tables";
import { ReactiveDynamoService } from "@/server/db/dynamo/reactive-dynamo-service";
import { NotFoundError } from "@/server/errors";
import { getAuthService } from "@/server/features/auth";
import { FriendshipService } from "./friendship.service";

export class FriendshipDynamoService implements FriendshipService {
  private get tableName() {
    return getTableName("Friendships");
  }

  private get baseSvc(): ReactiveDynamoService<Friendship> {
    return new ReactiveDynamoService<Friendship>(this.tableName, friendshipsTableSchema, "id");
  }

  private hydrateUsers(
    rows: Friendship[],
    counterpartyOf: (f: Friendship) => string
  ): Observable<Friend[]> {
    if (rows.length === 0) return of([]);
    const auth = getAuthService();

    return forkJoin(
      rows.map((f) =>
        from(auth.getUser(counterpartyOf(f), false)).pipe(
          map((user) => ({
            friendshipId: f.id,
            createdAt: f.createdAt,
            userId: user.id,
            name: user.name,
            email: user.email,
          }))
        )
      )
    );
  }

  listFriends(userId: string): Observable<Friend[]> {
    // Need rows where requesterId=me AND status=accepted, plus recipientId=me AND status=accepted.
    return forkJoin([
      this.baseSvc.find({ criteria: { requesterId: userId, status: "accepted" } }),
      this.baseSvc.find({ criteria: { recipientId: userId, status: "accepted" } }),
    ]).pipe(
      switchMap(([asRequester, asRecipient]) => {
        const all = [...asRequester.items, ...asRecipient.items];
        return this.hydrateUsers(all, (f) =>
          f.requesterId === userId ? f.recipientId : f.requesterId
        );
      })
    );
  }

  listIncomingRequests(userId: string): Observable<FriendRequest[]> {
    return this.baseSvc
      .find({ criteria: { recipientId: userId, status: "pending" } })
      .pipe(
        switchMap((result) =>
          this.hydrateUsers(result.items, (f) => f.requesterId)
        )
      );
  }

  listOutgoingRequests(userId: string): Observable<FriendRequest[]> {
    return this.baseSvc
      .find({ criteria: { requesterId: userId, status: "pending" } })
      .pipe(
        switchMap((result) =>
          this.hydrateUsers(result.items, (f) => f.recipientId)
        )
      );
  }

  findBetween(userIdA: string, userIdB: string): Observable<Friendship | undefined> {
    return forkJoin([
      this.baseSvc.find({ criteria: { requesterId: userIdA, recipientId: userIdB } }),
      this.baseSvc.find({ criteria: { requesterId: userIdB, recipientId: userIdA } }),
    ]).pipe(
      map(([a, b]) => a.items[0] ?? b.items[0])
    );
  }

  findById(id: string): Observable<Friendship | undefined> {
    return this.baseSvc.find({ criteria: { id } }).pipe(map((r) => r.items[0]));
  }

  create(friendship: Friendship): Observable<Friendship> {
    return this.baseSvc.create(friendship);
  }

  updateStatus(id: string, status: FriendshipStatus): Observable<Friendship> {
    return this.findById(id).pipe(
      switchMap((existing) =>
        existing == null
          ? throwError(() => new NotFoundError("Friendship not found"))
          : this.baseSvc.update(id, {
              ...existing,
              status,
              updatedAt: new Date().toISOString(),
            })
      )
    );
  }

  delete(id: string): Observable<void> {
    return this.baseSvc.delete(id);
  }
}
