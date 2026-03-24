import { NoteRoutes } from "@/server/http/routes/note";
import { createPatchHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createPatchHandler(new NoteRoutes()));
