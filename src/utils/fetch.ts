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

const apiRequest = <Req, Resp>(method: string, path: string, body?: Req): Observable<Resp> => {
  let url = import.meta.env.VITE_API_URL ?? "/api";

  while (url.endsWith("/")) {
    url = url.slice(0, -1);
  }

  let _path = path;
  if (!_path.startsWith("/")) {
    _path = `/${_path}`;
  }

  const fullPath = `${url}${_path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fromFetch(fullPath, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  }).pipe(
    switchMap((response) => {
      if (response.ok) {
        return from(response.text()).pipe(map((text) => (!text ? undefined : JSON.parse(text))));
      }

      return from(response.json()).pipe(
        switchMap((error) => throwError(() => Error(error.message)))
      );
    })
  );
};
