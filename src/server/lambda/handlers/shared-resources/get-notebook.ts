import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { firstValueFrom } from "rxjs";
import { getSharedNotebook } from "@/server/http/routes/shared-resources";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { withAuth } from "../../middleware";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(
  async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    const req = makeHttpRequestFromEvent<void>(event, event.auth?.userId);
    const response = await firstValueFrom(getSharedNotebook(req));
    return toLambdaResponse(response);
  }
);
