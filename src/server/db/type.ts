export type DbType = "POSTGRESQL" | "DYNAMODB";

export const getDbInstanceType = (): DbType => {
  return (process.env.DB_TYPE as DbType) ?? "POSTGRESQL";
};
