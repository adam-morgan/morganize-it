import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { from, Observable, switchMap, of } from "rxjs";
import { AttachmentStorage } from "./storage";

let s3Client: S3Client | undefined;

const getS3Client = (): S3Client => {
  if (!s3Client) {
    s3Client = new S3Client({});
  }
  return s3Client;
};

const getBucketName = (): string => {
  try {
    const { Resource } = require("sst");
    return Resource.Attachments.name;
  } catch {
    return process.env.S3_BUCKET_NAME ?? "morganizeit";
  }
};

const buildKey = (noteId: string, fileId: string): string =>
  `attachments/${noteId}/${fileId}`;

const buildPrefix = (noteId: string): string =>
  `attachments/${noteId}/`;

export class S3AttachmentStorage implements AttachmentStorage {
  getUploadUrl(noteId: string, fileId: string, mimeType: string, _filename: string): Observable<{ uploadUrl: string; fileId: string }> {
    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: buildKey(noteId, fileId),
      ContentType: mimeType,
    });

    return from(
      getSignedUrl(getS3Client(), command, { expiresIn: 900 })
    ).pipe(
      switchMap((uploadUrl) => of({ uploadUrl, fileId }))
    );
  }

  getDownloadUrl(noteId: string, fileId: string, filename: string): Observable<string> {
    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: buildKey(noteId, fileId),
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(filename)}"`,
    });

    return from(getSignedUrl(getS3Client(), command, { expiresIn: 3600 }));
  }

  deleteFile(noteId: string, fileId: string): Observable<void> {
    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: buildKey(noteId, fileId),
    });

    return from(getS3Client().send(command).then(() => undefined));
  }

  deleteAllForNote(noteId: string): Observable<void> {
    const bucket = getBucketName();
    const prefix = buildPrefix(noteId);

    return from(
      getS3Client().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }))
    ).pipe(
      switchMap((listing) => {
        const objects = listing.Contents;
        if (!objects || objects.length === 0) return of(undefined);

        return from(
          getS3Client().send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: objects.map((o) => ({ Key: o.Key! })) },
            })
          ).then(() => undefined)
        );
      })
    );
  }
}
