import { getNotebookService } from "@/server/features/notes";
import { ReactiveTestDef } from "../../util/reactive-service-tests";
import { runGenericTests } from "../../util/reactive-tests";

describe("NotebookService", () => {
  const svc = getNotebookService();

  const now = new Date().toISOString();

  const testDef: ReactiveTestDef<Notebook> = {
    svc,
    create: { name: "Test Notebook", userId: "user5", updatedAt: expect.any(String) } as any,
    update: { name: "Test Notebook Updated", userId: "user5", updatedAt: expect.any(String) } as any,
    patch: { name: "Test Notebook Patched " },
    writeRouteUser: { id: "user5", email: "user5@gmail.com", password: "password5" },
    readRouteUser: { id: "user1", email: "user1@gmail.com", password: "password1" },
    find: {
      records: [
        { id: "1", name: "Test Notebook 1", userId: "user1", updatedAt: now },
        { id: "2", name: "Test Notebook 2", userId: "user1", updatedAt: now },
        { id: "3", name: "Test Notebook 3", userId: "user2", updatedAt: now },
      ],
      queries: [
        {
          options: { criteria: { userId: "user1" } },
          recordIds: ["1", "2"],
        },
        {
          options: {
            criteria: { userId: "user1" },
            sort: [{ property: "name", direction: "asc" }],
            limit: 1,
          },
          recordIds: ["1"],
        },
        {
          name: "Sort desc with limit",
          options: {
            criteria: { userId: "user1" },
            sort: [{ property: "name", direction: "desc" }],
            limit: 1,
          },
          recordIds: ["2"],
        },
        {
          options: { criteria: { name: { $like: "%book 1" } } },
          recordIds: ["1"],
        },
      ],
      svcQueries: [
        {
          options: { criteria: { userId: "user2" } },
          recordIds: ["3"],
        },
      ],
      routeQueries: [
        {
          options: {},
          recordIds: ["1", "2"],
        },
        {
          options: { criteria: { userId: "user2" } },
          recordIds: [],
        },
      ],
    },
  };

  runGenericTests("/api/notebooks", testDef);
});
