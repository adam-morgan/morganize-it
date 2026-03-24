import path from "path";
import knex from "knex";

let knexInstance: knex.Knex | undefined;

const migrationsConfig = {
  directory: path.join(__dirname, "migrations"),
  extension: "ts",
};

const seedsConfig = {
  directory: process.env.DB_SEEDS_DIR,
  extension: "ts",
};

export const getKnex = () => {
  if (!knexInstance) {
    const client = process.env.DB_CLIENT ?? "pg";

    if (client === "better-sqlite3") {
      knexInstance = knex({
        client: "better-sqlite3",
        connection: { filename: ":memory:" },
        useNullAsDefault: true,
        migrations: migrationsConfig,
        seeds: seedsConfig,
      });
    } else {
      knexInstance = knex({
        client,
        connection: {
          user: process.env.DB_USER ?? "postgres",
          host: process.env.DB_HOST ?? "localhost",
          database: process.env.DB_NAME ?? "postgres",
          password: process.env.DB_PASS ?? "postgres",
          port: parseInt(process.env.DB_PORT ?? "5432"),
        },
        migrations: migrationsConfig,
        seeds: seedsConfig,
      });
    }
  }

  return knexInstance;
};

export const destroyKnex = async () => {
  if (knexInstance != null) {
    const ret = knexInstance.destroy();
    knexInstance = undefined;

    return ret;
  }
};
