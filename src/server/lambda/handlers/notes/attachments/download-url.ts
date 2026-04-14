import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { withAuth } from "../../../middleware";
import { firstValueFrom } from "rxjs";
import { getDownloadUrl } from "@/server/http/routes/attachment";
import { HttpRequest } from "@/server/http/request";
import { HttpHeaders } from "@/server/http/headers";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  const noteId = event.pathParameters?.id;
  const attachmentId = event.pathParameters?.attachmentId;
  if (!noteId || !attachmentId) {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing note id or attachment id" }) };
  }

  try {
    const req: HttpRequest<void> = {
      method: "GET",
      body: undefined as unknown as void,
      headers: new HttpHeaders({}),
      params: { id: noteId, attachmentId },
      query: {},
      userId: event.auth!.userId,
    };

    const response = await firstValueFrom(getDownloadUrl(req));
    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response.body),
    };
  } catch (err) {
    const error = err as Error & { code?: number };
    return {
      statusCode: error.code ?? 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
});
