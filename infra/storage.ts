import {
  usersTableSchema,
  notebooksTableSchema,
  notesTableSchema,
  friendshipsTableSchema,
  sharesTableSchema,
} from "../src/server/db/dynamo/tables";

export const usersTable = new sst.aws.Dynamo("Users", {
  fields: {
    [usersTableSchema.primaryKey.partition]: "string",
    ...Object.fromEntries(
      Object.values(usersTableSchema.indexes ?? {}).map((idx) => [idx.partition, "string"])
    ),
  },
  primaryIndex: {
    hashKey: usersTableSchema.primaryKey.partition,
    ...(usersTableSchema.primaryKey.sort && { rangeKey: usersTableSchema.primaryKey.sort }),
  },
  globalIndexes: Object.fromEntries(
    Object.entries(usersTableSchema.indexes ?? {}).map(([name, idx]) => [
      name,
      {
        hashKey: idx.partition,
        ...(idx.sort && { rangeKey: idx.sort }),
      },
    ])
  ),
});

export const notebooksTable = new sst.aws.Dynamo("Notebooks", {
  fields: {
    [notebooksTableSchema.primaryKey.partition]: "string",
    ...(notebooksTableSchema.primaryKey.sort && {
      [notebooksTableSchema.primaryKey.sort]: "string",
    }),
  },
  primaryIndex: {
    hashKey: notebooksTableSchema.primaryKey.partition,
    ...(notebooksTableSchema.primaryKey.sort && {
      rangeKey: notebooksTableSchema.primaryKey.sort,
    }),
  },
});

export const notesTable = new sst.aws.Dynamo("Notes", {
  fields: {
    [notesTableSchema.primaryKey.partition]: "string",
    ...(notesTableSchema.primaryKey.sort && {
      [notesTableSchema.primaryKey.sort]: "string",
    }),
    ...Object.fromEntries(
      Object.values(notesTableSchema.indexes ?? {}).map((idx) => [idx.partition, "string"])
    ),
  },
  primaryIndex: {
    hashKey: notesTableSchema.primaryKey.partition,
    ...(notesTableSchema.primaryKey.sort && {
      rangeKey: notesTableSchema.primaryKey.sort,
    }),
  },
  globalIndexes: Object.fromEntries(
    Object.entries(notesTableSchema.indexes ?? {}).map(([name, idx]) => [
      name,
      {
        hashKey: idx.partition,
        ...(idx.sort && { rangeKey: idx.sort }),
      },
    ])
  ),
});

const allIndexFields = (schema: { indexes?: Record<string, { partition: string; sort?: string }> }) => {
  const fields: Record<string, "string"> = {};
  for (const idx of Object.values(schema.indexes ?? {})) {
    fields[idx.partition] = "string";
    if (idx.sort) fields[idx.sort] = "string";
  }
  return fields;
};

export const friendshipsTable = new sst.aws.Dynamo("Friendships", {
  fields: {
    [friendshipsTableSchema.primaryKey.partition]: "string",
    ...(friendshipsTableSchema.primaryKey.sort && {
      [friendshipsTableSchema.primaryKey.sort]: "string",
    }),
    ...allIndexFields(friendshipsTableSchema),
  },
  primaryIndex: {
    hashKey: friendshipsTableSchema.primaryKey.partition,
    ...(friendshipsTableSchema.primaryKey.sort && {
      rangeKey: friendshipsTableSchema.primaryKey.sort,
    }),
  },
  globalIndexes: Object.fromEntries(
    Object.entries(friendshipsTableSchema.indexes ?? {}).map(([name, idx]) => [
      name,
      {
        hashKey: idx.partition,
        ...(idx.sort && { rangeKey: idx.sort }),
      },
    ])
  ),
});

export const connectionsTable = new sst.aws.Dynamo("Connections", {
  fields: {
    connectionId: "string",
    userId: "string",
  },
  primaryIndex: { hashKey: "connectionId" },
  globalIndexes: {
    userIdIndex: { hashKey: "userId" },
  },
  ttl: "expiresAt",
});

export const attachmentsBucket = new sst.aws.Bucket("Attachments", {
  cors: {
    allowOrigins: $app.stage === "prod" ? ["https://notes.adammorgan.ca"] : ["*"],
    allowMethods: ["GET", "PUT"],
    allowHeaders: ["Content-Type", "Content-Disposition"],
    maxAge: "3600 seconds",
  },
});

export const sharesTable = new sst.aws.Dynamo("Shares", {
  fields: {
    [sharesTableSchema.primaryKey.partition]: "string",
    ...(sharesTableSchema.primaryKey.sort && {
      [sharesTableSchema.primaryKey.sort]: "string",
    }),
    ...allIndexFields(sharesTableSchema),
  },
  primaryIndex: {
    hashKey: sharesTableSchema.primaryKey.partition,
    ...(sharesTableSchema.primaryKey.sort && {
      rangeKey: sharesTableSchema.primaryKey.sort,
    }),
  },
  globalIndexes: Object.fromEntries(
    Object.entries(sharesTableSchema.indexes ?? {}).map(([name, idx]) => [
      name,
      {
        hashKey: idx.partition,
        ...(idx.sort && { rangeKey: idx.sort }),
      },
    ])
  ),
});
