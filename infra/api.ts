import path from "path";
import { usersTable, notebooksTable } from "./storage";

export const jwtSecret = new sst.Secret("JwtSecret");
export const googleClientId = new sst.Secret("GoogleClientId");

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
    allowOrigins: ["*"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  },
  domain:
    $app.stage === "prod"
      ? {
          dns: false,
          name: "api.notes.adammorgan.ca",
          cert: "REPLACE_WITH_ACM_CERT_ARN_CA_CENTRAL_1",
        }
      : undefined,
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
  link: [usersTable, jwtSecret],
  environment: defaultEnv,
  nodejs,
});

api.route("POST /auth/google", {
  handler: `${handlerBase}/auth/google-login.handler`,
  link: [usersTable, jwtSecret, googleClientId],
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
