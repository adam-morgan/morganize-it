import { create } from "zustand";
import { forkJoin, map, Observable, of, tap } from "rxjs";
import { useAuthSlice } from "../auth";
import {
  acceptRequest,
  cancelRequest,
  denyRequest,
  listFriends,
  listIncoming,
  listOutgoing,
  removeFriend,
  sendRequest,
} from "./services";

type FriendsSlice = {
  initialized: boolean;
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  initialize: () => Observable<void>;
  refresh: () => Observable<void>;
  sendRequest: (email: string) => Observable<Friendship>;
  acceptRequest: (id: string) => Observable<void>;
  denyRequest: (id: string) => Observable<void>;
  cancelRequest: (id: string) => Observable<void>;
  removeFriend: (id: string) => Observable<void>;
  reset: () => void;
};

const isAuthed = (): boolean => {
  const user = useAuthSlice.getState().user;
  return user != null && !(user as GuestUser).isGuest;
};

const refreshAll = (): Observable<void> =>
  forkJoin({
    friends: listFriends(),
    incoming: listIncoming(),
    outgoing: listOutgoing(),
  }).pipe(
    tap(({ friends, incoming, outgoing }) =>
      useFriendsSlice.setState({
        friends,
        incomingRequests: incoming,
        outgoingRequests: outgoing,
        initialized: true,
      })
    ),
    map(() => undefined)
  );

export const useFriendsSlice = create<FriendsSlice>((set, get) => ({
  initialized: false,
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  reset: () =>
    set({ initialized: false, friends: [], incomingRequests: [], outgoingRequests: [] }),
  initialize: () => {
    if (get().initialized) return of(undefined);
    if (!isAuthed()) {
      set({ initialized: true });
      return of(undefined);
    }
    return refreshAll();
  },
  refresh: () => {
    if (!isAuthed()) return of(undefined);
    return refreshAll();
  },
  sendRequest: (email) =>
    sendRequest(email).pipe(
      tap(() => {
        // Refresh outgoing list (and friends, in case it auto-accepted).
        refreshAll().subscribe();
      })
    ),
  acceptRequest: (id) =>
    acceptRequest(id).pipe(
      tap(() => refreshAll().subscribe()),
      map(() => undefined)
    ),
  denyRequest: (id) =>
    denyRequest(id).pipe(tap(() => refreshAll().subscribe())),
  cancelRequest: (id) =>
    cancelRequest(id).pipe(tap(() => refreshAll().subscribe())),
  removeFriend: (id) =>
    removeFriend(id).pipe(tap(() => refreshAll().subscribe())),
}));
