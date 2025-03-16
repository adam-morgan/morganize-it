import { Observable, of, switchMap, throwError } from "rxjs";

export type TableID = string | number;

export interface ReactiveService<T, ID extends TableID> {
  find(options: FindOptions): Observable<T[]>;
  findById(id: ID): Observable<T>;
  create(data: T): Observable<T>;
  update(id: ID, data: T): Observable<T>;
  patch(id: ID, data: Partial<T>): Observable<T>;
  delete(id: ID): Observable<void>;
}

export abstract class AbstractReactiveService<T, ID extends TableID>
  implements ReactiveService<T, ID>
{
  protected idProperty = "id";

  abstract find(options: FindOptions): Observable<T[]>;
  abstract create(data: T): Observable<T>;
  abstract update(id: ID, data: T): Observable<T>;
  abstract delete(id: ID): Observable<void>;

  findById(id: ID): Observable<T> {
    return this.find({ criteria: { id } }).pipe(
      switchMap((items) =>
        items.length === 0 ? throwError(() => new Error(`Not found: ${id}`)) : of(items[0])
      )
    );
  }

  patch(id: ID, data: Partial<T>): Observable<T> {
    return this.findById(id).pipe(switchMap((item) => this.update(id, { ...item, ...data })));
  }
}
