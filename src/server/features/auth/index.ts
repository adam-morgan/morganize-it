import { getDbInstanceType } from "@/server/db/type";
import { AuthService, AuthKnexService } from "./services";
import { AuthDynamoService } from "./services/auth-dynamo.service";

let instance: AuthService;

export const getAuthService = (): AuthService => {
  if (instance == null) {
    if (getDbInstanceType() === "POSTGRESQL") {
      instance = new AuthKnexService();
    } else if (getDbInstanceType() === "DYNAMODB") {
      instance = new AuthDynamoService();
    } else {
      throw new Error("Unsupported database type for auth service");
    }
  }

  return instance;
};
