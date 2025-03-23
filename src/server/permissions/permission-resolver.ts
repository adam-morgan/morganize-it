import { Observable } from "rxjs";

export interface PermissionResolver<T extends Entity> {
  canRead(userId: string, entity: T): Observable<boolean>;
  canCreate(userId: string, entity: T): Observable<boolean>;
  canUpdate(userId: string, entity: T): Observable<boolean>;
  canDelete(userId: string, entityId: string): Observable<boolean>;
}
