import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { login } from "@/server/http/routes/auth";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { signToken, signRefreshToken } from "../../auth";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const req = makeHttpRequestFromEvent<LoginRequest>(event);
  const response = await login(req);

  if (response.status < 400) {
    const loginResponse = response.body as LoginResponse;
    const userId = loginResponse.user!.id;
    return toLambdaResponse({
      ...response,
      body: {
        ...loginResponse,
        token: signToken({ userId }),
        refreshToken: signRefreshToken({ userId }),
      },
    });
  }

  return toLambdaResponse(response);
};
