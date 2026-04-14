import { Observable } from "rxjs";

export interface FriendshipService {
  listFriends(userId: string): Observable<Friend[]>;
  listIncomingRequests(userId: string): Observable<FriendRequest[]>;
  listOutgoingRequests(userId: string): Observable<FriendRequest[]>;
  /**
   * Look up a friendship row between two users in either direction.
   */
  findBetween(userIdA: string, userIdB: string): Observable<Friendship | undefined>;
  findById(id: string): Observable<Friendship | undefined>;
  create(friendship: Friendship): Observable<Friendship>;
  updateStatus(id: string, status: FriendshipStatus): Observable<Friendship>;
  delete(id: string): Observable<void>;
}
