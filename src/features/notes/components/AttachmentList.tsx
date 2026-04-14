import { useState } from "react";
import { take } from "rxjs";
import {
  File,
  FileImage,
  FileText,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileArchive,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAttachmentDownloadUrl, deleteNoteAttachment } from "../services/attachment-service";
import DeleteConfirmDialog from "../containers/DeleteConfirmDialog";

type Props = {
  noteId: string;
  attachments: Attachment[];
  canEdit: boolean;
  onAttachmentsChange: (attachments: Attachment[]) => void;
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 shrink-0" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="h-4 w-4 shrink-0" />;
  if (mimeType.startsWith("audio/")) return <FileAudio className="h-4 w-4 shrink-0" />;
  if (mimeType.startsWith("text/")) return <FileText className="h-4 w-4 shrink-0" />;
  if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 shrink-0" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-4 w-4 shrink-0" />;
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("compress") || mimeType.includes("archive"))
    return <FileArchive className="h-4 w-4 shrink-0" />;
  return <File className="h-4 w-4 shrink-0" />;
};

const AttachmentList = ({ noteId, attachments, canEdit, onAttachmentsChange }: Props) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  const handleOpen = (attachment: Attachment) => {
    setLoadingId(attachment.id);
    getAttachmentDownloadUrl(noteId, attachment.id)
      .pipe(take(1))
      .subscribe({
        next: ({ downloadUrl }) => {
          window.open(downloadUrl, "_blank");
          setLoadingId(null);
        },
        error: () => setLoadingId(null),
      });
  };

  const handleDelete = (attachment: Attachment) => {
    setDeleteTarget(null);
    setLoadingId(attachment.id);
    deleteNoteAttachment(noteId, attachment.id)
      .pipe(take(1))
      .subscribe({
        next: (updatedNote) => {
          onAttachmentsChange(updatedNote.attachments ?? []);
          setLoadingId(null);
        },
        error: () => setLoadingId(null),
      });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 border-b px-4 py-2">
        {attachments.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs transition-colors hover:bg-muted"
          >
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5"
              onClick={() => handleOpen(a)}
              disabled={loadingId === a.id}
            >
              {loadingId === a.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                getFileIcon(a.mimeType)
              )}
              <span className="max-w-[120px] truncate sm:max-w-[200px]">{a.filename}</span>
            </button>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 cursor-pointer p-0 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(a);
                }}
                disabled={loadingId === a.id}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete Attachment"
        message={`Are you sure you want to delete "${deleteTarget?.filename}"? This cannot be undone.`}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default AttachmentList;
