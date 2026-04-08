import { apiGet, apiPost, setAuthToken, setRefreshToken } from "@/utils/fetch";
import { catchError, map, Observable, of, tap } from "rxjs";

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
      catchError(() => of(undefined))
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
      })
    );
  }

  public doLogout(): Observable<void> {
    const isGuest = localStorage.getItem("guestMode") === "true";

    const clearLocal = () => {
      setAuthToken(null);
      setRefreshToken(null);
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
      })
    );
  }
}

const authService = new AuthService();

export const getAuthService = () => authService;
