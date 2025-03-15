import dotenv from "dotenv";
import { destroyKnex } from "../../server/db/sql/knex";
import { clearAllSessions } from "@/server/express/session";

dotenv.config({ path: ".env.test" });

afterAll(async () => {
  await clearAllSessions();
  await destroyKnex();
});
