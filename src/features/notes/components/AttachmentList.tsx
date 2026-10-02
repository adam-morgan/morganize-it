import { useRef, useState } from "react";
import { firstValueFrom, take } from "rxjs";
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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAttachmentDownloadUrl, deleteNoteAttachment } from "../services/attachment-service";
import { getCachedAttachment, putAttachmentBlob } from "../services/attachment-cache";
import { useAuthSlice } from "@/features/auth";
import { useNetworkSlice } from "@/features/network/networkSlice";
import DeleteConfirmDialog from "../containers/DeleteConfirmDialog";
import AttachmentViewerDialog from "./AttachmentViewerDialog";

const LONG_PRESS_MS = 500;

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

type ViewerState = {
  blob: Blob;
  filename: string;
  mimeType: string;
};

const AttachmentList = ({ noteId, attachments, canEdit, onAttachmentsChange }: Props) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const user = useAuthSlice((s) => s.user);
  const online = useNetworkSlice((s) => s.online);
  const userId = user && !(user as GuestUser).isGuest ? (user.id as string) : null;

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (attachmentId: string) => {
    longPressFiredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setPressedId(attachmentId);
    }, LONG_PRESS_MS);
  };

  const handleTouchEndOrCancel = () => {
    clearLongPressTimer();
  };

  // Everything renders in the in-app viewer. window.open and programmatic
  // <a download> clicks are blocked or silently dropped inside installed PWAs
  // on iOS (they also lose the user gesture across our async cache reads), so
  // popups can never be the delivery mechanism for attachments.
  const openFromCache = async (attachment: Attachment): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    const cached = await getCachedAttachment(userId, noteId, attachment.id);
    if (cached) {
      setViewer({ blob: cached.blob, filename: attachment.filename, mimeType: attachment.mimeType });
      return true;
    }

    return false;
  };

  const fetchAndOpen = async (attachment: Attachment): Promise<void> => {
    const { downloadUrl } = await firstValueFrom(getAttachmentDownloadUrl(noteId, attachment.id));

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Opportunistically cache the bytes we just paid for, so this attachment
    // opens offline next time. Best-effort — viewing must not depend on it.
    if (userId) {
      void putAttachmentBlob(userId, noteId, attachment.id, blob, attachment.filename, attachment.mimeType).catch(() => {});
    }

    setViewer({ blob, filename: attachment.filename, mimeType: attachment.mimeType });
  };

  const handleOpen = (attachment: Attachment) => {
    setLoadingId(attachment.id);

    const finish = () => setLoadingId(null);

    // Cache first: instant, and it's the only source when offline. The online
    // flag is just a hint (navigator.onLine lies inside iOS PWAs), so a cache
    // miss always falls through to the network attempt, which in turn falls
    // back to a clear message when it fails.
    void openFromCache(attachment)
      .then((served) => {
        if (served) {
          return;
        }

        return fetchAndOpen(attachment).catch(() => {
          toast(
            online
              ? "Couldn't open attachment — and it isn't saved offline."
              : "This attachment isn't saved for offline use yet."
          );
        });
      })
      .finally(finish);
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
          <Popover
            key={a.id}
            open={pressedId === a.id}
            onOpenChange={(open) => {
              if (!open) setPressedId(null);
            }}
          >
            <PopoverTrigger asChild>
              <div
                className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs transition-colors hover:bg-muted"
                onTouchStart={() => handleTouchStart(a.id)}
                onTouchEnd={handleTouchEndOrCancel}
                onTouchMove={handleTouchEndOrCancel}
                onTouchCancel={handleTouchEndOrCancel}
                onContextMenu={(e) => {
                  if (longPressFiredRef.current) e.preventDefault();
                }}
              >
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-1.5"
                  onClick={(e) => {
                    if (longPressFiredRef.current) {
                      e.preventDefault();
                      e.stopPropagation();
                      longPressFiredRef.current = false;
                      return;
                    }
                    handleOpen(a);
                  }}
                  disabled={loadingId === a.id}
                >
                  {loadingId === a.id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    getFileIcon(a.mimeType)
                  )}
                  <span
                    className="max-w-[120px] truncate sm:max-w-[200px]"
                    title={a.filename}
                  >
                    {a.filename}
                  </span>
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
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-auto max-w-[80vw] px-3 py-2 text-xs break-all"
            >
              {a.filename}
            </PopoverContent>
          </Popover>
        ))}
      </div>

      <AttachmentViewerDialog
        open={!!viewer}
        blob={viewer?.blob ?? null}
        filename={viewer?.filename ?? ""}
        mimeType={viewer?.mimeType ?? ""}
        onClose={() => setViewer(null)}
      />

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
