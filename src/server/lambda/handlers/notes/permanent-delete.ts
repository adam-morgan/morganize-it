import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { withAuth } from "../../middleware";
import { getNoteService } from "@/server/features/notes";
import { firstValueFrom } from "rxjs";

type AuthenticatedEvent = APIGatewayProxyEventV2 & { auth?: { userId: string } };

export const handler = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  const id = event.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing id" }) };
  }

  const svc = getNoteService();

  try {
    // Verify the note belongs to this user (look up including soft-deleted)
    const result = await firstValueFrom(svc.find({ criteria: { id }, includeSoftDeleted: true }, event.auth!.userId));
    if (result.items.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: "Not found" }) };
    }

    await firstValueFrom(svc.permanentDelete(id));
    return { statusCode: 204 };
  } catch (err) {
    const error = err as Error;
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
});
