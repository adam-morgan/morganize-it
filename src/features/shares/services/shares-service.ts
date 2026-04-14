import { Observable } from "rxjs";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/utils/fetch";

export const listSharedNotebooks = (): Observable<SharedNotebook[]> =>
  apiGet<SharedNotebook[]>("/shares/notebooks");

export const listSharedNotes = (): Observable<SharedNote[]> =>
  apiGet<SharedNote[]>("/shares/notes");

export const listSharesForResource = (
  resourceType: ShareResourceType,
  resourceId: string
): Observable<ShareWithUser[]> =>
  apiGet<ShareWithUser[]>(
    `/shares/resource?type=${resourceType}&id=${encodeURIComponent(resourceId)}`
  );

export const createShare = (
  resourceType: ShareResourceType,
  resourceId: string,
  sharedWithUserId: string,
  permission: SharePermission
): Observable<Share> =>
  apiPost<
    {
      resourceType: ShareResourceType;
      resourceId: string;
      sharedWithUserId: string;
      permission: SharePermission;
    },
    Share
  >("/shares", { resourceType, resourceId, sharedWithUserId, permission });

export const updateShare = (
  id: string,
  permission: SharePermission
): Observable<Share> =>
  apiPatch<{ permission: SharePermission }, Share>(`/shares/${id}`, { permission });

export const deleteShare = (id: string): Observable<void> =>
  apiDelete<void>(`/shares/${id}`);

// Shared resource fetches
export const fetchSharedNotebook = (id: string): Observable<Notebook> =>
  apiGet<Notebook>(`/shared/notebooks/${id}`);

export const fetchSharedNotebookNotes = (id: string): Observable<Note[]> =>
  apiGet<Note[]>(`/shared/notebooks/${id}/notes`);

export const fetchSharedNote = (id: string): Observable<Note> =>
  apiGet<Note>(`/shared/notes/${id}`);
