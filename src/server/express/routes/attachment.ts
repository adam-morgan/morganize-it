import { Request, Response, Router } from "express";
import { firstValueFrom, take } from "rxjs";
import multer from "multer";
import fs from "fs";
import path from "path";
import { makeHttpRequest, handleHttpResponse } from "../util";
import {
  requestUploadUrl,
  confirmUpload,
  getDownloadUrl,
  deleteAttachment,
} from "@/server/http/routes/attachment";
import { affectedUsersForNote, publishEvent } from "@/server/features/realtime";

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });

export const attachmentRoutes = (router: Router) => {
  router.post("/notes/:id/attachments/upload-url", (req: Request, res: Response) => {
    requestUploadUrl(makeHttpRequest(req) as never)
      .pipe(take(1))
      .subscribe({
        next: (response) => handleHttpResponse(response, res),
        error: (err) => res.status(err.code ?? 500).json({ message: err.message }),
      });
  });

  router.post("/notes/:id/attachments/confirm", (req: Request, res: Response) => {
    confirmUpload(makeHttpRequest(req) as never)
      .pipe(take(1))
      .subscribe({
        next: async (response) => {
          handleHttpResponse(response, res);
          const note = response.body as Note | undefined;
          if (note) {
            const userIds = await firstValueFrom(affectedUsersForNote(req.params.id, note.notebookId, note.userId));
            await firstValueFrom(publishEvent({ type: "resource.changed", resourceType: "note", resourceId: req.params.id, notebookId: note.notebookId, action: "updated" }, userIds));
          }
        },
        error: (err) => res.status(err.code ?? 500).json({ message: err.message }),
      });
  });

  router.get("/notes/:id/attachments/:attachmentId/download-url", (req: Request, res: Response) => {
    getDownloadUrl(makeHttpRequest(req) as never)
      .pipe(take(1))
      .subscribe({
        next: (response) => handleHttpResponse(response, res),
        error: (err) => res.status(err.code ?? 500).json({ message: err.message }),
      });
  });

  router.delete("/notes/:id/attachments/:attachmentId", (req: Request, res: Response) => {
    deleteAttachment(makeHttpRequest(req) as never)
      .pipe(take(1))
      .subscribe({
        next: async (response) => {
          handleHttpResponse(response, res);
          const note = response.body as Note | undefined;
          if (note) {
            const userIds = await firstValueFrom(affectedUsersForNote(req.params.id, note.notebookId, note.userId));
            await firstValueFrom(publishEvent({ type: "resource.changed", resourceType: "note", resourceId: req.params.id, notebookId: note.notebookId, action: "updated" }, userIds));
          }
        },
        error: (err) => res.status(err.code ?? 500).json({ message: err.message }),
      });
  });

  // Local dev direct upload/download endpoints
  const BASE_DIR = path.resolve(".local/attachments");

  router.put("/attachments/upload/:noteId/:fileId", upload.single("file"), (req: Request, res: Response) => {
    const { noteId, fileId } = req.params;
    const dir = path.join(BASE_DIR, noteId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (req.file) {
      fs.writeFileSync(path.join(dir, fileId), req.file.buffer);
    } else if (req.body && Buffer.isBuffer(req.body)) {
      fs.writeFileSync(path.join(dir, fileId), req.body);
    } else {
      // Raw body upload (fetch PUT with file as body)
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        fs.writeFileSync(path.join(dir, fileId), Buffer.concat(chunks));
        res.status(200).json({ ok: true });
      });
      return;
    }
    res.status(200).json({ ok: true });
  });

  router.get("/attachments/download/:noteId/:fileId", (req: Request, res: Response) => {
    const { noteId, fileId } = req.params;
    const filePath = path.join(BASE_DIR, noteId, fileId);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    res.sendFile(filePath);
  });
};
