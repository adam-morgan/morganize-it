import { NoteRoutes } from "@/server/http/routes/note";
import { createFindHandler } from "../../reactive-service-handlers";
import { withAuth } from "../../middleware";

export const handler = withAuth(createFindHandler(new NoteRoutes()));
