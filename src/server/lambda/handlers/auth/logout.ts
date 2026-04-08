import { APIGatewayProxyResultV2 } from "aws-lambda";
import { logout } from "@/server/http/routes/auth";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { withAuth } from "../../middleware";

export const handler = withAuth(async (event): Promise<APIGatewayProxyResultV2> => {
  const req = makeHttpRequestFromEvent<void>(event, event.auth?.userId);
  const response = await logout(req);
  return toLambdaResponse(response);
});
