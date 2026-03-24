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
