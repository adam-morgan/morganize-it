import { getNotebookService } from "@/server/features/notes";
import { ReactiveTestDef, runGenericReactiveServiceTests } from "../../util/reactive-service-tests";
import { runGenericReactiveRouteTests } from "../../util/reactive-route-tests";

describe("NotebookService", () => {
  const svc = getNotebookService();

  const testDef: ReactiveTestDef<Notebook> = {
    svc,
    create: { name: "Test Notebook", userId: "user1" },
    update: { name: "Test Notebook Updated", userId: "user1" },
    patch: { name: "Test Notebook Patched " },
    find: {
      records: [
        { id: "1", name: "Test Notebook 1", userId: "user1" },
        { id: "2", name: "Test Notebook 2", userId: "user1" },
        { id: "3", name: "Test Notebook 3", userId: "user2" },
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
          options: {
            criteria: { userId: "user1" },
            sort: [{ property: "name", direction: "desc" }],
            limit: 1,
            offset: 1,
          },
          recordIds: ["1"],
        },
        {
          options: { criteria: { userId: "user2" } },
          recordIds: ["3"],
        },
        {
          options: { criteria: { name: { $like: "%book 1" } } },
          recordIds: ["1"],
        },
      ],
    },
  };

  runGenericReactiveServiceTests(testDef);
  runGenericReactiveRouteTests("/api/notebooks", testDef);
});
