import { useState } from "react";
import { take } from "rxjs";
import { UserPlus, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMaskSlice, useAlertSlice } from "@/features/app";
import { useFriendsSlice } from "../friendsSlice";
import ConfirmRemoveFriendDialog from "./ConfirmRemoveFriendDialog";

const FriendsView = () => {
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    sendRequest,
    acceptRequest,
    denyRequest,
    cancelRequest,
    removeFriend,
  } = useFriendsSlice();
  const { mask } = useMaskSlice();
  const { successAlert, errorAlert } = useAlertSlice();

  const [email, setEmail] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Friend | null>(null);

  const handleSend = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const unmask = mask("Sending request...");
    sendRequest(trimmed)
      .pipe(take(1))
      .subscribe({
        next: (friendship) => {
          unmask();
          setEmail("");
          successAlert(
            friendship.status === "accepted" ? "Friend added" : "Friend request sent"
          );
        },
        error: (err) => {
          unmask();
          errorAlert((err as Error).message ?? "Failed to send request");
        },
      });
  };

  const wrap = <T,>(fn: () => { subscribe: (o: { complete?: () => void; error?: (e: unknown) => void }) => unknown }, busy: string, success: string) => {
    const unmask = mask(busy);
    return fn().subscribe({
      complete: () => {
        unmask();
        successAlert(success);
      },
      error: (err: unknown) => {
        unmask();
        errorAlert((err as Error).message ?? "Operation failed");
      },
    }) as unknown as T;
  };

  const handleAccept = (id: string) => wrap(() => acceptRequest(id).pipe(take(1)), "Accepting...", "Friend added");
  const handleDeny = (id: string) => wrap(() => denyRequest(id).pipe(take(1)), "Denying...", "Request denied");
  const handleCancel = (id: string) => wrap(() => cancelRequest(id).pipe(take(1)), "Cancelling...", "Request cancelled");

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    wrap(
      () => removeFriend(target.friendshipId).pipe(take(1)),
      "Removing friend...",
      `${target.name} removed`
    );
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="mb-4 text-xl font-semibold">Add Friend</h2>
      <div className="mb-8 flex gap-2">
        <Input
          type="email"
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <Button onClick={handleSend} disabled={!email.trim()} className="cursor-pointer">
          <UserPlus className="mr-2 h-4 w-4" />
          Send
        </Button>
      </div>

      {incomingRequests.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Incoming Requests</h2>
          <ul className="divide-y rounded-lg border">
            {incomingRequests.map((r) => (
              <li
                key={r.friendshipId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-sm text-muted-foreground">{r.email}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(r.friendshipId)}
                    className="cursor-pointer"
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeny(r.friendshipId)}
                    className="cursor-pointer"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Deny
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoingRequests.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Pending Sent</h2>
          <ul className="divide-y rounded-lg border">
            {outgoingRequests.map((r) => (
              <li
                key={r.friendshipId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-sm text-muted-foreground">{r.email}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancel(r.friendshipId)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Friends</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any friends yet. Send a request to get started.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {friends.map((f) => (
              <li
                key={f.friendshipId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-sm text-muted-foreground">{f.email}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer text-destructive"
                  onClick={() => setRemoveTarget(f)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmRemoveFriendDialog
        friend={removeTarget}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
};

export default FriendsView;
