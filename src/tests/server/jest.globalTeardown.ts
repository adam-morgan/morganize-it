import { destroyKnex } from "../../server/db/sql/knex";

const globalTeardown = async (): Promise<void> => {
  await destroyKnex();
};

export default globalTeardown;
