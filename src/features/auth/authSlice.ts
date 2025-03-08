import { create } from "zustand";
import { doLogin, doLogout, loginAsGuest } from "./auth-service";
import { map, Observable, take, tap } from "rxjs";

type AuthSlice = {
  user?: User;
  setUser: (user?: User) => void;
  login: (email: string, password: string) => Observable<void>;
  continueAsGuest: () => Observable<void>;
  logout: () => Observable<void>;
};

export const useAuthSlice = create<AuthSlice>((set) => ({
  user: undefined,
  setUser: (user) => set({ user }),
  login: (email, password) =>
    doLogin(email, password).pipe(
      take(1),
      tap((response) => set({ user: response.user })),
      map(() => undefined)
    ),
  continueAsGuest: () =>
    loginAsGuest().pipe(
      take(1),
      tap((user) => set({ user })),
      map(() => undefined)
    ),
  logout: () =>
    doLogout().pipe(
      take(1),
      tap(() => set({ user: undefined }))
    ),
}));
