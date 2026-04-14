import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { firstValueFrom } from "rxjs";
import { updateShare } from "@/server/http/routes/shares";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { withAuth } from "../../middleware";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(
  async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    const req = makeHttpRequestFromEvent<{ permission: SharePermission }>(
      event,
      event.auth?.userId
    );
    const response = await firstValueFrom(updateShare(req));
    return toLambdaResponse(response);
  }
);
