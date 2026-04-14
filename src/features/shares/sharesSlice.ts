import { create } from "zustand";
import { Observable, tap, take } from "rxjs";
import { useNotebooksSlice } from "../notes/notebooksSlice";
import {
  createShare,
  deleteShare,
  listSharesForResource,
  updateShare,
} from "./services";

type SharesSlice = {
  listForResource: (
    resourceType: ShareResourceType,
    resourceId: string
  ) => Observable<ShareWithUser[]>;
  addShare: (
    resourceType: ShareResourceType,
    resourceId: string,
    sharedWithUserId: string,
    permission: SharePermission
  ) => Observable<Share>;
  updateSharePermission: (id: string, permission: SharePermission) => Observable<Share>;
  removeShare: (id: string) => Observable<void>;
  reset: () => void;
};

const triggerResync = () => {
  useNotebooksSlice
    .getState()
    .resync()
    .pipe(take(1))
    .subscribe({
      error: (err) => console.warn("resync after share change failed", err),
    });
};

export const useSharesSlice = create<SharesSlice>(() => ({
  reset: () => {},

  listForResource: (resourceType, resourceId) =>
    listSharesForResource(resourceType, resourceId),

  addShare: (resourceType, resourceId, sharedWithUserId, permission) =>
    createShare(resourceType, resourceId, sharedWithUserId, permission).pipe(
      tap(() => triggerResync())
    ),
  updateSharePermission: (id, permission) =>
    updateShare(id, permission).pipe(tap(() => triggerResync())),
  removeShare: (id) =>
    deleteShare(id).pipe(tap(() => triggerResync())),
}));
