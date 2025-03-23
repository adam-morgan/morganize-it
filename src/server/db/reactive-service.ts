import { Observable, of, switchMap, throwError } from "rxjs";
import { NotFoundError } from "../errors";

export type TableID = string;

export interface ReactiveService<T extends Entity> {
  find(options: FindOptions): Observable<T[]>;
  findById(id: TableID): Observable<T>;
  create(data: Omit<T, "id">): Observable<T>;
  update(id: TableID, data: T): Observable<T>;
  patch(id: TableID, data: Partial<T>): Observable<T>;
  delete(id: TableID): Observable<void>;
}

export abstract class AbstractReactiveService<T extends Entity> implements ReactiveService<T> {
  protected idProperty = "id";

  abstract find(options: FindOptions): Observable<T[]>;
  abstract create(data: T): Observable<T>;
  abstract update(id: TableID, data: T): Observable<T>;
  abstract delete(id: TableID): Observable<void>;

  findById(id: TableID): Observable<T> {
    return this.find({ criteria: { id } }).pipe(
      switchMap((items) =>
        items.length === 0 ? throwError(() => new NotFoundError(`Not found: ${id}`)) : of(items[0])
      )
    );
  }

  patch(id: TableID, data: Partial<T>): Observable<T> {
    return this.findById(id).pipe(switchMap((item) => this.update(id, { ...item, ...data })));
  }
}
