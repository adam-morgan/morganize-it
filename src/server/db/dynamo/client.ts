import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let docClient: DynamoDBDocumentClient | undefined;

export const getDocClient = (): DynamoDBDocumentClient => {
  if (docClient == null) {
    const client = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
};

export const getTableName = (logicalName: string): string => {
  // In SST, table names are available via Resource bindings at runtime.
  // We dynamically import sst to avoid build-time dependency when running Express stack.
  // Falls back to environment variable for local testing.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resource } = require("sst");
    return Resource[logicalName].name;
  } catch {
    const envName = `DYNAMO_TABLE_${logicalName.toUpperCase()}`;
    const tableName = process.env[envName];
    if (!tableName) {
      throw new Error(
        `Table name not found for "${logicalName}". Set ${envName} env var or ensure SST Resource bindings are available.`
      );
    }
    return tableName;
  }
};
