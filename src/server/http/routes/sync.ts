import {
  catchError,
  defer,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
} from "rxjs";
import { HttpRequest } from "../request";
import { HttpResponse } from "../response";
import { getNotebookService, getNoteService } from "@/server/features/notes/services";
import { getShareService } from "@/server/features/shares";
import { getAuthService } from "@/server/features/auth";

type SyncBody = { lastSync?: string };

const ACCESS_PRIORITY: Record<ShareAccessLevel, number> = {
  none: 0,
  read: 1,
  readwrite: 2,
  owner: 3,
};

const errToResponse = (e: { code?: number; message: string }): HttpResponse<ApiError> => ({
  status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
  body: { message: e.message },
});

export const sync = (
  req: HttpRequest<SyncBody>
): Observable<HttpResponse<SyncResponse | ApiError>> => {
  if (!req.userId) {
    return of({ status: 401, body: { message: "Unauthorized" } });
  }
  const me = req.userId;
  const lastSync = req.body?.lastSync ?? null;

  const findOptions: FindOptions = {
    ...(lastSync && { criteria: { updatedAt: { $gte: lastSync } } }),
    includeSoftDeleted: true,
  };

  return forkJoin({
    ownedNotebooks: getNotebookService()
      .find(findOptions, me)
      .pipe(map((r) => r.items)),
    ownedNotes: getNoteService()
      .find(findOptions, me)
      .pipe(map((r) => r.items)),
    allOwnedNotebooks: getNotebookService()
      .find({}, me)
      .pipe(map((r) => r.items)),
    notebookShares: getShareService().findSharedWith(me, "notebook"),
    noteShares: getShareService().findSharedWith(me, "note"),
  }).pipe(
    switchMap(({ ownedNotebooks, ownedNotes, allOwnedNotebooks, notebookShares, noteShares }) => {
      const ownedNotebookIds = new Set(allOwnedNotebooks.map((nb) => nb.id));

      // Hydrate shared notebooks
      const sharedNotebooks$: Observable<SyncNotebook[]> =
        notebookShares.length === 0
          ? of([])
          : forkJoin(
              notebookShares.map((share) =>
                forkJoin([
                  getNotebookService()
                    .findById(share.resourceId)
                    .pipe(catchError(() => of(undefined))),
                  defer(() => getAuthService().getUser(share.ownerId, false)).pipe(
                    catchError(() => of(undefined))
                  ),
                ]).pipe(
                  map(([notebook, owner]) => {
                    if (!notebook || notebook.deletedAt || !owner) return undefined;
                    return {
                      ...notebook,
                      accessLevel: share.permission as ShareAccessLevel,
                      ownerName: owner.name,
                      ownerEmail: owner.email,
                      shareId: share.id,
                    } as SyncNotebook;
                  })
                )
              )
            ).pipe(
              map((items) => items.filter((i): i is SyncNotebook => i != null))
            );

      // Hydrate individually shared notes
      const sharedNotes$: Observable<SyncNote[]> =
        noteShares.length === 0
          ? of([])
          : forkJoin(
              noteShares.map((share) =>
                forkJoin([
                  getNoteService()
                    .findById(share.resourceId)
                    .pipe(catchError(() => of(undefined))),
                  getNotebookService()
                    .findById(share.notebookId)
                    .pipe(catchError(() => of(undefined))),
                  defer(() => getAuthService().getUser(share.ownerId, false)).pipe(
                    catchError(() => of(undefined))
                  ),
                ]).pipe(
                  map(([note, notebook, owner]) => {
                    if (!note || note.deletedAt || !notebook || notebook.deletedAt || !owner)
                      return undefined;
                    return {
                      ...note,
                      accessLevel: share.permission as ShareAccessLevel,
                      ownerName: owner.name,
                      ownerEmail: owner.email,
                      parentNotebookName: notebook.name,
                      shareId: share.id,
                    } as SyncNote;
                  })
                )
              )
            ).pipe(
              map((items) => items.filter((i): i is SyncNote => i != null))
            );

      const collaboratorNotes$: Observable<SyncNote[]> =
        allOwnedNotebooks.length === 0
          ? of([])
          : forkJoin(
              allOwnedNotebooks.map((nb) =>
                getNoteService()
                  .find({ criteria: { notebookId: nb.id } })
                  .pipe(
                    map((r) => r.items.filter((note) => note.userId !== me)),
                    catchError(() => of([] as Note[]))
                  )
              )
            ).pipe(
              map((groups) => groups.flat()),
              switchMap((notes) => {
                const authorIds = Array.from(new Set(notes.map((n) => n.userId)));

                if (authorIds.length === 0) return of([] as SyncNote[]);

                return forkJoin(
                  authorIds.map((id) =>
                    defer(() => getAuthService().getUser(id, false)).pipe(
                      catchError(() => of(undefined))
                    )
                  )
                ).pipe(
                  map((authors) => {
                    const authorById = new Map(
                      authors.filter((a) => a != null).map((a) => [a.id, a])
                    );
                    const notebookNameById = new Map(
                      allOwnedNotebooks.map((nb) => [nb.id, nb.name])
                    );

                    return notes.map(
                      (note) =>
                        ({
                          ...note,
                          accessLevel: "readwrite",
                          ownerName: authorById.get(note.userId)?.name,
                          ownerEmail: authorById.get(note.userId)?.email,
                          parentNotebookName: notebookNameById.get(note.notebookId),
                        }) as SyncNote
                    );
                  })
                );
              })
            );

      return forkJoin({
        sharedNotebooks: sharedNotebooks$,
        sharedNotes: sharedNotes$,
        collaboratorNotes: collaboratorNotes$,
      }).pipe(
        switchMap(({ sharedNotebooks, sharedNotes, collaboratorNotes }) => {
          // Get notes from shared notebooks
          const sharedNbNotes$: Observable<SyncNote[]> =
            sharedNotebooks.length === 0
              ? of([])
              : forkJoin(
                  sharedNotebooks.map((nb) =>
                    getNoteService()
                      .find({ criteria: { notebookId: nb.id } })
                      .pipe(
                        map((r) =>
                          r.items.map(
                            (note) =>
                              ({
                                ...note,
                                accessLevel: nb.accessLevel,
                                ownerName: nb.ownerName,
                                ownerEmail: nb.ownerEmail,
                                parentNotebookName: nb.name,
                              }) as SyncNote
                          )
                        ),
                        catchError(() => of([] as SyncNote[]))
                      )
                  )
                ).pipe(map((arrays) => arrays.flat()));

          return sharedNbNotes$.pipe(
            map((sharedNbNotes) => {
              // Merge notebooks: owned + shared, deduplicate by id
              const notebookMap = new Map<string, SyncNotebook>();
              for (const nb of ownedNotebooks) {
                notebookMap.set(nb.id, { ...nb, accessLevel: "owner" });
              }
              for (const nb of sharedNotebooks) {
                const existing = notebookMap.get(nb.id);
                if (
                  !existing ||
                  ACCESS_PRIORITY[nb.accessLevel] > ACCESS_PRIORITY[existing.accessLevel]
                ) {
                  notebookMap.set(nb.id, nb);
                }
              }
              // Shadow notebooks for individually shared notes
              for (const note of sharedNotes) {
                if (
                  !notebookMap.has(note.notebookId) &&
                  !ownedNotebookIds.has(note.notebookId) &&
                  note.parentNotebookName
                ) {
                  notebookMap.set(note.notebookId, {
                    id: note.notebookId,
                    userId: note.userId,
                    name: note.parentNotebookName,
                    updatedAt: "",
                    accessLevel: "none",
                    ownerName: note.ownerName,
                    ownerEmail: note.ownerEmail,
                  });
                }
              }

              // Merge notes: owned + notebook-shared + note-shared, deduplicate
              const noteMap = new Map<string, SyncNote>();
              for (const note of ownedNotes) {
                noteMap.set(note.id, { ...note, accessLevel: "owner" });
              }
              for (const note of [...collaboratorNotes, ...sharedNbNotes]) {
                const existing = noteMap.get(note.id);
                if (
                  !existing ||
                  ACCESS_PRIORITY[note.accessLevel] > ACCESS_PRIORITY[existing.accessLevel]
                ) {
                  noteMap.set(note.id, note);
                }
              }
              for (const note of sharedNotes) {
                const existing = noteMap.get(note.id);
                if (
                  !existing ||
                  ACCESS_PRIORITY[note.accessLevel] > ACCESS_PRIORITY[existing.accessLevel]
                ) {
                  noteMap.set(note.id, note);
                }
              }

              return {
                notebooks: Array.from(notebookMap.values()),
                notes: Array.from(noteMap.values()),
              } as SyncResponse;
            })
          );
        })
      );
    }),
    map((result) => ({ status: 200, body: result }) as HttpResponse<SyncResponse>),
    catchError((e) => of(errToResponse(e)))
  );
};
