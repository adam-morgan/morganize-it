import { NoteRoutes } from "@/server/http/routes/note";
import { createDeleteHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createDeleteHandler(new NoteRoutes()));
