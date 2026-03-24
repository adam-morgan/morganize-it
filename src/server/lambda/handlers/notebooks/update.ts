import { NotebookRoutes } from "@/server/http/routes/notebook";
import { createUpdateHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createUpdateHandler(new NotebookRoutes()));
