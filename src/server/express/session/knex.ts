import session from "express-session";
import { ConnectSessionKnexStore } from "connect-session-knex";
import { getKnex } from "@/server/db/sql";

export const createKnexSessionStore = (): session.Store => {
  return new ConnectSessionKnexStore({
    knex: getKnex(),
    tableName: "sessions",
    createTable: true,
  });
};
