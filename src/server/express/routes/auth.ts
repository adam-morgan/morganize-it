import { createAccount, login, whoami } from "@/server/http/routes/auth";
import { Request, Response, Router } from "express";
import { handleHttpResponse, handleHttpResponseAsync, makeHttpRequest } from "../util";

export const authRoutes = (router: Router) => {
  router.get("/auth/whoami", (req: Request<void>, res: Response<User | ApiError | {}>) => {
    handleHttpResponseAsync(whoami(makeHttpRequest(req)), res);
  });

  router.post(
    "/auth/login",
    (req: Request<LoginRequest>, res: Response<LoginResponse | ApiError>) => {
      const httpResponsePromise = login(makeHttpRequest(req));

      httpResponsePromise.then((httpResponse) => {
        if (httpResponse.status < 400) {
          req.session.userId = (httpResponse.body as LoginResponse).user?.id;
        }

        handleHttpResponse(httpResponse, res);
      });
    }
  );

  router.post("/auth/logout", (req: Request<void>, res: Response<void>) => {
    req.session.destroy(() => {
      res.status(200).end();
    });
  });

  router.post(
    "/auth/create-account",
    async (req: Request<CreateAccountRequest>, res: Response<CreateAccountResponse | ApiError>) => {
      const httpResponsePromise = createAccount(makeHttpRequest(req));

      httpResponsePromise.then((httpResponse) => {
        if (httpResponse.status < 400) {
          req.session.userId = (httpResponse.body as CreateAccountResponse).user?.id;
        }

        handleHttpResponse(httpResponse, res);
      });
    }
  );
};
