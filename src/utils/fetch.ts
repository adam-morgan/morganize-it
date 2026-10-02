import { catchError, from, map, Observable, switchMap, tap, throwError, timeout } from "rxjs";
import { fromFetch } from "rxjs/fetch";
import { useNetworkSlice } from "@/features/network/networkSlice";

const DEFAULT_TIMEOUT_MS = 20_000;

type RequestOptions = {
  timeoutMs?: number;
};

export const apiGet = <Resp>(path: string, options?: RequestOptions): Observable<Resp> =>
  apiRequest("GET", path, undefined, options);

export const apiPost = <Req, Resp>(path: string, body: Req): Observable<Resp> =>
  apiRequest("POST", path, body);

export const apiPut = <Req, Resp>(path: string, body: Req): Observable<Resp> =>
  apiRequest("PUT", path, body);

export const apiPatch = <Req, Resp>(path: string, body: Req): Observable<Resp> =>
  apiRequest("PATCH", path, body);

export const apiDelete = <Resp>(path: string): Observable<Resp> =>
  apiRequest("DELETE", path);

export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem("authToken", token);
  } else {
    localStorage.removeItem("authToken");
  }
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem("authRefreshToken");
};

export const setRefreshToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem("authRefreshToken", token);
  } else {
    localStorage.removeItem("authRefreshToken");
  }
};

const getApiUrl = (): string => {
  let url = import.meta.env.VITE_API_URL ?? "/api";
  while (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
};

const setOnline = (online: boolean) => {
  if (useNetworkSlice.getState().online !== online) {
    useNetworkSlice.getState().setOnline(online);
  }
};

// Thrown when a request never got an HTTP response (offline, DNS, timeout).
// It deliberately has no `status`, which callers treat as "network failure".
const networkError = (message: string): Error => new Error(message);

type RefreshResult = "refreshed" | "rejected" | "network-error";

let refreshInProgress: Promise<RefreshResult> | null = null;

const attemptRefresh = async (): Promise<RefreshResult> => {
  if (refreshInProgress) return refreshInProgress;

  refreshInProgress = (async (): Promise<RefreshResult> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return "rejected";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });

      setOnline(true);

      if (!response.ok) return "rejected";

      const data = await response.json() as RefreshResponse;
      setAuthToken(data.token);
      setRefreshToken(data.refreshToken);
      return "refreshed";
    } catch {
      setOnline(false);
      return "network-error";
    } finally {
      clearTimeout(timer);
      refreshInProgress = null;
    }
  })();

  return refreshInProgress;
};

const apiRequest = <Req, Resp>(
  method: string,
  path: string,
  body?: Req,
  options?: RequestOptions
): Observable<Resp> => {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = getApiUrl();

  let _path = path;
  if (!_path.startsWith("/")) {
    _path = `/${_path}`;
  }

  const fullPath = `${url}${_path}`;

  const doFetch = (token: string | null): Observable<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return fromFetch(fullPath, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    }).pipe(
      timeout({ first: timeoutMs, with: () => throwError(() => networkError("Request timed out")) }),
      tap(() => setOnline(true)),
      catchError((err: unknown) => {
        setOnline(false);

        return throwError(() => (err instanceof Error ? err : networkError(String(err))));
      })
    );
  };

  return doFetch(getAuthToken()).pipe(
    switchMap((response) => {
      if (response.status === 401 && getRefreshToken()) {
        return from(attemptRefresh()).pipe(
          switchMap((result) => {
            if (result === "network-error") {
              return throwError(() => networkError("Could not reach the server to refresh the session"));
            }

            if (result === "refreshed") {
              return doFetch(getAuthToken()).pipe(
                switchMap((retryResponse) => handleResponse<Resp>(retryResponse))
              );
            }
            return handleResponse<Resp>(response);
          })
        );
      }

      return handleResponse<Resp>(response);
    })
  );
};

// Error thrown for non-2xx HTTP responses. Carries the status code so callers
// (notably the offline mutation queue) can distinguish a 404/409 from a 5xx or
// a network failure. Existing callers continue to read `.message` unchanged.
export interface ApiRequestError extends Error {
  status: number;
}

const handleResponse = <Resp>(response: Response): Observable<Resp> => {
  if (response.ok) {
    return from(response.text()).pipe(map((text) => (!text ? undefined : JSON.parse(text))));
  }

  return from(response.text()).pipe(
    switchMap((text) => {
      let message = text;
      try {
        message = JSON.parse(text).message ?? text;
      } catch {
        // Body wasn't JSON — fall back to the raw text.
      }

      const error = new Error(message) as ApiRequestError;
      error.status = response.status;

      return throwError(() => error);
    })
  );
};
