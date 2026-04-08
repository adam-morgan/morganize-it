import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { googleLogin } from "@/server/http/routes/auth";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { signToken, signRefreshToken } from "../../auth";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const req = makeHttpRequestFromEvent<GoogleLoginRequest>(event);
  const response = await googleLogin(req);

  if (response.status < 400) {
    const loginResponse = response.body as GoogleLoginResponse;
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
