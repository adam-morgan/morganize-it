import { Observable } from "rxjs";
import { RealtimeEvent } from "./event-types";

export interface NotificationPublisher {
  /**
   * Push a realtime event to all currently-connected sockets owned by any of
   * `userIds`. Implementations must never throw — failures are logged and
   * swallowed so the calling write is unaffected.
   */
  publish(event: RealtimeEvent, userIds: string[]): Observable<void>;
}
