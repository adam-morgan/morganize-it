import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { withAuth } from "../../../middleware";
import { firstValueFrom } from "rxjs";
import { requestUploadUrl } from "@/server/http/routes/attachment";
import { HttpRequest } from "@/server/http/request";
import { HttpHeaders } from "@/server/http/headers";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  const noteId = event.pathParameters?.id;
  if (!noteId) {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing note id" }) };
  }

  try {
    const body = JSON.parse(event.body ?? "{}");
    const req: HttpRequest<{ filename: string; mimeType: string }> = {
      method: "POST",
      body,
      headers: new HttpHeaders({}),
      params: { id: noteId },
      query: {},
      userId: event.auth!.userId,
    };

    const response = await firstValueFrom(requestUploadUrl(req));
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
