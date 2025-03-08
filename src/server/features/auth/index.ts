import { getDbInstanceType } from "@/server/db/type";
import { AuthService } from "./auth.service";
import { PostgresAuthService } from "./auth-postgres.service";

let instance: AuthService;

export const getAuthService = (): AuthService => {
  if (instance == null) {
    if (getDbInstanceType() === "POSTGRESQL") {
      instance = new PostgresAuthService();
    } else {
      throw new Error("Unsupported database type for auth service");
    }
  }

  return instance;
};
