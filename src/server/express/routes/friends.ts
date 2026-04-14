import { Request, Response, Router } from "express";
import { take } from "rxjs";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  denyFriendRequest,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriend,
  sendFriendRequest,
} from "@/server/http/routes/friends";
import { handleHttpResponse, makeHttpRequest } from "../util";
import { revokeSharesBetween } from "@/server/features/shares";

export const friendsRoutes = (router: Router) => {
  router.get("/friends", (req: Request<void>, res: Response) => {
    listFriends(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.get("/friends/requests/incoming", (req: Request<void>, res: Response) => {
    listIncomingRequests(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.get("/friends/requests/outgoing", (req: Request<void>, res: Response) => {
    listOutgoingRequests(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.post("/friends/request", (req: Request<{ email: string }>, res: Response) => {
    sendFriendRequest(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.post("/friends/:id/accept", (req: Request<void>, res: Response) => {
    acceptFriendRequest(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.post("/friends/:id/deny", (req: Request<void>, res: Response) => {
    denyFriendRequest(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.delete("/friends/:id/cancel", (req: Request<void>, res: Response) => {
    cancelFriendRequest(makeHttpRequest(req))
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });

  router.delete("/friends/:id", (req: Request<void>, res: Response) => {
    removeFriend(makeHttpRequest(req), (friendship) =>
      revokeSharesBetween(friendship.requesterId, friendship.recipientId)
    )
      .pipe(take(1))
      .subscribe((response) => handleHttpResponse(response, res));
  });
};
