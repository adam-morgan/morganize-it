import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { createAccount } from "@/server/http/routes/auth";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { signToken, signRefreshToken } from "../../auth";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const req = makeHttpRequestFromEvent<CreateAccountRequest>(event);
  const response = await createAccount(req);

  if (response.status < 400) {
    const createResponse = response.body as CreateAccountResponse;
    const userId = createResponse.user!.id;
    return toLambdaResponse({
      ...response,
      body: {
        ...createResponse,
        token: signToken({ userId }),
        refreshToken: signRefreshToken({ userId }),
      },
    });
  }

  return toLambdaResponse(response);
};
