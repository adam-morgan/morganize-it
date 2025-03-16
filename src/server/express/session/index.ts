import { Application } from "express";
import session, { MemoryStore } from "express-session";
import { getDbInstanceType } from "@/server/db/type";
import { createKnexSessionStore } from "./knex";

let sessionStore: session.Store | undefined;

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export const configureSession = (app: Application) => {
  app.use(
    session({
      store: _getSessionStore(),
      secret: process.env.SESSION_SECRET ?? "IkrI5^JXZ$6Yh4C@Kf7pR3!lM9tQ8wVz",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      },
    })
  );
};

const _getSessionStore = (): session.Store => {
  if (sessionStore == null) {
    if (process.env.NODE_ENV === "test") {
      sessionStore = new MemoryStore();
    } else if (getDbInstanceType() === "POSTGRESQL") {
      sessionStore = createKnexSessionStore();
    } else {
      throw new Error("Unsupported database type for session store");
    }
  }

  return sessionStore;
};

export const clearAllSessions = async () => {
  if (sessionStore != null) {
    await sessionStore.clear?.();
  }
};
