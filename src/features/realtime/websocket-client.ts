import { Subject, Observable } from "rxjs";
import { RealtimeEvent } from "./event-types";

const RECONNECT_INITIAL_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

const resolveBaseUrl = (): string => {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit && explicit.length > 0) {
    return explicit.replace(/\/+$/, "");
  }
  // Fallback: same origin, /ws path. http→ws / https→wss.
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
};

const getAuthToken = (): string | null => localStorage.getItem("authToken");

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectDelay = RECONNECT_INITIAL_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wantOpen = false;
  private hasConnected = false;
  private readonly subject = new Subject<RealtimeEvent>();
  private readonly reconnectedSubject = new Subject<void>();

  readonly incoming$: Observable<RealtimeEvent> = this.subject.asObservable();

  // Fires when a dropped connection comes back; events sent while we were
  // disconnected are lost, so listeners should resync.
  readonly reconnected$: Observable<void> = this.reconnectedSubject.asObservable();

  start(): void {
    this.wantOpen = true;
    this.connect();
  }

  stop(): void {
    this.wantOpen = false;
    this.hasConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close(1000, "client stop");
      } catch {
        // ignore
      }
      this.socket = null;
    }
  }

  private connect(): void {
    if (!this.wantOpen) return;
    const token = getAuthToken();
    if (!token) {
      // No token yet — try again on backoff. start() will be called again
      // when auth is established but this guards against transient gaps.
      this.scheduleReconnect();
      return;
    }

    const url = `${resolveBaseUrl()}?token=${encodeURIComponent(token)}`;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      console.warn("WebSocket open failed", err);
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectDelay = RECONNECT_INITIAL_MS;

      if (this.hasConnected) {
        this.reconnectedSubject.next();
      }

      this.hasConnected = true;
    });

    socket.addEventListener("message", (event) => {
      try {
        const data: RealtimeEvent = JSON.parse(event.data as string);
        if (data && data.type === "resource.changed") {
          this.subject.next(data);
        }
      } catch (err) {
        console.warn("Malformed WS message", err);
      }
    });

    socket.addEventListener("close", (event) => {
      this.socket = null;
      if (!this.wantOpen) return;
      // 1008 = policy violation (bad/expired token). Try once more on the
      // next tick; the apiPatch refresh flow may have rotated the token in
      // the background. If still failing the backoff will widen.
      if (event.code === 1008) {
        this.scheduleReconnect();
        return;
      }
      this.scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      // close handler will run too; nothing to do here.
    });
  }

  private scheduleReconnect(): void {
    if (!this.wantOpen) return;
    if (this.reconnectTimer) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

let instance: WebSocketClient | undefined;
export const getWebSocketClient = (): WebSocketClient => {
  if (!instance) instance = new WebSocketClient();
  return instance;
};
