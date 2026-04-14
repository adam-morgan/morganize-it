import { catchError, forkJoin, map, Observable, of, switchMap } from "rxjs";
import { getShareService } from "@/server/features/shares";
import { getNoteService, getNotebookService } from "@/server/features/notes/services";

const dedupe = (ids: Array<string | undefined | null>): string[] =>
  Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0)));

/**
 * Resolve the set of users who should receive a real-time notification when
 * the given notebook changes. Includes the owner and everyone the notebook
 * is currently shared with.
 *
 * Looks up shares by resourceId — works for both soft-delete and update
 * because share rows persist past the notebook's soft-delete. For permanent
 * deletes the caller must compute affected users *before* invoking this
 * helper since the cascade has already removed the share rows.
 */
export const affectedUsersForNotebook = (
  notebookId: string,
  ownerId?: string
): Observable<string[]> => {
  const owner$ = ownerId
    ? of(ownerId)
    : getNotebookService()
        .findById(notebookId)
        .pipe(
          map((n) => n?.userId),
          catchError(() => of(undefined))
        );
  return forkJoin([
    owner$,
    getShareService()
      .findForResource("notebook", notebookId)
      .pipe(catchError(() => of([] as Share[]))),
  ]).pipe(map(([owner, shares]) => dedupe([owner, ...shares.map((s) => s.sharedWithUserId)])));
};

/**
 * Resolve users to notify for a note change. Includes the note owner, anyone
 * the parent notebook is shared with, and anyone the note itself is shared
 * with.
 */
export const affectedUsersForNote = (
  noteId: string,
  notebookId?: string,
  ownerId?: string
): Observable<string[]> => {
  const note$ = ownerId && notebookId
    ? of({ userId: ownerId, notebookId } as { userId?: string; notebookId?: string })
    : getNoteService()
        .findById(noteId)
        .pipe(
          map((n) => ({ userId: n?.userId, notebookId: n?.notebookId })),
          catchError(() => of({ userId: ownerId, notebookId } as { userId?: string; notebookId?: string }))
        );

  return note$.pipe(
    switchMap(({ userId, notebookId: nbId }) => {
      const resolvedNbId = nbId ?? notebookId;
      const noteShares$ = getShareService()
        .findForResource("note", noteId)
        .pipe(catchError(() => of([] as Share[])));
      const notebookShares$ = resolvedNbId
        ? getShareService()
            .findForResource("notebook", resolvedNbId)
            .pipe(catchError(() => of([] as Share[])))
        : of([] as Share[]);
      return forkJoin([noteShares$, notebookShares$]).pipe(
        map(([noteShares, nbShares]) =>
          dedupe([
            userId,
            ...noteShares.map((s) => s.sharedWithUserId),
            ...nbShares.map((s) => s.sharedWithUserId),
          ])
        )
      );
    })
  );
};

export const affectedUsersForShare = (share: Share): string[] =>
  dedupe([share.ownerId, share.sharedWithUserId]);

export const affectedUsersForFriendship = (friendship: Friendship): string[] =>
  dedupe([friendship.requesterId, friendship.recipientId]);
