import { getNoteService, getNotebookService } from "@/server/features/notes";
import { ReactiveTestDef } from "../../util/reactive-service-tests";
import { runGenericTests } from "../../util/reactive-tests";
import { firstValueFrom } from "rxjs";
import { v4 as uuid } from "uuid";

describe("NoteService", () => {
  const svc = getNoteService();
  const notebookSvc = getNotebookService();

  const now = new Date().toISOString();

  // Uses seeded notebooks (notebook1 → user6, notebook2 → user6, notebook3 → user7)
  const testDef: ReactiveTestDef<Note> = {
    svc,
    create: {
      title: "Test Note",
      content: "Test content",
      textContent: "Test content",
      notebookId: "notebook1",
      userId: "user5",
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    },
    update: {
      title: "Test Note Updated",
      content: "Updated content",
      textContent: "Updated content",
      notebookId: "notebook1",
      userId: "user5",
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    },
    patch: { title: "Test Note Patched" },
    writeRouteUser: { id: "user5", email: "user5@gmail.com", password: "password5" },
    readRouteUser: { id: "user6", email: "user6@gmail.com", password: "password6" },
    find: {
      records: [
        { id: "1", title: "Note A", content: "Content A", textContent: "Content A", notebookId: "notebook1", userId: "user6", createdAt: now, updatedAt: now, lastOpenedAt: now },
        { id: "2", title: "Note B", content: "Content B", textContent: "Content B", notebookId: "notebook2", userId: "user6", createdAt: now, updatedAt: now, lastOpenedAt: now },
        { id: "3", title: "Note C", content: "Content C", textContent: "Content C", notebookId: "notebook3", userId: "user7", createdAt: now, updatedAt: now, lastOpenedAt: now },
      ],
      queries: [
        {
          options: { criteria: { userId: "user6" } },
          recordIds: ["1", "2"],
        },
        {
          options: {
            criteria: { userId: "user6" },
            sort: [{ property: "title", direction: "asc" }],
            limit: 1,
          },
          recordIds: ["1"],
        },
      ],
      svcQueries: [
        {
          options: { criteria: { userId: "user7" } },
          recordIds: ["3"],
        },
      ],
      routeQueries: [
        {
          options: {},
          recordIds: ["1", "2"],
        },
        {
          options: { criteria: { userId: "user7" } },
          recordIds: [],
        },
      ],
    },
  };

  runGenericTests("/api/notes", testDef);

  describe("Cascade delete", () => {
    it("should delete notes when notebook is deleted", async () => {
      const notebook = await firstValueFrom(
        notebookSvc.create({ id: uuid(), name: "Cascade Test NB", userId: "user3" } as Notebook)
      );

      await firstValueFrom(
        svc.create({
          id: uuid(),
          title: "Cascade Note 1",
          content: "",
          textContent: "",
          notebookId: notebook.id,
          userId: "user3",
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
        } as Note)
      );
      await firstValueFrom(
        svc.create({
          id: uuid(),
          title: "Cascade Note 2",
          content: "",
          textContent: "",
          notebookId: notebook.id,
          userId: "user3",
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
        } as Note)
      );

      const notesBefore = await firstValueFrom(
        svc.find({ criteria: { notebookId: notebook.id } })
      );
      expect(notesBefore.items.length).toBe(2);

      await firstValueFrom(notebookSvc.delete(notebook.id));

      const notesAfter = await firstValueFrom(
        svc.find({ criteria: { notebookId: notebook.id } })
      );
      expect(notesAfter.items.length).toBe(0);
    });
  });
});
