import { Observable } from "rxjs";
import { apiPost, apiGet, apiDelete } from "@/utils/fetch";

export const requestUploadUrl = (
  noteId: string,
  filename: string,
  mimeType: string
): Observable<{ uploadUrl: string; fileId: string }> =>
  apiPost(`/notes/${noteId}/attachments/upload-url`, { filename, mimeType });

export const confirmUpload = (
  noteId: string,
  fileId: string,
  filename: string,
  mimeType: string
): Observable<Note> =>
  apiPost(`/notes/${noteId}/attachments/confirm`, { fileId, filename, mimeType });

export const getAttachmentDownloadUrl = (
  noteId: string,
  attachmentId: string
): Observable<{ downloadUrl: string }> =>
  apiGet(`/notes/${noteId}/attachments/${attachmentId}/download-url`);

export const deleteNoteAttachment = (
  noteId: string,
  attachmentId: string
): Observable<Note> =>
  apiDelete(`/notes/${noteId}/attachments/${attachmentId}`);

export const uploadFileToUrl = async (uploadUrl: string, file: Blob): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!response.ok) {
    const error = new Error(`Upload failed: ${response.statusText}`) as Error & { status: number };
    error.status = response.status;

    throw error;
  }
};
