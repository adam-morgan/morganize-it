import { forkJoin, map, Observable } from "rxjs";
import { apiPost, apiPut } from "@/utils/fetch";

type ExportData = {
  exportedAt: string;
  notebooks: Notebook[];
  notes: Note[];
};

export const exportData = (): Observable<void> => {
  return forkJoin({
    notebooks: apiPost<FindOptions, PageResult<Notebook>>("/notebooks/find", {}).pipe(
      map((r) => r.items)
    ),
    notes: apiPost<FindOptions, PageResult<Note>>("/notes/find", {}).pipe(
      map((r) => r.items)
    ),
  }).pipe(
    map(({ notebooks, notes }) => {
      const data: ExportData = {
        exportedAt: new Date().toISOString(),
        notebooks,
        notes,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `morganize-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    })
  );
};

export const importData = (file: File): Observable<{ notebooks: number; notes: number }> => {
  return new Observable((subscriber) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportData;

        if (!Array.isArray(data.notebooks) || !Array.isArray(data.notes)) {
          throw new Error("Invalid export file: missing notebooks or notes arrays");
        }

        const notebookOps = data.notebooks.map((nb) =>
          apiPut<Notebook, Notebook>(`/notebooks/${nb.id}`, nb)
        );
        const noteOps = data.notes.map((note) =>
          apiPut<Note, Note>(`/notes/${note.id}`, note)
        );

        // Import notebooks first, then notes (notes reference notebooks)
        const doImport = notebookOps.length > 0
          ? forkJoin(notebookOps).pipe(
              map(() => undefined),
            )
          : new Observable<void>((s) => { s.next(); s.complete(); });

        doImport.subscribe({
          next: () => {
            if (noteOps.length === 0) {
              subscriber.next({ notebooks: data.notebooks.length, notes: data.notes.length });
              subscriber.complete();
              return;
            }

            forkJoin(noteOps).subscribe({
              next: () => {
                subscriber.next({ notebooks: data.notebooks.length, notes: data.notes.length });
                subscriber.complete();
              },
              error: (err) => subscriber.error(err),
            });
          },
          error: (err) => subscriber.error(err),
        });
      } catch (err) {
        subscriber.error(err);
      }
    };
    reader.onerror = () => subscriber.error(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};
