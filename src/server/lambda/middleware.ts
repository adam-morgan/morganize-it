import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { verifyToken } from "./auth";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };
type Handler = (event: AuthenticatedEvent) => Promise<APIGatewayProxyResultV2>;

export const withAuth = (handler: Handler): Handler => {
  return async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    const authHeader = event.headers?.authorization ?? event.headers?.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Missing or invalid authorization header" }),
      };
    }

    const token = authHeader.slice(7);

    try {
      const payload = verifyToken(token);
      event.auth = { userId: payload.userId };
      return handler(event);
    } catch {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Invalid or expired token" }),
      };
    }
  };
};
