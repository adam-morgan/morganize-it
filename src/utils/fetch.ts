import { from, map, Observable, switchMap, throwError } from "rxjs";
import { fromFetch } from "rxjs/fetch";

export const apiGet = <Resp>(path: string): Observable<Resp> => apiRequest("GET", path);

export const apiPost = <Req, Resp>(path: string, body: Req): Observable<Resp> =>
  apiRequest("POST", path, body);

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

  const headers = {
    "Content-Type": "application/json",
  };

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
