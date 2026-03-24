import { NoteRoutes } from "@/server/http/routes/note";
import { createFindByIdHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createFindByIdHandler(new NoteRoutes()));
