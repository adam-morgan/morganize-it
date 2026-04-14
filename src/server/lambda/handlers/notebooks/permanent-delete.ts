import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { withAuth } from "../../middleware";
import { getNotebookService, getNoteService } from "@/server/features/notes";
import { firstValueFrom } from "rxjs";
import { affectedUsersForNotebook, publishEvent } from "@/server/features/realtime";
import { getAttachmentStorage } from "@/server/features/attachments";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  const id = event.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing id" }) };
  }

  const svc = getNotebookService();

  try {
    // Verify the notebook belongs to this user (look up including soft-deleted)
    const result = await firstValueFrom(svc.find({ criteria: { id }, includeSoftDeleted: true }, event.auth!.userId));
    if (result.items.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: "Not found" }) };
    }

    // Clean up attachments for all notes in this notebook before cascade deletes them.
    const notesResult = await firstValueFrom(
      getNoteService().find({ criteria: { notebookId: id }, includeSoftDeleted: true }, event.auth!.userId)
    );
    const storage = getAttachmentStorage();
    for (const n of notesResult.items) {
      if (n.attachments && n.attachments.length > 0) {
        await firstValueFrom(storage.deleteAllForNote(n.id));
      }
    }

    // Capture affected users BEFORE the cascade removes shares.
    const userIds = await firstValueFrom(affectedUsersForNotebook(id));
    await firstValueFrom(svc.permanentDelete(id));
    await firstValueFrom(
      publishEvent(
        {
          type: "resource.changed",
          resourceType: "notebook",
          resourceId: id,
          action: "deleted",
        },
        userIds
      )
    );
    return { statusCode: 204 };
  } catch (err) {
    const error = err as Error;
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
});
