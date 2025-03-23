import { Observable } from "rxjs";

export interface PermissionResolver<T extends Entity> {
  canCreate(userId: string, entity: T): Observable<boolean>;
  canUpdate(userId: string, entity: T): Observable<boolean>;
  canDelete(userId: string, entityId: string): Observable<boolean>;
}
