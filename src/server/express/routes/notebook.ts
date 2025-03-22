import { Router } from "express";
import { createReactiveServiceRoutes } from "../reactive-service-routes";
import { NotebookRoutes } from "@/server/http/routes/notebook";

export const notebookRoutes = (router: Router) =>
  createReactiveServiceRoutes(router, "/notebooks", new NotebookRoutes());
