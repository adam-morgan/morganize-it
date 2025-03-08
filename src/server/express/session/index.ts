import { Application } from "express";
import session from "express-session";
import { getDbInstanceType } from "@/server/db/type";
import { createKnexSessionStore } from "./knex";

declare module "express-session" {
  interface SessionData {
    userId: number;
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
  if (getDbInstanceType() === "POSTGRESQL") {
    return createKnexSessionStore();
  }

  throw new Error("Unsupported database type for session store");
};
