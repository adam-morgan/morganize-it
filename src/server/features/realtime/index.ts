import { catchError, Observable, of } from "rxjs";
import { warn } from "@/server/logging";
import { getDbInstanceType } from "@/server/db/type";
import { ConnectionRegistry } from "./connection-registry";
import { NotificationPublisher } from "./notification-publisher";
import { RealtimeEvent } from "./event-types";
import { InMemoryConnectionRegistry } from "./registries/in-memory-connection-registry";
import { DynamoConnectionRegistry } from "./registries/dynamo-connection-registry";
import { ApiGatewayPublisher } from "./publishers/api-gateway-publisher";

export * from "./event-types";
export * from "./connection-registry";
export * from "./notification-publisher";
export * from "./affected-users";
export { InMemoryConnectionRegistry } from "./registries/in-memory-connection-registry";
export { LocalWsPublisher } from "./publishers/local-ws-publisher";
export { DynamoConnectionRegistry } from "./registries/dynamo-connection-registry";
export { ApiGatewayPublisher } from "./publishers/api-gateway-publisher";

let registry: ConnectionRegistry | undefined;
let publisher: NotificationPublisher | undefined;

/**
 * Express bootstraps the in-memory transport explicitly because it owns the
 * WebSocketServer instance. Lambda relies on the lazy default below.
 */
export const setRealtimeBackend = (
  r: ConnectionRegistry,
  p: NotificationPublisher
): void => {
  registry = r;
  publisher = p;
};

export const getConnectionRegistry = (): ConnectionRegistry => {
  if (!registry) {
    if (getDbInstanceType() === "DYNAMODB") {
      registry = new DynamoConnectionRegistry();
    } else {
      registry = new InMemoryConnectionRegistry();
    }
  }
  return registry;
};

export const getNotificationPublisher = (): NotificationPublisher => {
  if (!publisher) {
    if (getDbInstanceType() === "DYNAMODB") {
      publisher = new ApiGatewayPublisher(getConnectionRegistry());
    } else {
      // No WebSocketServer wired up — issue a warning and return a no-op
      // publisher so writes never fail. Express bootstrap should call
      // setRealtimeBackend with the live in-memory pair.
      publisher = {
        publish: () => of(undefined),
      };
    }
  }
  return publisher;
};

/**
 * Fire-and-forget publish helper. Use inside `tap` or `mergeMap` after a
 * successful mutation. Errors are logged and swallowed — push failures must
 * never break the originating write.
 */
export const publishEvent = (
  event: RealtimeEvent,
  userIds: string[]
): Observable<void> => {
  if (userIds.length === 0) return of(undefined);
  return getNotificationPublisher()
    .publish(event, userIds)
    .pipe(
      catchError((err) => {
        warn(`publishEvent failed: ${(err as Error).message}`);
        return of(undefined);
      })
    );
};
