import { getDbInstanceType } from "@/server/db/type";
import { AttachmentStorage } from "./storage";
import { S3AttachmentStorage } from "./s3-storage";
import { LocalAttachmentStorage } from "./local-storage";

let instance: AttachmentStorage | undefined;

export const getAttachmentStorage = (): AttachmentStorage => {
  if (!instance) {
    instance = getDbInstanceType() === "DYNAMODB"
      ? new S3AttachmentStorage()
      : new LocalAttachmentStorage();
  }
  return instance;
};

export type { AttachmentStorage } from "./storage";
