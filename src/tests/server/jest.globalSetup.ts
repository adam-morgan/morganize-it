import dotenv from "dotenv";
import { getKnex } from "../../server/db/sql/knex";

dotenv.config({ path: ".env.test" });

const globalSetup = async (): Promise<void> => {
  const knexInstance = getKnex();
  await knexInstance.migrate.latest();
  await knexInstance.seed.run();
};

export default globalSetup;
