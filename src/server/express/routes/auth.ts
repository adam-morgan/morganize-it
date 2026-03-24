import { createAccount, googleLogin, login, whoami } from "@/server/http/routes/auth";
import { signToken } from "@/server/auth/jwt";
import { Request, Response, Router } from "express";
import { handleHttpResponseAsync, handleHttpResponse, makeHttpRequest } from "../util";

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
          const loginResponse = httpResponse.body as LoginResponse;
          const token = signToken({ userId: loginResponse.user!.id });
          handleHttpResponse({ ...httpResponse, body: { ...loginResponse, token } }, res);
        } else {
          handleHttpResponse(httpResponse, res);
        }
      });
    }
  );

  router.post("/auth/logout", (_req: Request<void>, res: Response<void>) => {
    res.status(200).end();
  });

  router.post(
    "/auth/google",
    (req: Request<GoogleLoginRequest>, res: Response<GoogleLoginResponse | ApiError>) => {
      const httpResponsePromise = googleLogin(makeHttpRequest(req));

      httpResponsePromise.then((httpResponse) => {
        if (httpResponse.status < 400) {
          const loginResponse = httpResponse.body as GoogleLoginResponse;
          const token = signToken({ userId: loginResponse.user!.id });
          handleHttpResponse({ ...httpResponse, body: { ...loginResponse, token } }, res);
        } else {
          handleHttpResponse(httpResponse, res);
        }
      });
    }
  );

  router.post(
    "/auth/create-account",
    async (req: Request<CreateAccountRequest>, res: Response<CreateAccountResponse | ApiError>) => {
      const httpResponsePromise = createAccount(makeHttpRequest(req));

      httpResponsePromise.then((httpResponse) => {
        if (httpResponse.status < 400) {
          const createResponse = httpResponse.body as CreateAccountResponse;
          const token = signToken({ userId: createResponse.user!.id });
          handleHttpResponse({ ...httpResponse, body: { ...createResponse, token } }, res);
        } else {
          handleHttpResponse(httpResponse, res);
        }
      });
    }
  );
};
