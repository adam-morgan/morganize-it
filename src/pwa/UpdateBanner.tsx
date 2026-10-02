import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateSlice } from "./updateSlice";

const UpdateBanner = () => {
  const updateReady = useUpdateSlice((s) => s.updateReady);
  const setUpdateReady = useUpdateSlice((s) => s.setUpdateReady);

  if (!updateReady) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm shadow-lg">
      <span>A new version is available</span>
      <Button size="sm" className="h-7 cursor-pointer" onClick={() => window.location.reload()}>
        <RefreshCw className="mr-1 h-3.5 w-3.5" />
        Reload
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 cursor-pointer"
        title="Dismiss"
        onClick={() => setUpdateReady(false)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default UpdateBanner;
