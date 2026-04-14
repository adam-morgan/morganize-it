import cors from "cors";
import express, { Application, Request, Response } from "express";
import { authRoutes } from "./routes/auth";
import { notebookRoutes } from "./routes/notebook";
import { noteRoutes } from "./routes/note";
import { friendsRoutes } from "./routes/friends";
import { usersRoutes } from "./routes/users";
import { sharesRoutes } from "./routes/shares";
import { sharedResourceRoutes } from "./routes/shared-resources";
import { syncRoutes } from "./routes/sync";
import { attachmentRoutes } from "./routes/attachment";
import packageJSON from "../../../package.json";
import { jwtMiddleware } from "./middleware/jwt";
import { handleErrors } from "./errorHandling";

const app: Application = express();
const apiRouter = express.Router();

app.use((req, res, next) => {
  // Skip JSON parsing for direct attachment upload endpoint — raw binary body
  if (req.method === "PUT" && req.url.startsWith("/api/attachments/upload/")) {
    next();
    return;
  }
  express.json({ limit: "20mb" })(req, res, next);
});
app.use(cors({ origin: ["http://localhost:5173"] }));
app.use(express.urlencoded({ extended: true }));

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  next();
});

app.use(jwtMiddleware);

app.use("/api", apiRouter);

authRoutes(apiRouter);
usersRoutes(apiRouter);
sharesRoutes(apiRouter);
sharedResourceRoutes(apiRouter);
friendsRoutes(apiRouter);
notebookRoutes(apiRouter);
noteRoutes(apiRouter);
attachmentRoutes(apiRouter);
syncRoutes(apiRouter);

// Serve a successful response. For use with wait-on
apiRouter.get("/health", (req, res) => {
  res.send({ status: "ok" });
});

apiRouter.get(`/version`, (req: Request, res: Response) => {
  const versionResp: VersionResponse = {
    version: packageJSON.version,
  };

  res.send(versionResp);
});

handleErrors(app, apiRouter);

app.use(express.static("./.local/vite/dist"));

// SPA fallback: serve index.html for all non-API routes
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile("index.html", { root: "./.local/vite/dist" });
});

export default app;
