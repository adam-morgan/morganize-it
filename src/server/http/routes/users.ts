import { HttpRequest } from "../request";
import { HttpResponse } from "../response";
import { getAuthService } from "@/server/features/auth";

export type PublicUser = Pick<User, "id" | "name" | "email">;

export const findUserByEmail = async (
  req: HttpRequest<void>
): Promise<HttpResponse<PublicUser | ApiError>> => {
  if (!req.userId) {
    return { status: 401, body: { message: "Unauthorized" } };
  }

  const email = ((req.query.email as string) ?? "").trim().toLowerCase();
  if (!email) {
    return { status: 400, body: { message: "Email required" } };
  }

  const user = await getAuthService().getUserByEmail(email, false);
  if (!user) {
    return { status: 404, body: { message: "Not found" } };
  }

  return {
    status: 200,
    body: { id: user.id, name: user.name, email: user.email },
  };
};
