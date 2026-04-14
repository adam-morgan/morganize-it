import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { firstValueFrom } from "rxjs";
import { createShare } from "@/server/http/routes/shares";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { withAuth } from "../../middleware";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(
  async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    const req = makeHttpRequestFromEvent<{
      resourceType: ShareResourceType;
      resourceId: string;
      sharedWithUserId: string;
      permission: SharePermission;
    }>(event, event.auth?.userId);
    const response = await firstValueFrom(createShare(req));
    return toLambdaResponse(response);
  }
);
