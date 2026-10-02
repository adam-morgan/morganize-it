import { forkJoin, map, Observable, of, switchMap } from "rxjs";
import { getNotebookService, getNoteService } from "@/server/features/notes/services";
import { catchError } from "rxjs/operators";
import { ShareService } from "./share.service";
import { ShareKnexService } from "./share-knex.service";
import { ShareDynamoService } from "./share-dynamo.service";
import { getDbInstanceType } from "@/server/db/type";

let shareSvcInstance: ShareService;
const getShareSvc = (): ShareService => {
  if (!shareSvcInstance) {
    shareSvcInstance =
      getDbInstanceType() === "POSTGRESQL" ? new ShareKnexService() : new ShareDynamoService();
  }
  return shareSvcInstance;
};

export interface ShareAccessService {
  /**
   * Resolve the access level a user has on a notebook. Returns "owner" if
   * they own it, the share permission if a notebook-level share exists,
   * else "none".
   */
  getNotebookAccess(userId: string, notebookId: string): Observable<ShareAccessLevel>;

  /**
   * Resolve effective access on a single note. Combines ownership, the
   * note-level share (if any), and the parent notebook's access level via
   * principle of MOST privilege ("readwrite" > "read" > "none").
   */
  getNoteAccess(
    userId: string,
    noteId: string,
    notebookId?: string
  ): Observable<ShareAccessLevel>;
}

const PRIORITY: Record<ShareAccessLevel, number> = {
  none: 0,
  read: 1,
  readwrite: 2,
  owner: 3,
};

const max = (a: ShareAccessLevel, b: ShareAccessLevel): ShareAccessLevel =>
  PRIORITY[a] >= PRIORITY[b] ? a : b;

class DefaultShareAccessService implements ShareAccessService {
  getNotebookAccess(userId: string, notebookId: string): Observable<ShareAccessLevel> {
    return getNotebookService()
      .find({ criteria: { id: notebookId }, includeSoftDeleted: true })
      .pipe(
        map((result) => result.items[0]),
        catchError(() => of(undefined)),
        switchMap((notebook) => {
          if (notebook && notebook.userId === userId) return of("owner" as ShareAccessLevel);
          return getShareSvc()
            .findExisting("notebook", notebookId, userId)
            .pipe(
              map((share) => (share ? (share.permission as ShareAccessLevel) : "none"))
            );
        })
      );
  }

  getNoteAccess(
    userId: string,
    noteId: string,
    notebookId?: string
  ): Observable<ShareAccessLevel> {
    return getNoteService()
      .find({ criteria: { id: noteId }, includeSoftDeleted: true })
      .pipe(
        map((result) => result.items[0]),
        catchError(() => of(undefined)),
        switchMap((note) => {
          // Owner of the note always wins.
          if (note && note.userId === userId) return of("owner" as ShareAccessLevel);

          const parentNotebookId = notebookId ?? note?.notebookId;
          if (!parentNotebookId) return of("none" as ShareAccessLevel);

          return forkJoin([
            getShareSvc().findExisting("note", noteId, userId),
            this.getNotebookAccess(userId, parentNotebookId),
          ]).pipe(
            map(([noteShare, notebookAccess]) => {
              const noteLevel: ShareAccessLevel = noteShare
                ? (noteShare.permission as ShareAccessLevel)
                : "none";
              return max(noteLevel, notebookAccess);
            })
          );
        })
      );
  }
}

let instance: ShareAccessService;
export const getShareAccessService = (): ShareAccessService => {
  if (!instance) instance = new DefaultShareAccessService();
  return instance;
};
