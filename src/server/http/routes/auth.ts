import { getAuthService } from "@/server/features";
import { HttpRequest } from "../request";
import { HttpResponse } from "../response";

export const whoami = async (
  req: HttpRequest<void>
): Promise<HttpResponse<User | ApiError | {}>> => {
  if (req.userId) {
    try {
      const user = await getAuthService().getUser(req.userId, false);
      return { status: 200, body: user };
    } catch (e) {
      console.error(e);
      return { status: 500, body: { message: "Internal Server Error" } };
    }
  } else {
    return { status: 200, body: {} };
  }
};

export const login = async (
  req: HttpRequest<LoginRequest>
): Promise<HttpResponse<LoginResponse | ApiError>> => {
  try {
    const response = await getAuthService().login(req.body.email, req.body.password);
    return { status: 200, body: response };
  } catch (error) {
    console.error(error);
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

  const user: Omit<User, "id"> = {
    email: req.body.email,
    password: req.body.password,
    name: req.body.email.split("@")[0],
  };

  const createdUser = await authService.createUser(user);
  return { status: 201, body: { user: createdUser } };
};
