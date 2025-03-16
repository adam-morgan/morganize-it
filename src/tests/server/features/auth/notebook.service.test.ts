import { getNotebookService } from "@/server/features/notes";
import { runGenericReactiveServiceTests } from "../../util/reactive-service-tests";

describe("NotebookService", () => {
  const svc = getNotebookService();
  runGenericReactiveServiceTests<Notebook>({
    svc,
    create: { name: "Test Notebook", userId: "user1" },
    update: { name: "Test Notebook Updated", userId: "user1" },
    patch: { name: "Test Notebook Patched " },
  });
});
