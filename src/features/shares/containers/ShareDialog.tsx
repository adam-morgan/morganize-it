import { useEffect, useState } from "react";
import { take } from "rxjs";
import { Trash2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useFriendsSlice } from "@/features/friends";
import { useAlertSlice } from "@/features/app";
import { useSharesSlice } from "../sharesSlice";

type Props = {
  open: boolean;
  resourceType: ShareResourceType;
  resourceId: string;
  /** Display name for the dialog title. */
  resourceName: string;
  onClose: () => void;
};

const ShareDialog = ({ open, resourceType, resourceId, resourceName, onClose }: Props) => {
  const { friends } = useFriendsSlice();
  const { listForResource, addShare, updateSharePermission, removeShare } = useSharesSlice();
  const { successAlert, errorAlert } = useAlertSlice();

  const [shares, setShares] = useState<ShareWithUser[]>([]);
  const [pickedFriend, setPickedFriend] = useState<string>("");
  const [pickedPermission, setPickedPermission] = useState<SharePermission>("read");
  const [busy, setBusy] = useState(false);

  const refreshShares = () => {
    listForResource(resourceType, resourceId)
      .pipe(take(1))
      .subscribe({
        next: setShares,
        error: () => setShares([]),
      });
  };

  useEffect(() => {
    if (open) {
      setPickedFriend("");
      setPickedPermission("read");
      refreshShares();
    }
    // refreshShares is stable across renders
  }, [open, resourceType, resourceId]);

  const sharedWithIds = new Set(shares.map((s) => s.user.id));
  const candidateFriends = friends.filter((f) => !sharedWithIds.has(f.userId));

  const handleAdd = () => {
    if (!pickedFriend) return;
    setBusy(true);
    addShare(resourceType, resourceId, pickedFriend, pickedPermission)
      .pipe(take(1))
      .subscribe({
        next: () => {
          setBusy(false);
          setPickedFriend("");
          successAlert("Shared");
          refreshShares();
        },
        error: (err) => {
          setBusy(false);
          errorAlert((err as Error).message ?? "Failed to share");
        },
      });
  };

  const handleChangePermission = (id: string, permission: SharePermission) => {
    setBusy(true);
    updateSharePermission(id, permission)
      .pipe(take(1))
      .subscribe({
        next: () => {
          setBusy(false);
          successAlert("Permission updated");
          refreshShares();
        },
        error: (err) => {
          setBusy(false);
          errorAlert((err as Error).message ?? "Failed to update permission");
        },
      });
  };

  const handleRemove = (id: string) => {
    setBusy(true);
    removeShare(id)
      .pipe(take(1))
      .subscribe({
        next: () => {
          setBusy(false);
          successAlert("Share removed");
          refreshShares();
        },
        error: (err) => {
          setBusy(false);
          errorAlert((err as Error).message ?? "Failed to remove share");
        },
      });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share &quot;{resourceName}&quot;</DialogTitle>
          <DialogDescription>
            {resourceType === "notebook"
              ? "Friends with read-write access can edit notes and add new ones. Only you can delete the notebook or share it with others."
              : "Friends with read-write access can edit this note. Only you can delete it or share it with others."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Shared with</h3>
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not shared with anyone yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {shares.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.user.email}
                      </div>
                    </div>
                    <Select
                      value={s.permission}
                      onValueChange={(v) =>
                        handleChangePermission(s.id, v as SharePermission)
                      }
                      disabled={busy}
                    >
                      <SelectTrigger className="w-32 cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Read only</SelectItem>
                        <SelectItem value="readwrite">Read &amp; write</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(s.id)}
                      disabled={busy}
                      className="cursor-pointer text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Add a friend</h3>
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You don&apos;t have any friends to share with yet. Add friends from the avatar
                menu.
              </p>
            ) : candidateFriends.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Already shared with all your friends.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={pickedFriend} onValueChange={setPickedFriend} disabled={busy}>
                  <SelectTrigger className="min-w-0 flex-1 basis-full cursor-pointer sm:basis-0">
                    <SelectValue placeholder="Select a friend" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateFriends.map((f) => (
                      <SelectItem key={f.userId} value={f.userId}>
                        {f.name} ({f.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={pickedPermission}
                  onValueChange={(v) => setPickedPermission(v as SharePermission)}
                  disabled={busy}
                >
                  <SelectTrigger className="w-32 shrink-0 cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read only</SelectItem>
                    <SelectItem value="readwrite">Read &amp; write</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAdd}
                  disabled={!pickedFriend || busy}
                  className="shrink-0 cursor-pointer"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
