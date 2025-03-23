import { map, Observable, of, switchMap, throwError } from "rxjs";
import { ReactiveService } from "../db/reactive-service";
import { NotFoundError } from "../errors";
import { PermissionResolver } from "./permission-resolver";

export class UserEntityPermissionResolver<T extends UserEntity> implements PermissionResolver<T> {
  constructor(private reactiveService: ReactiveService<T>) {}

  canRead(userId: string, entity: T): Observable<boolean> {
    return of(entity.userId === userId);
  }

  canCreate(userId: string, entity: T): Observable<boolean> {
    return of(entity.userId === userId);
  }

  canUpdate(userId: string, entity: T): Observable<boolean> {
    if (entity.userId !== entity.userId) {
      return of(false);
    }

    return this.reactiveService.find({ criteria: { id: entity.id } }).pipe(
      switchMap((results) =>
        results.length === 0
          ? throwError(() => new NotFoundError("Record not found"))
          : of(results[0])
      ),
      map((e) => e.userId === userId)
    );
  }

  canDelete(userId: string, entityId: string): Observable<boolean> {
    return this.reactiveService.find({ criteria: { id: entityId } }).pipe(
      switchMap((results) =>
        results.length === 0
          ? throwError(() => new NotFoundError("Record not found"))
          : of(results[0])
      ),
      map((e) => e.userId === userId)
    );
  }
}
