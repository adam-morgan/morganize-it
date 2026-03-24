import { NoteRoutes } from "@/server/http/routes/note";
import { createCreateHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createCreateHandler(new NoteRoutes()));
