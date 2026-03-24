import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { whoami } from "@/server/http/routes/auth";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { withAuth } from "../../middleware";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  const req = makeHttpRequestFromEvent<void>(event, event.auth?.userId);
  const response = await whoami(req);
  return toLambdaResponse(response);
});
