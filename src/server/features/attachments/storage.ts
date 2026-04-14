import { Observable } from "rxjs";

export interface AttachmentStorage {
  getUploadUrl(noteId: string, fileId: string, mimeType: string, filename: string): Observable<{ uploadUrl: string; fileId: string }>;
  getDownloadUrl(noteId: string, fileId: string, filename: string): Observable<string>;
  deleteFile(noteId: string, fileId: string): Observable<void>;
  deleteAllForNote(noteId: string): Observable<void>;
}
