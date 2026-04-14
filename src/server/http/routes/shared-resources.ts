import { catchError, map, Observable, of, switchMap, throwError } from "rxjs";
import { HttpRequest } from "../request";
import { HttpResponse } from "../response";
import { getNotebookService, getNoteService } from "@/server/features/notes/services";
import { getShareAccessService, getShareService } from "@/server/features/shares";
import { ForbiddenError, NotFoundError } from "@/server/errors";

const errToResponse = (e: { code?: number; message: string }): HttpResponse<ApiError> => ({
  status: e.code && typeof e.code === "number" && e.code <= 511 ? e.code : 500,
  body: { message: e.message },
});

const requireAuth = <T>(req: HttpRequest<T>) => {
  if (!req.userId) {
    return of({ status: 401, body: { message: "Unauthorized" } } as HttpResponse<ApiError>);
  }
  return null;
};

/** GET /shared/notebooks/:id — fetch a notebook the user has access to (own or shared). */
export const getSharedNotebook = (
  req: HttpRequest<void>
): Observable<HttpResponse<Notebook | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const id = req.params.id;

  return getShareAccessService()
    .getNotebookAccess(me, id)
    .pipe(
      switchMap((level) => {
        if (level === "none") {
          // Could be that they only have note-level shares. Allow read so the
          // sidebar can render the parent notebook as a synthetic container.
          return getShareService()
            .findSharedWith(me, "note")
            .pipe(
              switchMap((noteShares) => {
                const hasNoteShareInNotebook = noteShares.some((s) => s.notebookId === id);
                if (!hasNoteShareInNotebook) {
                  return throwError(() => new ForbiddenError("Forbidden"));
                }
                return getNotebookService().findById(id);
              })
            );
        }
        return getNotebookService().findById(id);
      }),
      map((notebook) => ({ status: 200, body: notebook }) as HttpResponse<Notebook>),
      catchError((e) =>
        of(
          e instanceof NotFoundError
            ? ({ status: 404, body: { message: e.message } } as HttpResponse<ApiError>)
            : errToResponse(e)
        )
      )
    );
};

/** GET /shared/notebooks/:id/notes — list notes the user can see in a notebook. */
export const listSharedNotebookNotes = (
  req: HttpRequest<void>
): Observable<HttpResponse<Note[] | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const id = req.params.id;

  return getShareAccessService()
    .getNotebookAccess(me, id)
    .pipe(
      switchMap((level) => {
        if (level === "owner" || level === "readwrite" || level === "read") {
          // Can see all non-deleted notes in this notebook regardless of note ownership.
          return getNoteService()
            .find({ criteria: { notebookId: id } })
            .pipe(map((r) => r.items));
        }

        // No notebook-level access. Return only individually-shared notes whose
        // parent notebook is this notebook id.
        return getShareService()
          .findSharedWith(me, "note")
          .pipe(
            switchMap((shares) => {
              const ids = shares.filter((s) => s.notebookId === id).map((s) => s.resourceId);
              if (ids.length === 0) return of([] as Note[]);
              return getNoteService()
                .find({ criteria: { id: { $in: ids } } })
                .pipe(map((r) => r.items));
            })
          );
      }),
      map((notes) => ({ status: 200, body: notes }) as HttpResponse<Note[]>),
      catchError((e) => of(errToResponse(e)))
    );
};

/** GET /shared/notes/:id — fetch a single note if the user has any access. */
export const getSharedNote = (
  req: HttpRequest<void>
): Observable<HttpResponse<Note | ApiError>> => {
  const unauth = requireAuth(req);
  if (unauth) return unauth;
  const me = req.userId!;
  const id = req.params.id;

  return getNoteService()
    .findById(id)
    .pipe(
      switchMap((note) =>
        getShareAccessService()
          .getNoteAccess(me, id, note.notebookId)
          .pipe(
            switchMap((level) =>
              level === "none"
                ? throwError(() => new ForbiddenError("Forbidden"))
                : of(note)
            )
          )
      ),
      map((note) => ({ status: 200, body: note }) as HttpResponse<Note>),
      catchError((e) => of(errToResponse(e)))
    );
};
