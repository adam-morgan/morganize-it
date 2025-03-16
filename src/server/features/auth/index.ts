import { getDbInstanceType } from "@/server/db/type";
import { AuthService, AuthKnexService } from "./services";

let instance: AuthService;

export const getAuthService = (): AuthService => {
  if (instance == null) {
    if (getDbInstanceType() === "POSTGRESQL") {
      instance = new AuthKnexService();
    } else {
      throw new Error("Unsupported database type for auth service");
    }
  }

  return instance;
};
