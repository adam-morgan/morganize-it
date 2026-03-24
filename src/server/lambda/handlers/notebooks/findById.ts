import { NotebookRoutes } from "@/server/http/routes/notebook";
import { createFindByIdHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createFindByIdHandler(new NotebookRoutes()));
