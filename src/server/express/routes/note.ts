import { Router } from "express";
import { createReactiveServiceRoutes } from "../reactive-service-routes";
import { NoteRoutes } from "@/server/http/routes/note";

export const noteRoutes = (router: Router) =>
  createReactiveServiceRoutes(router, "/notes", new NoteRoutes());
