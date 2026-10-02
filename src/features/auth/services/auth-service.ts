import { apiGet, apiPost, getAuthToken, setAuthToken, setRefreshToken } from "@/utils/fetch";
import { catchError, map, Observable, of, tap } from "rxjs";

const CACHED_USER_KEY = "authUser";

// Persist the signed-in user so the session can be restored offline (when
// /auth/whoami can't be reached) without bouncing to the login screen.
const setCachedUser = (user?: User) => {
  if (user) {
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CACHED_USER_KEY);
  }
};

const getCachedUser = (): User | undefined => {
  const raw = localStorage.getItem(CACHED_USER_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return undefined;
  }
};

const storeTokens = (response: { token?: string; refreshToken?: string }) => {
  if (response.token) {
    setAuthToken(response.token);
  }
  if (response.refreshToken) {
    setRefreshToken(response.refreshToken);
  }
};

class AuthService {
  public getUser(): Observable<User | undefined> {
    const guestMode = localStorage.getItem("guestMode");
    if (guestMode === "true") {
      return of({ id: "0", name: "Guest", email: "", isGuest: true } as GuestUser);
    }

    return apiGet<User>("/auth/whoami").pipe(
      tap((user) => setCachedUser(user)),
      catchError((err: unknown) => {
        // A real auth failure (e.g. 401) carries an HTTP status → force login.
        // A network failure (offline) has no status → restore the last known
        // user so the cached app stays usable offline.
        const status =
          err && typeof err === "object" && "status" in err
            ? (err as { status?: number }).status
            : undefined;

        if (status === undefined && getAuthToken()) {
          return of(getCachedUser());
        }

        return of(undefined);
      })
    );
  }

  public loginAsGuest(): Observable<User> {
    localStorage.setItem("guestMode", "true");
    return this.getUser().pipe(map((user) => user as User));
  }

  public doLogin(email: string, password: string): Observable<LoginResponse> {
    return apiPost<LoginRequest, LoginResponse>("/auth/login", { email, password }).pipe(
      tap((response) => {
        localStorage.removeItem("guestMode");
        storeTokens(response);
        setCachedUser(response.user);
      })
    );
  }

  public doLogout(): Observable<void> {
    const isGuest = localStorage.getItem("guestMode") === "true";

    const clearLocal = () => {
      setAuthToken(null);
      setRefreshToken(null);
      setCachedUser(undefined);
      localStorage.removeItem("guestMode");
    };

    if (isGuest) {
      clearLocal();
      return of(undefined);
    }

    return apiPost<void, void>("/auth/logout", undefined as unknown as void).pipe(
      catchError(() => of(undefined as unknown as void)),
      tap(() => clearLocal()),
      map(() => undefined),
    );
  }

  public doGoogleLogin(credential: string): Observable<GoogleLoginResponse> {
    return apiPost<GoogleLoginRequest, GoogleLoginResponse>("/auth/google", { credential }).pipe(
      tap((response) => {
        localStorage.removeItem("guestMode");
        storeTokens(response);
        setCachedUser(response.user);
      })
    );
  }

  public createAccount(email: string, password: string): Observable<CreateAccountResponse> {
    return apiPost<CreateAccountRequest, CreateAccountResponse>("/auth/create-account", {
      email,
      password,
    }).pipe(
      tap((response) => {
        localStorage.removeItem("guestMode");
        storeTokens(response);
        setCachedUser(response.user);
      })
    );
  }
}

const authService = new AuthService();

export const getAuthService = () => authService;
