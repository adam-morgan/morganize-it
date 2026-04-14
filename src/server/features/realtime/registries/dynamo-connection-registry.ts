import { from, map, Observable } from "rxjs";
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { getDocClient, getTableName } from "@/server/db/dynamo/client";
import { ConnectionRegistry } from "../connection-registry";

const CONNECTION_TTL_SECONDS = 2 * 60 * 60; // 2h — matches API Gateway WS idle limit

export class DynamoConnectionRegistry implements ConnectionRegistry {
  private get tableName() {
    return getTableName("Connections");
  }

  add(userId: string, connectionId: string): Observable<void> {
    const expiresAt = Math.floor(Date.now() / 1000) + CONNECTION_TTL_SECONDS;
    return from(
      getDocClient().send(
        new PutCommand({
          TableName: this.tableName,
          Item: { connectionId, userId, expiresAt },
        })
      )
    ).pipe(map(() => undefined));
  }

  remove(connectionId: string): Observable<void> {
    return from(
      getDocClient().send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { connectionId },
        })
      )
    ).pipe(map(() => undefined));
  }

  findByUserIds(userIds: string[]): Observable<string[]> {
    if (userIds.length === 0) return from(Promise.resolve([] as string[]));
    const unique = Array.from(new Set(userIds));
    const tableName = this.tableName;
    const client = getDocClient();
    const work = Promise.all(
      unique.map(async (userId) => {
        const result = await client.send(
          new QueryCommand({
            TableName: tableName,
            IndexName: "userIdIndex",
            KeyConditionExpression: "#u = :u",
            ExpressionAttributeNames: { "#u": "userId" },
            ExpressionAttributeValues: { ":u": userId },
          })
        );
        return (result.Items ?? []).map((i) => i.connectionId as string);
      })
    ).then((groups) => groups.flat());
    return from(work);
  }
}
