import { create } from "zustand";
import { getAuthService } from "./services/auth-service";
import { useNotebooksSlice } from "../notes/notebooksSlice";
import { migrateLocalDataToServer } from "../notes/services/migration";
import { map, Observable, of, switchMap, take, tap } from "rxjs";

type AuthSlice = {
  user?: User;
  setUser: (user?: User) => void;
  login: (email: string, password: string) => Observable<void>;
  googleLogin: (credential: string) => Observable<void>;
  createAccount: (email: string, password: string) => Observable<void>;
  continueAsGuest: () => Observable<void>;
  logout: () => Observable<void>;
};

export const useAuthSlice = create<AuthSlice>((set) => ({
  user: undefined,
  setUser: (user) => set({ user }),
  login: (email, password) =>
    getAuthService()
      .doLogin(email, password)
      .pipe(
        take(1),
        tap((response) => {
          set({ user: response.user });
          useNotebooksSlice.getState().reset();
        }),
        map(() => undefined)
      ),
  googleLogin: (credential) =>
    getAuthService()
      .doGoogleLogin(credential)
      .pipe(
        take(1),
        tap((response) => set({ user: response.user })),
        switchMap((response) =>
          response.isNewUser
            ? migrateLocalDataToServer(response.user.id as string)
            : of(undefined)
        ),
        tap(() => useNotebooksSlice.getState().reset()),
        map(() => undefined)
      ),
  createAccount: (email, password) =>
    getAuthService()
      .createAccount(email, password)
      .pipe(
        take(1),
        tap((response) => set({ user: response.user })),
        switchMap((response) => migrateLocalDataToServer(response.user.id as string)),
        tap(() => useNotebooksSlice.getState().reset()),
        map(() => undefined)
      ),
  continueAsGuest: () =>
    getAuthService()
      .loginAsGuest()
      .pipe(
        take(1),
        tap((user) => set({ user })),
        map(() => undefined)
      ),
  logout: () =>
    getAuthService()
      .doLogout()
      .pipe(
        take(1),
        tap(() => set({ user: undefined }))
      ),
}));
