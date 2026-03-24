import { NotebookRoutes } from "@/server/http/routes/notebook";
import { createCreateHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createCreateHandler(new NotebookRoutes()));
