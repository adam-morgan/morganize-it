import { APIGatewayProxyResultV2, APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { firstValueFrom } from "rxjs";
import { DynamoConnectionRegistry } from "@/server/features/realtime/registries/dynamo-connection-registry";

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  const registry = new DynamoConnectionRegistry();
  try {
    await firstValueFrom(registry.remove(event.requestContext.connectionId));
  } catch {
    // Ignore; the row may already be gone via TTL.
  }
  return { statusCode: 200 };
};
