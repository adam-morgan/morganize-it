import { usersTableSchema, notebooksTableSchema, notesTableSchema } from "../src/server/db/dynamo/tables";

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
