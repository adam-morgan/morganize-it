import path from "path";
import { usersTable, notebooksTable, notesTable } from "./storage";

export const jwtSecret = new sst.Secret("JwtSecret");
export const googleClientId = new sst.Secret("GoogleClientId");
export const allowedEmails = new sst.Secret("AllowedEmails");

const handlerBase = "src/server/lambda/handlers";

// Configure esbuild to resolve @/ path alias used throughout the codebase
// Mark knex dialect drivers as external — knex tries to require all of them at bundle time
const nodejs = {
  esbuild: {
    alias: {
      "@": path.resolve("src"),
    },
    external: [
      "mysql",
      "mysql2",
      "oracledb",
      "pg-query-stream",
      "tedious",
      "better-sqlite3",
      "sqlite3",
    ],
  },
};

export const api = new sst.aws.ApiGatewayV2("MorganizeItApi", {
  cors: {
    allowOrigins:
      $app.stage === "prod" ? ["https://notes.adammorgan.ca"] : ["http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  },
  domain:
    $app.stage === "prod"
      ? {
          dns: false,
          name: "api.notes.adammorgan.ca",
          cert: "arn:aws:acm:ca-central-1:499854674714:certificate/7c21edc8-636c-455c-aa9c-28506ae2c45e",
        }
      : undefined,
  transform: {
    stage: {
      defaultRouteSettings: {
        throttlingBurstLimit: 50,
        throttlingRateLimit: 25,
      },
    },
  },
});

const defaultEnv = {
  DB_TYPE: "DYNAMODB",
};

// Auth routes
api.route("POST /auth/login", {
  handler: `${handlerBase}/auth/login.handler`,
  link: [usersTable, jwtSecret],
  environment: defaultEnv,
  nodejs,
});

api.route("POST /auth/create-account", {
  handler: `${handlerBase}/auth/create-account.handler`,
  link: [usersTable, jwtSecret, allowedEmails],
  environment: defaultEnv,
  nodejs,
});

api.route("POST /auth/google", {
  handler: `${handlerBase}/auth/google-login.handler`,
  link: [usersTable, jwtSecret, googleClientId, allowedEmails],
  environment: defaultEnv,
  nodejs,
});

api.route("POST /auth/refresh", {
  handler: `${handlerBase}/auth/refresh.handler`,
  link: [usersTable, jwtSecret],
  environment: defaultEnv,
  nodejs,
});

api.route("POST /auth/logout", {
  handler: `${handlerBase}/auth/logout.handler`,
  link: [usersTable, jwtSecret],
  environment: defaultEnv,
  nodejs,
});

api.route("GET /auth/whoami", {
  handler: `${handlerBase}/auth/whoami.handler`,
  link: [usersTable, jwtSecret],
  environment: defaultEnv,
  nodejs,
});

// Notebook routes
const notebookLinks = [notebooksTable, jwtSecret];

api.route("GET /notebooks", {
  handler: `${handlerBase}/notebooks/find.handler`,
  link: notebookLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("POST /notebooks/find", {
  handler: `${handlerBase}/notebooks/find.handler`,
  link: notebookLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("GET /notebooks/{id}", {
  handler: `${handlerBase}/notebooks/findById.handler`,
  link: notebookLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("POST /notebooks", {
  handler: `${handlerBase}/notebooks/create.handler`,
  link: notebookLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("PUT /notebooks/{id}", {
  handler: `${handlerBase}/notebooks/update.handler`,
  link: notebookLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("PATCH /notebooks/{id}", {
  handler: `${handlerBase}/notebooks/patch.handler`,
  link: notebookLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("DELETE /notebooks/{id}", {
  handler: `${handlerBase}/notebooks/delete.handler`,
  link: notebookLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("DELETE /notebooks/{id}/permanent", {
  handler: `${handlerBase}/notebooks/permanent-delete.handler`,
  link: [...notebookLinks, notesTable],
  environment: defaultEnv,
  nodejs,
});

// Note routes
const noteLinks = [notesTable, jwtSecret];

api.route("GET /notes", {
  handler: `${handlerBase}/notes/find.handler`,
  link: noteLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("POST /notes/find", {
  handler: `${handlerBase}/notes/find.handler`,
  link: noteLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("GET /notes/{id}", {
  handler: `${handlerBase}/notes/findById.handler`,
  link: noteLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("POST /notes", {
  handler: `${handlerBase}/notes/create.handler`,
  link: noteLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("PUT /notes/{id}", {
  handler: `${handlerBase}/notes/update.handler`,
  link: noteLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("PATCH /notes/{id}", {
  handler: `${handlerBase}/notes/patch.handler`,
  link: noteLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("DELETE /notes/{id}", {
  handler: `${handlerBase}/notes/delete.handler`,
  link: noteLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("DELETE /notes/{id}/permanent", {
  handler: `${handlerBase}/notes/permanent-delete.handler`,
  link: noteLinks,
  environment: defaultEnv,
  nodejs,
});
