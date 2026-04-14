import type { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer } from "ws";
import { verifyToken } from "@/server/auth/jwt";
import { debug, warn } from "@/server/logging";
import {
  InMemoryConnectionRegistry,
  LocalWsPublisher,
  setRealtimeBackend,
} from "@/server/features/realtime";

const tokenFromRequest = (req: IncomingMessage): string | null => {
  if (!req.url) return null;
  // req.url is path-only ("/ws?token=..."). Provide a base for URL parsing.
  try {
    const parsed = new URL(req.url, "http://localhost");
    return parsed.searchParams.get("token");
  } catch {
    return null;
  }
};

export const attachWebSocketServer = (server: HttpServer): void => {
  const registry = new InMemoryConnectionRegistry();
  setRealtimeBackend(registry, new LocalWsPublisher(registry));

  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    const token = tokenFromRequest(req);
    if (!token) {
      socket.close(1008, "Missing token");
      return;
    }
    let userId: string;
    try {
      userId = verifyToken(token).userId;
    } catch {
      socket.close(1008, "Invalid token");
      return;
    }

    const connectionId = registry.registerSocket(userId, socket);
    debug(`WebSocket connected: user=${userId} connection=${connectionId}`);

    socket.on("close", () => {
      registry.remove(connectionId).subscribe({
        error: () => {
          /* ignore */
        },
      });
      debug(`WebSocket disconnected: connection=${connectionId}`);
    });

    socket.on("error", (err) => {
      warn(`WebSocket error on ${connectionId}: ${err.message}`);
    });
  });
};
