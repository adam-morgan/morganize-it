import dotenv from "dotenv";
import { getKnex, destroyKnex } from "../../server/db/sql/knex";

dotenv.config({ path: ".env.test" });

beforeAll(async () => {
  const knex = getKnex();
  await knex.migrate.latest();
  await knex.seed.run();
});

afterAll(async () => {
  await destroyKnex();
});
