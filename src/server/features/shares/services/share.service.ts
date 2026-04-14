import { Observable } from "rxjs";

export interface ShareService {
  findById(id: string): Observable<Share | undefined>;
  findForResource(resourceType: ShareResourceType, resourceId: string): Observable<Share[]>;
  findExisting(
    resourceType: ShareResourceType,
    resourceId: string,
    sharedWithUserId: string
  ): Observable<Share | undefined>;
  findSharedWith(
    sharedWithUserId: string,
    resourceType?: ShareResourceType
  ): Observable<Share[]>;
  findOwnedBy(ownerId: string): Observable<Share[]>;
  /**
   * Find shares created by ownerId targeting sharedWithUserId. Used for
   * cascade revocation when a friendship ends.
   */
  findOwnedByDirected(ownerId: string, sharedWithUserId: string): Observable<Share[]>;
  /**
   * Find note-level shares for the given note ids. Used to update parent
   * notebook references when a note is moved.
   */
  findByResourceIds(
    resourceType: ShareResourceType,
    resourceIds: string[]
  ): Observable<Share[]>;
  create(share: Share): Observable<Share>;
  update(id: string, share: Share): Observable<Share>;
  delete(id: string): Observable<void>;
  /**
   * Permanent-delete cascade helper: remove all shares pointing at a given
   * resource and (optionally) all note-level shares whose parent notebook
   * matches.
   */
  deleteAllForResource(
    resourceType: ShareResourceType,
    resourceId: string
  ): Observable<void>;
  deleteAllForNotebook(notebookId: string): Observable<void>;
}
