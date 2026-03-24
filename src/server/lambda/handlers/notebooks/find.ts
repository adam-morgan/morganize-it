import { NotebookRoutes } from "@/server/http/routes/notebook";
import { createFindHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createFindHandler(new NotebookRoutes()));
