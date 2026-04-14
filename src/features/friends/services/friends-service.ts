import { Observable } from "rxjs";
import { apiDelete, apiGet, apiPost } from "@/utils/fetch";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export const findUserByEmail = (email: string): Observable<PublicUser> =>
  apiGet<PublicUser>(`/users/find?email=${encodeURIComponent(email)}`);

export const listFriends = (): Observable<Friend[]> => apiGet<Friend[]>("/friends");

export const listIncoming = (): Observable<FriendRequest[]> =>
  apiGet<FriendRequest[]>("/friends/requests/incoming");

export const listOutgoing = (): Observable<FriendRequest[]> =>
  apiGet<FriendRequest[]>("/friends/requests/outgoing");

export const sendRequest = (email: string): Observable<Friendship> =>
  apiPost<{ email: string }, Friendship>("/friends/request", { email });

export const acceptRequest = (id: string): Observable<Friendship> =>
  apiPost<Record<string, never>, Friendship>(`/friends/${id}/accept`, {});

export const denyRequest = (id: string): Observable<void> =>
  apiPost<Record<string, never>, void>(`/friends/${id}/deny`, {});

export const cancelRequest = (id: string): Observable<void> =>
  apiDelete<void>(`/friends/${id}/cancel`);

export const removeFriend = (id: string): Observable<void> =>
  apiDelete<void>(`/friends/${id}`);
