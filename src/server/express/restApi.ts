import cors from "cors";
import express, { Application, Request, Response } from "express";
import { authRoutes } from "./routes/auth";
import { notebookRoutes } from "./routes/notebook";
import { noteRoutes } from "./routes/note";
import packageJSON from "../../../package.json";
import { jwtMiddleware } from "./middleware/jwt";
import { handleErrors } from "./errorHandling";

const app: Application = express();
const apiRouter = express.Router();

app.use(express.json({ limit: "20mb" }));
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use(jwtMiddleware);

app.use("/api", apiRouter);

authRoutes(apiRouter);
notebookRoutes(apiRouter);
noteRoutes(apiRouter);

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
