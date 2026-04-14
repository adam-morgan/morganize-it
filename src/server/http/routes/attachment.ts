import { map, Observable, of, switchMap, throwError } from "rxjs";
import { v4 as uuid } from "uuid";
import { HttpRequest } from "../request";
import { HttpResponse } from "../response";
import { getNoteService } from "@/server/features/notes";
import { getAttachmentStorage } from "@/server/features/attachments";
import { getShareAccessService } from "@/server/features/shares";
import { NotFoundError, ForbiddenError, UnauthorizedError } from "@/server/errors";

type UploadUrlRequest = { filename: string; mimeType: string };
type UploadUrlResponse = { uploadUrl: string; fileId: string };
type ConfirmRequest = { fileId: string; filename: string; mimeType: string };

const requireAuth = (userId?: string): Observable<string> =>
  userId ? of(userId) : throwError(() => new UnauthorizedError("Unauthorized"));

const requireWriteAccess = (userId: string, noteId: string, notebookId: string): Observable<void> =>
  getShareAccessService()
    .getNoteAccess(userId, noteId, notebookId)
    .pipe(
      switchMap((level) =>
        level === "owner" || level === "readwrite"
          ? of(undefined)
          : throwError(() => new ForbiddenError("Forbidden"))
      )
    );

const requireReadAccess = (userId: string, noteId: string, notebookId: string): Observable<void> =>
  getShareAccessService()
    .getNoteAccess(userId, noteId, notebookId)
    .pipe(
      switchMap((level) =>
        level !== "none"
          ? of(undefined)
          : throwError(() => new ForbiddenError("Forbidden"))
      )
    );

const findNote = (noteId: string): Observable<Note> =>
  getNoteService()
    .find({ criteria: { id: noteId } })
    .pipe(
      switchMap((result) =>
        result.items.length === 0
          ? throwError(() => new NotFoundError("Note not found"))
          : of(result.items[0])
      )
    );

export const requestUploadUrl = (
  req: HttpRequest<UploadUrlRequest>
): Observable<HttpResponse<UploadUrlResponse>> => {
  const noteId = req.params.id;
  const { filename, mimeType } = req.body;

  return requireAuth(req.userId).pipe(
    switchMap((userId) =>
      findNote(noteId).pipe(
        switchMap((note) =>
          requireWriteAccess(userId, noteId, note.notebookId).pipe(
            switchMap(() => {
              const fileId = uuid();
              return getAttachmentStorage()
                .getUploadUrl(noteId, fileId, mimeType, filename)
                .pipe(map((result) => ({ status: 200, body: result })));
            })
          )
        )
      )
    )
  );
};

export const confirmUpload = (
  req: HttpRequest<ConfirmRequest>
): Observable<HttpResponse<Note>> => {
  const noteId = req.params.id;
  const { fileId, filename, mimeType } = req.body;

  return requireAuth(req.userId).pipe(
    switchMap((userId) =>
      findNote(noteId).pipe(
        switchMap((note) =>
          requireWriteAccess(userId, noteId, note.notebookId).pipe(
            switchMap(() => {
              const attachment: Attachment = { id: fileId, filename, mimeType };
              const attachments = [...(note.attachments ?? []), attachment];
              return getNoteService()
                .patch(noteId, { attachments, updatedAt: new Date().toISOString() } as Partial<Note>)
                .pipe(map((updated) => ({ status: 200, body: updated })));
            })
          )
        )
      )
    )
  );
};

export const getDownloadUrl = (
  req: HttpRequest<void>
): Observable<HttpResponse<{ downloadUrl: string }>> => {
  const noteId = req.params.id;
  const attachmentId = req.params.attachmentId;

  return requireAuth(req.userId).pipe(
    switchMap((userId) =>
      findNote(noteId).pipe(
        switchMap((note) =>
          requireReadAccess(userId, noteId, note.notebookId).pipe(
            switchMap(() => {
              const attachment = (note.attachments ?? []).find((a) => a.id === attachmentId);
              if (!attachment) {
                return throwError(() => new NotFoundError("Attachment not found"));
              }
              return getAttachmentStorage()
                .getDownloadUrl(noteId, attachmentId, attachment.filename)
                .pipe(map((downloadUrl) => ({ status: 200, body: { downloadUrl } })));
            })
          )
        )
      )
    )
  );
};

export const deleteAttachment = (
  req: HttpRequest<void>
): Observable<HttpResponse<Note>> => {
  const noteId = req.params.id;
  const attachmentId = req.params.attachmentId;

  return requireAuth(req.userId).pipe(
    switchMap((userId) =>
      findNote(noteId).pipe(
        switchMap((note) =>
          requireWriteAccess(userId, noteId, note.notebookId).pipe(
            switchMap(() => {
              const existing = note.attachments ?? [];
              if (!existing.some((a) => a.id === attachmentId)) {
                return throwError(() => new NotFoundError("Attachment not found"));
              }
              const attachments = existing.filter((a) => a.id !== attachmentId);
              return getAttachmentStorage()
                .deleteFile(noteId, attachmentId)
                .pipe(
                  switchMap(() =>
                    getNoteService()
                      .patch(noteId, { attachments, updatedAt: new Date().toISOString() } as Partial<Note>)
                      .pipe(map((updated) => ({ status: 200, body: updated })))
                  )
                );
            })
          )
        )
      )
    )
  );
};
