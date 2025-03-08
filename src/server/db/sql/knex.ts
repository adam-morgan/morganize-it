import path from "path";
import knex from "knex";

let knexInstance: knex.Knex;

export const getKnex = () => {
  if (!knexInstance) {
    knexInstance = knex({
      client: "pg",
      connection: {
        user: process.env.DB_USER ?? "postgres",
        host: process.env.DB_HOST ?? "localhost",
        database: process.env.DB_NAME ?? "postgres",
        password: process.env.DB_PASS ?? "postgres",
        port: parseInt(process.env.DB_PORT ?? "5432"),
      },
      migrations: {
        directory: path.join(__dirname, "migrations"),
        extension: "ts",
      },
    });
  }

  return knexInstance;
};
