import { NotebookRoutes } from "@/server/http/routes/notebook";
import { createPatchHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createPatchHandler(new NotebookRoutes()));
