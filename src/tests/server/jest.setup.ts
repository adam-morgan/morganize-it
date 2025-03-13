import dotenv from "dotenv";
import { destroyKnex } from "../../server/db/sql/knex";

dotenv.config({ path: ".env.test" });

afterAll(async () => {
  await destroyKnex();
});
