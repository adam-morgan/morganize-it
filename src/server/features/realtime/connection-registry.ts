import { Observable } from "rxjs";

export interface ConnectionRegistry {
  add(userId: string, connectionId: string): Observable<void>;
  remove(connectionId: string): Observable<void>;
  /**
   * Look up active connection IDs for the given user IDs. Used by the
   * publisher to fan out notifications.
   */
  findByUserIds(userIds: string[]): Observable<string[]>;
}
