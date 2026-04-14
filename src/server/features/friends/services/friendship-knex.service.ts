import { from, Observable, of, switchMap, throwError } from "rxjs";
import { getKnex } from "@/server/db/sql/knex";
import { NotFoundError } from "@/server/errors";
import { FriendshipService } from "./friendship.service";

const friendshipColumns = [
  "id",
  "requesterId",
  "recipientId",
  "status",
  "createdAt",
  "updatedAt",
];

const userColumns = ["id", "name", "email"];

export class FriendshipKnexService implements FriendshipService {
  listFriends(userId: string): Observable<Friend[]> {
    return from(
      getKnex()
        .select(
          "f.id as friendshipId",
          "f.createdAt as createdAt",
          "u.id as userId",
          "u.name as name",
          "u.email as email"
        )
        .from("friendships as f")
        .join("users as u", function () {
          this.on(function () {
            this.on("u.id", "=", "f.requesterId").andOn(
              "f.recipientId",
              "=",
              getKnex().raw("?", [userId])
            );
          }).orOn(function () {
            this.on("u.id", "=", "f.recipientId").andOn(
              "f.requesterId",
              "=",
              getKnex().raw("?", [userId])
            );
          });
        })
        .where("f.status", "accepted")
    ) as Observable<Friend[]>;
  }

  listIncomingRequests(userId: string): Observable<FriendRequest[]> {
    return from(
      getKnex()
        .select(
          "f.id as friendshipId",
          "f.createdAt as createdAt",
          "u.id as userId",
          "u.name as name",
          "u.email as email"
        )
        .from("friendships as f")
        .join("users as u", "u.id", "f.requesterId")
        .where("f.recipientId", userId)
        .andWhere("f.status", "pending")
    ) as Observable<FriendRequest[]>;
  }

  listOutgoingRequests(userId: string): Observable<FriendRequest[]> {
    return from(
      getKnex()
        .select(
          "f.id as friendshipId",
          "f.createdAt as createdAt",
          "u.id as userId",
          "u.name as name",
          "u.email as email"
        )
        .from("friendships as f")
        .join("users as u", "u.id", "f.recipientId")
        .where("f.requesterId", userId)
        .andWhere("f.status", "pending")
    ) as Observable<FriendRequest[]>;
  }

  findBetween(userIdA: string, userIdB: string): Observable<Friendship | undefined> {
    return from(
      getKnex()
        .select(friendshipColumns)
        .from<Friendship>("friendships")
        .where(function () {
          this.where({ requesterId: userIdA, recipientId: userIdB }).orWhere({
            requesterId: userIdB,
            recipientId: userIdA,
          });
        })
        .first()
    ) as Observable<Friendship | undefined>;
  }

  findById(id: string): Observable<Friendship | undefined> {
    return from(
      getKnex()
        .select(friendshipColumns)
        .from<Friendship>("friendships")
        .where({ id })
        .first()
    ) as Observable<Friendship | undefined>;
  }

  create(friendship: Friendship): Observable<Friendship> {
    return from(
      getKnex()
        .insert(friendship)
        .into("friendships")
        .returning(friendshipColumns)
        .then((rows) => rows[0] as Friendship)
    );
  }

  updateStatus(id: string, status: FriendshipStatus): Observable<Friendship> {
    const updatedAt = new Date().toISOString();
    return from(
      getKnex()
        .update({ status, updatedAt })
        .from("friendships")
        .where({ id })
        .returning(friendshipColumns)
        .then((rows) => rows[0] as Friendship | undefined)
    ).pipe(
      switchMap((row) =>
        row == null ? throwError(() => new NotFoundError("Friendship not found")) : of(row)
      )
    );
  }

  delete(id: string): Observable<void> {
    return from(getKnex().delete().from("friendships").where({ id })).pipe(
      switchMap((count) =>
        count === 0
          ? throwError(() => new NotFoundError("Friendship not found"))
          : of(undefined)
      )
    );
  }
}

// Re-export user columns for use in adjacent services
export { userColumns as friendshipUserColumns };
