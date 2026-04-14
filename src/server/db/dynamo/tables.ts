export type DynamoIndex = {
  partition: string;
  sort?: string;
};

export type DynamoTableSchema = {
  primaryKey: DynamoIndex;
  indexes?: Record<string, DynamoIndex>;
};

export const usersTableSchema: DynamoTableSchema = {
  primaryKey: { partition: "id" },
  indexes: {
    emailIndex: { partition: "email" },
  },
};

export const notebooksTableSchema: DynamoTableSchema = {
  primaryKey: { partition: "userId", sort: "id" },
};

export const notesTableSchema: DynamoTableSchema = {
  primaryKey: { partition: "userId", sort: "id" },
  indexes: {
    notebookIndex: { partition: "notebookId", sort: "id" },
  },
};

export const friendshipsTableSchema: DynamoTableSchema = {
  primaryKey: { partition: "id" },
  indexes: {
    requesterIndex: { partition: "requesterId", sort: "status" },
    recipientIndex: { partition: "recipientId", sort: "status" },
  },
};

export const sharesTableSchema: DynamoTableSchema = {
  primaryKey: { partition: "id" },
  indexes: {
    sharedWithIndex: { partition: "sharedWithUserId", sort: "resourceType" },
    resourceIndex: { partition: "resourceId", sort: "sharedWithUserId" },
    ownerIndex: { partition: "ownerId" },
    notebookSharesIndex: { partition: "notebookId", sort: "sharedWithUserId" },
  },
};
