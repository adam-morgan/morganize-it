import { Observable, of } from "rxjs";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { warn } from "@/server/logging";
import { NotificationPublisher } from "../notification-publisher";
import { RealtimeEvent } from "../event-types";
import { ConnectionRegistry } from "../connection-registry";

const getEndpoint = (): string => {
  // Prefer SST resource binding when available (set on Lambda handlers via
  // `link: [wsApi]`). Falls back to env var so server-side tests / scripts can
  // point at any endpoint.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resource } = require("sst");
    const url: string | undefined = Resource.WsApi?.managementEndpoint;
    if (url) return url;
  } catch {
    // ignore
  }
  const env = process.env.WS_MANAGEMENT_ENDPOINT;
  if (!env) {
    throw new Error(
      "WS management endpoint not configured: missing SST WsApi binding and WS_MANAGEMENT_ENDPOINT env var"
    );
  }
  return env;
};

let cachedClient: ApiGatewayManagementApiClient | undefined;
const getClient = (): ApiGatewayManagementApiClient => {
  if (!cachedClient) {
    cachedClient = new ApiGatewayManagementApiClient({ endpoint: getEndpoint() });
  }
  return cachedClient;
};

export class ApiGatewayPublisher implements NotificationPublisher {
  constructor(private readonly registry: ConnectionRegistry) {}

  publish(event: RealtimeEvent, userIds: string[]): Observable<void> {
    if (userIds.length === 0) return of(undefined);
    const unique = Array.from(new Set(userIds));
    const payload = JSON.stringify(event);

    return new Observable<void>((subscriber) => {
      this.registry.findByUserIds(unique).subscribe({
        next: async (connectionIds) => {
          const client = getClient();
          await Promise.all(
            connectionIds.map(async (connectionId) => {
              try {
                await client.send(
                  new PostToConnectionCommand({
                    ConnectionId: connectionId,
                    Data: Buffer.from(payload),
                  })
                );
              } catch (err) {
                const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
                  ?.httpStatusCode;
                if (status === 410) {
                  // Stale connection — clean it up so we don't keep trying.
                  this.registry.remove(connectionId).subscribe({
                    error: () => {
                      /* swallow */
                    },
                  });
                } else {
                  warn(
                    `ApiGatewayPublisher.send failed for ${connectionId}: ${(err as Error).message}`
                  );
                }
              }
            })
          );
          subscriber.next();
          subscriber.complete();
        },
        error: (err) => {
          warn(`ApiGatewayPublisher.findByUserIds failed: ${(err as Error).message}`);
          subscriber.next();
          subscriber.complete();
        },
      });
    });
  }
}
