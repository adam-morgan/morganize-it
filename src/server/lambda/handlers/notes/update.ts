import { NoteRoutes } from "@/server/http/routes/note";
import { createUpdateHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createUpdateHandler(new NoteRoutes()));
