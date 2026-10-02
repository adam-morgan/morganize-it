import { useEffect, useState } from "react";
import { Download, File, FileText, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TEXT_PREVIEW_MAX_BYTES = 1024 * 1024;

type Props = {
  open: boolean;
  blob: Blob | null;
  filename: string;
  mimeType: string;
  onClose: () => void;
};

type Category = "image" | "video" | "audio" | "pdf" | "text" | "other";

// iPhones and iPads (including iPadOS, which masquerades as macOS but is the
// only "Mac" with a touchscreen). WebKit on iOS renders only the first page of
// a PDF inside an iframe, so those devices get a Share-first panel instead —
// the share sheet's Quick Look is the full native PDF viewer and works offline.
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);

const categorize = (mimeType: string, size: number): Category => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "pdf";

  const isTextLike =
    mimeType.startsWith("text/") || mimeType.includes("json") || mimeType.includes("xml");
  if (isTextLike && size <= TEXT_PREVIEW_MAX_BYTES) return "text";

  return "other";
};

// Renders an attachment blob entirely in-app. This is deliberate: popups
// (window.open) and programmatic <a download> clicks are blocked or silently
// dropped inside installed PWAs on iOS, so an inline viewer plus the native
// share sheet is the only path that works offline on an iPhone.
const AttachmentViewerDialog = ({ open, blob, filename, mimeType, onClose }: Props) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const category = blob ? categorize(mimeType, blob.size) : "other";

  useEffect(() => {
    if (!blob) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => {
    setTextContent(null);

    if (blob && categorize(mimeType, blob.size) === "text") {
      void blob.text().then(setTextContent);
    }
  }, [blob, mimeType]);

  // Web Share with files opens the native share sheet (Save to Files, AirDrop,
  // open in another app, ...). It works offline and must be called directly
  // from the tap handler so the user gesture is still active.
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function";

  const handleShare = () => {
    if (!blob) return;

    const file = new window.File([blob], filename, { type: mimeType || "application/octet-stream" });

    if (!navigator.canShare({ files: [file] })) {
      toast("Sharing this file type isn't supported on this device.");
      return;
    }

    navigator.share({ files: [file] }).catch(() => {
      // User cancelled the share sheet — nothing to do.
    });
  };

  const handleDownload = () => {
    if (!objectUrl) return;

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const renderContent = () => {
    if (!blob || !objectUrl) return null;

    switch (category) {
      case "image":
        return (
          <img
            src={objectUrl}
            alt={filename}
            className="mx-auto max-h-[min(65vh,calc(90vh-13rem))] max-w-full rounded-md object-contain"
          />
        );

      case "video":
        return (
          <video src={objectUrl} controls playsInline className="mx-auto max-h-[min(65vh,calc(90vh-13rem))] max-w-full rounded-md" />
        );

      case "audio":
        return <audio src={objectUrl} controls className="w-full" />;

      case "pdf":
        if (isIOS()) {
          return (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p className="text-sm">PDFs can't be previewed in-app on this device.</p>
              <p className="text-xs">Tap Share below to view it full-screen or save it.</p>
            </div>
          );
        }

        return (
          <iframe
            src={objectUrl}
            title={filename}
            className="h-[min(65vh,calc(90vh-13rem))] w-full rounded-md border"
          />
        );

      case "text":
        return (
          <pre className="max-h-[min(65vh,calc(90vh-13rem))] overflow-auto rounded-md border bg-muted/50 p-3 text-xs whitespace-pre-wrap">
            {textContent ?? "Loading..."}
          </pre>
        );

      default:
        return (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <File className="h-10 w-10" />
            <p className="text-sm">No preview available for this file type.</p>
            <p className="text-xs">Use Share or Download to open it in another app.</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-6 break-all">{filename}</DialogTitle>
        </DialogHeader>

        {renderContent()}

        {/* The footer stacks in reverse on mobile, so the last child renders on
            top. Share goes last: on iOS it's the primary action (Quick Look,
            Save to Files, AirDrop), while Download is the desktop workhorse. */}
        <DialogFooter className="gap-2">
          <Button
            variant={canShare ? "outline" : "default"}
            className="cursor-pointer"
            onClick={handleDownload}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download
          </Button>
          {canShare && (
            <Button className="cursor-pointer" onClick={handleShare}>
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentViewerDialog;
