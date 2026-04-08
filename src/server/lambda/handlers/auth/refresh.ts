import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { signToken, signRefreshToken, verifyRefreshToken } from "../../auth";
import { getAuthService } from "@/server/features";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { refreshToken } = body as RefreshRequest;

    if (!refreshToken) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Missing refresh token" }),
      };
    }

    const payload = verifyRefreshToken(refreshToken);

    const user = await getAuthService().getUser(payload.userId, false);
    if (user.tokenInvalidBefore) {
      const invalidBefore = new Date(user.tokenInvalidBefore).getTime() / 1000;
      if (payload.iat < invalidBefore) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Token has been revoked" }),
        };
      }
    }

    const response: RefreshResponse = {
      token: signToken({ userId: payload.userId }),
      refreshToken: signRefreshToken({ userId: payload.userId }),
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    };
  } catch {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Invalid or expired refresh token" }),
    };
  }
};
