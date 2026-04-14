import { map, Observable, of } from "rxjs";
import { PermissionResolver } from "@/server/permissions";
import { getShareAccessService } from "../services";

/**
 * Only the owner of a notebook/note can create or update shares for it.
 * Deletion of a share is allowed for the owner of the underlying resource
 * OR the user the share was granted to (so a recipient can "leave" a share).
 */
export class SharePermissionResolver implements PermissionResolver<Share> {
  canCreate(userId: string, entity: Share): Observable<boolean> {
    return this.isOwnerOf(userId, entity.resourceType, entity.resourceId);
  }

  canUpdate(userId: string, entity: Share): Observable<boolean> {
    return this.isOwnerOf(userId, entity.resourceType, entity.resourceId);
  }

  canDelete(_userId: string, _entityId: string): Observable<boolean> {
    // Permission for delete is checked in the route handler since we need
    // the share itself loaded to know its resource. Always pass through here;
    // the handler does the real check.
    return of(true);
  }

  private isOwnerOf(
    userId: string,
    resourceType: ShareResourceType,
    resourceId: string
  ): Observable<boolean> {
    const access =
      resourceType === "notebook"
        ? getShareAccessService().getNotebookAccess(userId, resourceId)
        : getShareAccessService().getNoteAccess(userId, resourceId);
    return access.pipe(map((level) => level === "owner"));
  }
}
