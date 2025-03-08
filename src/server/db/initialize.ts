import { getKnex } from "./sql";
import { getDbInstanceType } from "./type";

export const initDb = async () => {
  if (getDbInstanceType() === "POSTGRESQL") {
    await getKnex().migrate.latest();
  }
};
