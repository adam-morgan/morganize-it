import { from, map, Observable, switchMap, throwError } from "rxjs";
import { fromFetch } from "rxjs/fetch";

export const apiGet = <Resp>(path: string): Observable<Resp> => apiRequest("GET", path);

export const apiPost = <Req, Resp>(path: string, body: Req): Observable<Resp> =>
  apiRequest("POST", path, body);

export const apiPut = <Req, Resp>(path: string, body: Req): Observable<Resp> =>
  apiRequest("PUT", path, body);

export const apiPatch = <Req, Resp>(path: string, body: Req): Observable<Resp> =>
  apiRequest("PATCH", path, body);

export const apiDelete = <Resp>(path: string): Observable<Resp> =>
  apiRequest("DELETE", path);

const getAuthToken = (): string | null => {
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

let refreshInProgress: Promise<boolean> | null = null;

const attemptRefresh = async (): Promise<boolean> => {
  if (refreshInProgress) return refreshInProgress;

  refreshInProgress = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json() as RefreshResponse;
      setAuthToken(data.token);
      setRefreshToken(data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInProgress = null;
    }
  })();

  return refreshInProgress;
};

const apiRequest = <Req, Resp>(method: string, path: string, body?: Req): Observable<Resp> => {
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
    });
  };

  return doFetch(getAuthToken()).pipe(
    switchMap((response) => {
      if (response.status === 401 && getRefreshToken()) {
        return from(attemptRefresh()).pipe(
          switchMap((refreshed) => {
            if (refreshed) {
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

const handleResponse = <Resp>(response: Response): Observable<Resp> => {
  if (response.ok) {
    return from(response.text()).pipe(map((text) => (!text ? undefined : JSON.parse(text))));
  }

  return from(response.json()).pipe(
    switchMap((error) => throwError(() => Error(error.message)))
  );
};
