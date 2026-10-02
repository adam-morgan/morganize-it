import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { buildDynamoQuery } from "@/server/db/dynamo/query-builder";
import { notebooksTableSchema, notesTableSchema } from "@/server/db/dynamo/tables";

describe("buildDynamoQuery", () => {
  it("treats a stored NULL the same as a missing attribute", () => {
    const { command } = buildDynamoQuery("Notebooks", notebooksTableSchema, {
      criteria: { deletedAt: null },
    });

    expect(command).toBeInstanceOf(ScanCommand);
    expect(command.input.FilterExpression).toBe(
      "(attribute_not_exists(#deletedAt) OR attribute_type(#deletedAt, :v1))"
    );
    expect(command.input.ExpressionAttributeValues).toEqual({ ":v1": "NULL" });
  });

  it("uses the primary key when equality filters are nested in $and", () => {
    const { command } = buildDynamoQuery("Notes", notesTableSchema, {
      criteria: { $and: [{ userId: "u1" }, { deletedAt: null }, { id: "n1" }] },
    });

    expect(command).toBeInstanceOf(QueryCommand);
    expect((command as QueryCommand).input.IndexName).toBeUndefined();
    expect((command as QueryCommand).input.KeyConditionExpression).toBe(
      "#userId = :v1 AND #id = :v2"
    );
    expect(command.input.FilterExpression).toContain("attribute_not_exists(#deletedAt)");
  });

  it("uses a GSI when its partition key is nested in $and", () => {
    const { command } = buildDynamoQuery("Notes", notesTableSchema, {
      criteria: { $and: [{ deletedAt: null }, { notebookId: "nb1" }] },
    });

    expect(command).toBeInstanceOf(QueryCommand);
    expect((command as QueryCommand).input.IndexName).toBe("notebookIndex");
  });

  it("falls back to a scan when the sort key filter cannot be a key condition", () => {
    const { command } = buildDynamoQuery("Notes", notesTableSchema, {
      criteria: { $and: [{ userId: "u1" }, { id: { $in: ["n1", "n2"] } }] },
    });

    expect(command).toBeInstanceOf(ScanCommand);
  });

  it("keeps $not criteria in a scan filter", () => {
    const { command } = buildDynamoQuery("Notes", notesTableSchema, {
      criteria: { $and: [{ userId: "u1" }, { $not: { deletedAt: null } }] },
    });

    expect(command).toBeInstanceOf(ScanCommand);
    expect(command.input.FilterExpression).toContain("NOT (attribute_not_exists(#deletedAt)");
  });
});
