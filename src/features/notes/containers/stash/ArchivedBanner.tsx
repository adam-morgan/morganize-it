import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";

type ArchivedBannerProps = {
  message: string;
  onUnarchive?: () => void;
};

const ArchivedBanner = ({ message, onUnarchive }: ArchivedBannerProps) => (
  <div className="mb-4 flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
    <Archive className="h-4 w-4 shrink-0" />
    <span className="flex-1">{message}</span>
    {onUnarchive && (
      <Button variant="ghost" size="sm" className="cursor-pointer" onClick={onUnarchive}>
        <ArchiveRestore className="mr-1 h-4 w-4" />
        Unarchive
      </Button>
    )}
  </div>
);

export default ArchivedBanner;
