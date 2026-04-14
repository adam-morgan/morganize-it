import { APIGatewayProxyResultV2, APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { firstValueFrom } from "rxjs";
import { verifyToken } from "@/server/auth/jwt";
import { DynamoConnectionRegistry } from "@/server/features/realtime/registries/dynamo-connection-registry";

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2 & {
    queryStringParameters?: Record<string, string | undefined>;
  }
): Promise<APIGatewayProxyResultV2> => {
  const token = event.queryStringParameters?.token;
  if (!token) {
    return { statusCode: 401, body: "Missing token" };
  }

  let userId: string;
  try {
    userId = verifyToken(token).userId;
  } catch {
    return { statusCode: 401, body: "Invalid token" };
  }

  const registry = new DynamoConnectionRegistry();
  await firstValueFrom(registry.add(userId, event.requestContext.connectionId));
  return { statusCode: 200 };
};
