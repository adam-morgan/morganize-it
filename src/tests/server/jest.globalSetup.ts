import dotenv from "dotenv";
import { getKnex } from "../../server/db/sql/knex";

dotenv.config({ path: ".env.test" });

const globalSetup = async (): Promise<void> => {
  const knexInstance = getKnex();
  await knexInstance.migrate.latest();
  await truncateAllTables();
};

const truncateAllTables = async () => {
  const knexInstance = getKnex();
  const tables = await knexInstance("pg_tables").select("tablename").where("schemaname", "public");

  await Promise.all(
    tables
      .filter((table) => !table.tablename.startsWith("knex"))
      .map((table) => knexInstance.raw(`TRUNCATE TABLE ${table.tablename} CASCADE`))
  );
};

export default globalSetup;
