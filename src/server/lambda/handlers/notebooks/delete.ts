import { NotebookRoutes } from "@/server/http/routes/notebook";
import { createDeleteHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createDeleteHandler(new NotebookRoutes()));
