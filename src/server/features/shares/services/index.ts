import { getDbInstanceType } from "@/server/db/type";
import { ShareService } from "./share.service";
import { ShareKnexService } from "./share-knex.service";
import { ShareDynamoService } from "./share-dynamo.service";

export * from "./share.service";
export * from "./share-knex.service";
export * from "./share-dynamo.service";
export * from "./share-access.service";

let shareSvc: ShareService;

export const getShareService = (): ShareService => {
  if (shareSvc == null) {
    if (getDbInstanceType() === "POSTGRESQL") {
      shareSvc = new ShareKnexService();
    } else if (getDbInstanceType() === "DYNAMODB") {
      shareSvc = new ShareDynamoService();
    } else {
      throw new Error("Unsupported database type for share service");
    }
  }

  return shareSvc;
};
