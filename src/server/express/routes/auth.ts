import { createAccount, googleLogin, login, logout, whoami } from "@/server/http/routes/auth";
import { signToken, signRefreshToken, verifyRefreshToken } from "@/server/auth/jwt";
import { getAuthService } from "@/server/features";
import { Request, Response, Router } from "express";
import { handleHttpResponseAsync, handleHttpResponse, makeHttpRequest } from "../util";
import { authRateLimit } from "../middleware/rate-limit";

const issueTokens = (userId: string) => ({
  token: signToken({ userId }),
  refreshToken: signRefreshToken({ userId }),
});

export const authRoutes = (router: Router) => {
  router.get("/auth/whoami", (req: Request<void>, res: Response<User | ApiError>) => {
    handleHttpResponseAsync(whoami(makeHttpRequest(req)), res);
  });

  router.post(
    "/auth/login",
    authRateLimit,
    (req: Request<LoginRequest>, res: Response<LoginResponse | ApiError>) => {
      const httpResponsePromise = login(makeHttpRequest(req));

      httpResponsePromise.then((httpResponse) => {
        if (httpResponse.status < 400) {
          const loginResponse = httpResponse.body as LoginResponse;
          const tokens = issueTokens(loginResponse.user!.id);
          handleHttpResponse({ ...httpResponse, body: { ...loginResponse, ...tokens } }, res);
        } else {
          handleHttpResponse(httpResponse, res);
        }
      });
    }
  );

  router.post("/auth/logout", (req: Request<void>, res: Response<void | ApiError>) => {
    handleHttpResponseAsync(logout(makeHttpRequest(req)), res);
  });

  router.post(
    "/auth/refresh",
    authRateLimit,
    async (req: Request<RefreshRequest>, res: Response<RefreshResponse | ApiError>) => {
      try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
          res.status(400).json({ message: "Missing refresh token" });
          return;
        }

        const payload = verifyRefreshToken(refreshToken);

        const user = await getAuthService().getUser(payload.userId, false);
        if (user.tokenInvalidBefore) {
          const invalidBefore = new Date(user.tokenInvalidBefore).getTime() / 1000;
          if (payload.iat < invalidBefore) {
            res.status(401).json({ message: "Token has been revoked" });
            return;
          }
        }

        const tokens = issueTokens(payload.userId);
        res.json(tokens);
      } catch {
        res.status(401).json({ message: "Invalid or expired refresh token" });
      }
    }
  );

  router.post(
    "/auth/google",
    authRateLimit,
    (req: Request<GoogleLoginRequest>, res: Response<GoogleLoginResponse | ApiError>) => {
      const httpResponsePromise = googleLogin(makeHttpRequest(req));

      httpResponsePromise.then((httpResponse) => {
        if (httpResponse.status < 400) {
          const loginResponse = httpResponse.body as GoogleLoginResponse;
          const tokens = issueTokens(loginResponse.user!.id);
          handleHttpResponse({ ...httpResponse, body: { ...loginResponse, ...tokens } }, res);
        } else {
          handleHttpResponse(httpResponse, res);
        }
      });
    }
  );

  router.post(
    "/auth/create-account",
    authRateLimit,
    async (req: Request<CreateAccountRequest>, res: Response<CreateAccountResponse | ApiError>) => {
      const httpResponsePromise = createAccount(makeHttpRequest(req));

      httpResponsePromise.then((httpResponse) => {
        if (httpResponse.status < 400) {
          const createResponse = httpResponse.body as CreateAccountResponse;
          const tokens = issueTokens(createResponse.user!.id);
          handleHttpResponse({ ...httpResponse, body: { ...createResponse, ...tokens } }, res);
        } else {
          handleHttpResponse(httpResponse, res);
        }
      });
    }
  );
};
