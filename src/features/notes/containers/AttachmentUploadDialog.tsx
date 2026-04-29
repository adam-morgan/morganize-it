import { useCallback, useEffect, useRef, useState } from "react";
import { firstValueFrom } from "rxjs";
import { Upload, X, Check, Loader2, AlertCircle, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestUploadUrl,
  confirmUpload,
  uploadFileToUrl,
} from "../services/attachment-service";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

type FileStatus = "pending" | "uploading" | "done" | "error";

type FileEntry = {
  file: File;
  displayName: string;
  status: FileStatus;
  error?: string;
};

type Props = {
  open: boolean;
  noteId: string;
  onClose: () => void;
  onUploaded: (updatedNote: Note) => void;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentUploadDialog = ({ open, noteId, onClose, onUploaded }: Props) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [editingIndex]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: FileEntry[] = Array.from(newFiles).map((file) => ({
      file,
      displayName: file.name,
      status: "pending" as FileStatus,
      error: file.size > MAX_FILE_SIZE ? `File exceeds 25 MB limit` : undefined,
    }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingValue(files[index].displayName);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const saveEditing = () => {
    if (editingIndex === null) return;
    const trimmed = editingValue.trim();
    if (!trimmed) {
      cancelEditing();
      return;
    }
    setFiles((prev) =>
      prev.map((f, idx) => (idx === editingIndex ? { ...f, displayName: trimmed } : f))
    );
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditing();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleUpload = async () => {
    const valid = files.filter((f) => !f.error && f.status === "pending");
    if (valid.length === 0) return;

    setUploading(true);
    let latestNote: Note | null = null;

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      if (entry.error || entry.status !== "pending") continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
      );

      try {
        const { uploadUrl, fileId } = await firstValueFrom(
          requestUploadUrl(noteId, entry.displayName, entry.file.type || "application/octet-stream")
        );
        await uploadFileToUrl(uploadUrl, entry.file);
        const updated = await firstValueFrom(
          confirmUpload(noteId, fileId, entry.displayName, entry.file.type || "application/octet-stream")
        );
        latestNote = updated;

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: (err as Error).message } : f
          )
        );
      }
    }

    setUploading(false);
    if (latestNote) {
      onUploaded(latestNote);
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending" && !f.error).length;
  const allDone = files.length > 0 && files.every((f) => f.status === "done" || f.error);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !uploading && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Attachments</DialogTitle>
          <DialogDescription>Attach files to this note. Maximum 25 MB per file.</DialogDescription>
        </DialogHeader>

        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag files here or click to browse
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                addFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((entry, i) => {
              const isEditing = editingIndex === i;
              const canEdit = entry.status === "pending" && !entry.error && !uploading;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          ref={renameInputRef}
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={handleRenameKeyDown}
                          className="h-7 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 cursor-pointer p-0"
                          onClick={saveEditing}
                          aria-label="Save filename"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 cursor-pointer p-0"
                          onClick={cancelEditing}
                          aria-label="Cancel rename"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="font-medium break-all">{entry.displayName}</span>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 shrink-0 cursor-pointer p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => startEditing(i)}
                            aria-label="Rename file"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatSize(entry.file.size)}
                      {entry.error && (
                        <span className="ml-2 text-destructive">{entry.error}</span>
                      )}
                    </p>
                  </div>
                  {entry.status === "uploading" && (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
                  )}
                  {entry.status === "done" && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  )}
                  {entry.status === "error" && (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  {entry.status === "pending" && !uploading && !isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 shrink-0 cursor-pointer p-0"
                      onClick={() => removeFile(i)}
                      aria-label="Remove file"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {allDone ? (
            <Button onClick={onClose} className="cursor-pointer">Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={uploading}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || pendingCount === 0 || editingIndex !== null}
                className="cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Upload ${pendingCount > 0 ? `(${pendingCount})` : ""}`
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentUploadDialog;
