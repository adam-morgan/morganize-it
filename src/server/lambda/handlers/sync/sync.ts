import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { firstValueFrom } from "rxjs";
import { sync } from "@/server/http/routes/sync";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { withAuth } from "../../middleware";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(
  async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    const req = makeHttpRequestFromEvent<{ lastSync?: string }>(event, event.auth?.userId);
    const response = await firstValueFrom(sync(req));
    return toLambdaResponse(response);
  }
);
