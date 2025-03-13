import { Knex } from "knex";

export const up = async (knex: Knex) => {
  await knex.schema.createTable("users", (table) => {
    table.string("id").primary();
    table.string("email").unique().notNullable();
    table.string("name").notNullable();
    table.string("password");

    table.index("email");
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.dropTable("users");
};
