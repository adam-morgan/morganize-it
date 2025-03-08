import cors from "cors";
import express, { Application, Request, Response } from "express";
import { authRoutes } from "./routes/auth";
import packageJSON from "../../../package.json";
import { configureSession } from "./session";
import { handleErrors } from "./errorHandling";

const app: Application = express();
const apiRouter = express.Router();

app.use(express.json({ limit: "20mb" }));
app.use(cors());
app.use(express.urlencoded({ extended: true }));

configureSession(app);

app.use("/api", apiRouter);

authRoutes(apiRouter);

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

export default app;
