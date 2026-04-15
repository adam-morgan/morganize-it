import path from "path";
import {
  usersTable,
  notebooksTable,
  notesTable,
  friendshipsTable,
  sharesTable,
  connectionsTable,
  attachmentsBucket,
} from "./storage";

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

// WebSocket API uses the default execute-api domain (wss://<id>.execute-api.<region>.amazonaws.com/$default).
// `wsApi.url` is plumbed through to the frontend as VITE_WS_URL by infra/web.ts.
export const wsApi = new sst.aws.ApiGatewayWebSocket("WsApi");

wsApi.route("$connect", {
  handler: "src/server/lambda/handlers/ws/connect.handler",
  link: [connectionsTable, jwtSecret],
  nodejs,
});

wsApi.route("$disconnect", {
  handler: "src/server/lambda/handlers/ws/disconnect.handler",
  link: [connectionsTable],
  nodejs,
});

/**
 * Resources that mutation handlers need to fan out realtime notifications:
 * the connections lookup table plus the WebSocket API itself (which exposes
 * `Resource.WsApi.managementEndpoint` to ApiGatewayPublisher).
 */
const realtimeLinks = [connectionsTable, wsApi];

export const api = new sst.aws.ApiGatewayV2("MorganizeItApi", {
  cors: {
    allowOrigins: $app.stage === "prod" ? ["https://notes.adammorgan.ca"] : ["*"],
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

// Notebook routes — permission checks consult the shares table.
const notebookLinks = [notebooksTable, sharesTable, jwtSecret, ...realtimeLinks];

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
  link: [...notebookLinks, notesTable, attachmentsBucket],
  environment: defaultEnv,
  nodejs,
});

// Note routes — permission checks look up the parent notebook and consult shares.
const noteLinks = [notesTable, notebooksTable, sharesTable, jwtSecret, ...realtimeLinks];

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
  link: [...noteLinks, attachmentsBucket],
  environment: defaultEnv,
  nodejs,
});

// Attachment routes
const attachmentLinks = [...noteLinks, attachmentsBucket];

api.route("POST /notes/{id}/attachments/upload-url", {
  handler: `${handlerBase}/notes/attachments/upload-url.handler`,
  link: attachmentLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("POST /notes/{id}/attachments/confirm", {
  handler: `${handlerBase}/notes/attachments/confirm.handler`,
  link: attachmentLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("GET /notes/{id}/attachments/{attachmentId}/download-url", {
  handler: `${handlerBase}/notes/attachments/download-url.handler`,
  link: attachmentLinks,
  environment: defaultEnv,
  nodejs,
});

api.route("DELETE /notes/{id}/attachments/{attachmentId}", {
  handler: `${handlerBase}/notes/attachments/delete.handler`,
  link: attachmentLinks,
  environment: defaultEnv,
  nodejs,
});

// Users (email lookup for adding friends)
api.route("GET /users/find", {
  handler: `${handlerBase}/users/find.handler`,
  link: [usersTable, jwtSecret],
  environment: defaultEnv,
  nodejs,
});

// Friends
const friendsLinks = [friendshipsTable, usersTable, jwtSecret, ...realtimeLinks];
const friendsRemoveLinks = [
  friendshipsTable,
  sharesTable,
  usersTable,
  jwtSecret,
  ...realtimeLinks,
];

api.route("GET /friends", {
  handler: `${handlerBase}/friends/list.handler`,
  link: friendsLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("GET /friends/requests/incoming", {
  handler: `${handlerBase}/friends/incoming.handler`,
  link: friendsLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("GET /friends/requests/outgoing", {
  handler: `${handlerBase}/friends/outgoing.handler`,
  link: friendsLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("POST /friends/request", {
  handler: `${handlerBase}/friends/request.handler`,
  link: friendsLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("POST /friends/{id}/accept", {
  handler: `${handlerBase}/friends/accept.handler`,
  link: friendsLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("POST /friends/{id}/deny", {
  handler: `${handlerBase}/friends/deny.handler`,
  link: friendsLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("DELETE /friends/{id}/cancel", {
  handler: `${handlerBase}/friends/cancel.handler`,
  link: friendsLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("DELETE /friends/{id}", {
  handler: `${handlerBase}/friends/remove.handler`,
  link: friendsRemoveLinks,
  environment: defaultEnv,
  nodejs,
});

// Shares
const sharesLinks = [
  sharesTable,
  friendshipsTable,
  usersTable,
  notebooksTable,
  notesTable,
  jwtSecret,
  ...realtimeLinks,
];

api.route("GET /shares/notebooks", {
  handler: `${handlerBase}/shares/list-notebooks.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("GET /shares/notes", {
  handler: `${handlerBase}/shares/list-notes.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("GET /shares/resource", {
  handler: `${handlerBase}/shares/list-resource.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("POST /shares", {
  handler: `${handlerBase}/shares/create.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("PATCH /shares/{id}", {
  handler: `${handlerBase}/shares/update.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("DELETE /shares/{id}", {
  handler: `${handlerBase}/shares/delete.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});

// Unified sync
api.route("POST /sync", {
  handler: `${handlerBase}/sync/sync.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});

// Shared resource reads
api.route("GET /shared/notebooks/{id}", {
  handler: `${handlerBase}/shared-resources/get-notebook.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("GET /shared/notebooks/{id}/notes", {
  handler: `${handlerBase}/shared-resources/list-notebook-notes.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});
api.route("GET /shared/notes/{id}", {
  handler: `${handlerBase}/shared-resources/get-note.handler`,
  link: sharesLinks,
  environment: defaultEnv,
  nodejs,
});
