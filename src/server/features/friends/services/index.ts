import { getDbInstanceType } from "@/server/db/type";
import { FriendshipService } from "./friendship.service";
import { FriendshipKnexService } from "./friendship-knex.service";
import { FriendshipDynamoService } from "./friendship-dynamo.service";

export * from "./friendship.service";
export * from "./friendship-knex.service";
export * from "./friendship-dynamo.service";

let friendshipSvc: FriendshipService;

export const getFriendshipService = (): FriendshipService => {
  if (friendshipSvc == null) {
    if (getDbInstanceType() === "POSTGRESQL") {
      friendshipSvc = new FriendshipKnexService();
    } else if (getDbInstanceType() === "DYNAMODB") {
      friendshipSvc = new FriendshipDynamoService();
    } else {
      throw new Error("Unsupported database type for friendship service");
    }
  }

  return friendshipSvc;
};
