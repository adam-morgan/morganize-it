import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { googleLogin } from "@/server/http/routes/auth";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { signToken } from "../../auth";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const req = makeHttpRequestFromEvent<GoogleLoginRequest>(event);
  const response = await googleLogin(req);

  if (response.status < 400) {
    const loginResponse = response.body as GoogleLoginResponse;
    const token = signToken({ userId: loginResponse.user!.id });
    return toLambdaResponse({
      ...response,
      body: { ...loginResponse, token },
    });
  }

  return toLambdaResponse(response);
};
