import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { firstValueFrom } from "rxjs";
import { removeFriend } from "@/server/http/routes/friends";
import { revokeSharesBetween } from "@/server/features/shares";
import { makeHttpRequestFromEvent, toLambdaResponse } from "../../util";
import { withAuth } from "../../middleware";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(
  async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
    const req = makeHttpRequestFromEvent<void>(event, event.auth?.userId);
    const response = await firstValueFrom(
      removeFriend(req, (friendship) =>
        revokeSharesBetween(friendship.requesterId, friendship.recipientId)
      )
    );
    return toLambdaResponse(response);
  }
);
