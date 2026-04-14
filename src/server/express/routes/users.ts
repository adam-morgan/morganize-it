import { Request, Response, Router } from "express";
import { findUserByEmail } from "@/server/http/routes/users";
import { handleHttpResponseAsync, makeHttpRequest } from "../util";

export const usersRoutes = (router: Router) => {
  router.get("/users/find", (req: Request<void>, res: Response) => {
    handleHttpResponseAsync(findUserByEmail(makeHttpRequest(req)), res);
  });
};
