import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { withAuth } from "../../../middleware";
import { firstValueFrom } from "rxjs";
import { deleteAttachment } from "@/server/http/routes/attachment";
import { affectedUsersForNote, publishEvent } from "@/server/features/realtime";
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
      method: "DELETE",
      body: undefined as unknown as void,
      headers: new HttpHeaders({}),
      params: { id: noteId, attachmentId },
      query: {},
      userId: event.auth!.userId,
    };

    const response = await firstValueFrom(deleteAttachment(req));
    const note = response.body;
    if (note) {
      const userIds = await firstValueFrom(
        affectedUsersForNote(noteId, note.notebookId, note.userId)
      );
      await firstValueFrom(
        publishEvent(
          { type: "resource.changed", resourceType: "note", resourceId: noteId, notebookId: note.notebookId, action: "updated" },
          userIds
        )
      );
    }
    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: response.body ? JSON.stringify(response.body) : undefined,
    };
  } catch (err) {
    const error = err as Error & { code?: number };
    return {
      statusCode: error.code ?? 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
});
