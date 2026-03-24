import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDocClient, getTableName } from "@/server/db/dynamo/client";
import { usersTableSchema } from "@/server/db/dynamo/tables";
import { AbstractAuthService } from "./auth.service";

export class AuthDynamoService extends AbstractAuthService {
  private get tableName() {
    return getTableName("Users");
  }

  async _getUser(id: string): Promise<User> {
    const result = await getDocClient().send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      })
    );
    return result.Item as User;
  }

  async _getUserByEmail(email: string): Promise<User | undefined> {
    const indexName = Object.keys(usersTableSchema.indexes ?? {})[0];

    const result = await getDocClient().send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: "#email = :email",
        ExpressionAttributeNames: { "#email": "email" },
        ExpressionAttributeValues: { ":email": email },
        Limit: 1,
      })
    );

    return result.Items?.[0] as User | undefined;
  }

  async _createUser(user: User): Promise<User> {
    await getDocClient().send(
      new PutCommand({
        TableName: this.tableName,
        Item: user as unknown as Record<string, unknown>,
        ConditionExpression: "attribute_not_exists(id)",
      })
    );
    return user;
  }

  async _updateUser(user: User): Promise<User> {
    await getDocClient().send(
      new PutCommand({
        TableName: this.tableName,
        Item: user as unknown as Record<string, unknown>,
        ConditionExpression: "attribute_exists(id)",
      })
    );
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await getDocClient().send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
        ConditionExpression: "attribute_exists(id)",
      })
    );
  }
}
