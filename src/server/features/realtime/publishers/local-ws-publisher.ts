import { Observable, of } from "rxjs";
import { warn } from "@/server/logging";
import { NotificationPublisher } from "../notification-publisher";
import { RealtimeEvent } from "../event-types";
import { InMemoryConnectionRegistry } from "../registries/in-memory-connection-registry";

export class LocalWsPublisher implements NotificationPublisher {
  constructor(private readonly registry: InMemoryConnectionRegistry) {}

  publish(event: RealtimeEvent, userIds: string[]): Observable<void> {
    if (userIds.length === 0) return of(undefined);
    const unique = Array.from(new Set(userIds));
    const payload = JSON.stringify(event);

    return new Observable<void>((subscriber) => {
      this.registry.findByUserIds(unique).subscribe({
        next: (connectionIds) => {
          for (const id of connectionIds) {
            const socket = this.registry.getSocket(id);
            if (!socket) continue;
            try {
              // OPEN === 1 in the ws library; check via numeric to avoid
              // pulling the constant import into this file.
              if (socket.readyState === 1) {
                socket.send(payload);
              }
            } catch (err) {
              warn(`LocalWsPublisher.send failed for ${id}: ${(err as Error).message}`);
            }
          }
          subscriber.next();
          subscriber.complete();
        },
        error: (err) => {
          warn(`LocalWsPublisher.findByUserIds failed: ${(err as Error).message}`);
          subscriber.next();
          subscriber.complete();
        },
      });
    });
  }
}
