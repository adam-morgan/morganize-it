import { getAuthService } from "@/server/features";
import { verifyGoogleToken } from "@/server/auth/google";
import { HttpRequest } from "../request";
import { HttpResponse } from "../response";
import { error } from "@/server/logging";

const getAllowedEmails = (): string | undefined => {
  try {
    const { Resource } = require("sst");
    return Resource.AllowedEmails.value;
  } catch {
    return process.env.ALLOWED_EMAILS;
  }
};

const isEmailAllowed = (email: string): boolean => {
  const allowed = getAllowedEmails();
  if (!allowed) return true;
  return allowed
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
};

export const whoami = async (
  req: HttpRequest<void>
): Promise<HttpResponse<User | ApiError>> => {
  if (!req.userId) {
    return { status: 401, body: { message: "Unauthorized" } };
  }

  try {
    const user = await getAuthService().getUser(req.userId, false);
    return { status: 200, body: user };
  } catch (e) {
    error((e as Error).message, e as Error);
    return { status: 500, body: { message: "Internal Server Error" } };
  }
};

export const login = async (
  req: HttpRequest<LoginRequest>
): Promise<HttpResponse<LoginResponse | ApiError>> => {
  try {
    const response = await getAuthService().login(req.body.email, req.body.password);
    return { status: 200, body: response };
  } catch (e) {
    error((e as Error).message, e as Error);
    return { status: 401, body: { message: "Invalid email or password" } };
  }
};

export const createAccount = async (
  req: HttpRequest<CreateAccountRequest>
): Promise<HttpResponse<CreateAccountResponse | ApiError>> => {
  const authService = getAuthService();

  const existingUser = await authService.getUserByEmail(req.body.email, false);

  if (existingUser != null) {
    return {
      status: 400,
      body: { message: "A User account already exists with that email address" },
    };
  }

  if (!isEmailAllowed(req.body.email)) {
    return {
      status: 403,
      body: { message: "Account registration is currently restricted" },
    };
  }

  const user: Omit<User, "id"> = {
    email: req.body.email,
    password: req.body.password,
    name: req.body.email.split("@")[0],
  };

  const createdUser = await authService.createUser(user);
  return { status: 201, body: { user: createdUser } };
};

export const logout = async (
  req: HttpRequest<void>
): Promise<HttpResponse<void | ApiError>> => {
  if (!req.userId) {
    return { status: 401, body: { message: "Unauthorized" } };
  }

  try {
    await getAuthService().invalidateTokens(req.userId);
    return { status: 200 };
  } catch (e) {
    error((e as Error).message, e as Error);
    return { status: 500, body: { message: "Internal Server Error" } };
  }
};

export const googleLogin = async (
  req: HttpRequest<GoogleLoginRequest>
): Promise<HttpResponse<GoogleLoginResponse | ApiError>> => {
  try {
    const { email, givenName, familyName } = await verifyGoogleToken(req.body.credential);
    const authService = getAuthService();

    const existingUser = await authService.getUserByEmail(email, false);

    if (existingUser) {
      return { status: 200, body: { user: existingUser, isNewUser: false } };
    }

    if (!isEmailAllowed(email)) {
      return {
        status: 403,
        body: { message: "Account registration is currently restricted" },
      };
    }

    const name = [givenName, familyName].filter(Boolean).join(" ") || email.split("@")[0];
    const createdUser = await authService.createUser({ email, name });
    return { status: 201, body: { user: createdUser, isNewUser: true } };
  } catch (e) {
    error((e as Error).message, e as Error);
    return { status: 401, body: { message: "Google authentication failed" } };
  }
};
