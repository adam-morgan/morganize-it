import fs from "fs";
import path from "path";
import { Observable, of } from "rxjs";
import { AttachmentStorage } from "./storage";

const BASE_DIR = path.resolve(".local/attachments");

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const filePath = (noteId: string, fileId: string): string =>
  path.join(BASE_DIR, noteId, fileId);

const getBaseUrl = (): string => {
  const port = process.env.PORT ?? "9001";
  return `http://localhost:${port}/api`;
};

export class LocalAttachmentStorage implements AttachmentStorage {
  getUploadUrl(noteId: string, fileId: string, _mimeType: string, _filename: string): Observable<{ uploadUrl: string; fileId: string }> {
    ensureDir(path.join(BASE_DIR, noteId));
    const uploadUrl = `${getBaseUrl()}/attachments/upload/${noteId}/${fileId}`;
    return of({ uploadUrl, fileId });
  }

  getDownloadUrl(noteId: string, fileId: string, _filename: string): Observable<string> {
    return of(`${getBaseUrl()}/attachments/download/${noteId}/${fileId}`);
  }

  deleteFile(noteId: string, fileId: string): Observable<void> {
    const fp = filePath(noteId, fileId);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
    }
    return of(undefined);
  }

  deleteAllForNote(noteId: string): Observable<void> {
    const dir = path.join(BASE_DIR, noteId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return of(undefined);
  }
}
