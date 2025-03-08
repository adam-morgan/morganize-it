import { apiGet, apiPost } from "@/utils/fetch";
import { catchError, map, Observable, of, tap } from "rxjs";

export const getUser = (): Observable<User | undefined> => {
  const guestMode = localStorage.getItem("guestMode");
  if (guestMode === "true") {
    return of({ id: 0, name: "Guest", email: "", isGuest: true } as GuestUser);
  }

  return apiGet<User | {}>("/auth/whoami").pipe(
    map((user) => ((user as User).id ? (user as User) : undefined)),
    catchError(() => of(undefined))
  );
};

export const loginAsGuest = (): Observable<User> => {
  localStorage.setItem("guestMode", "true");
  return getUser().pipe(map((user) => user as User));
};

export const doLogin = (email: string, password: string): Observable<LoginResponse> => {
  return apiPost<LoginRequest, LoginResponse>("/auth/login", { email, password }).pipe(
    tap(() => localStorage.removeItem("guestMode"))
  );
};

export const doLogout = (): Observable<void> => {
  return apiPost("/auth/logout", {});
};

export const createAccount = (
  email: string,
  password: string
): Observable<CreateAccountResponse> => {
  return apiPost("/auth/create-account", { email, password });
};
