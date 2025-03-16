import { Knex } from "knex";

export const up = async (knex: Knex) => {
  await knex.schema.createTable("notebooks", (table) => {
    table.string("id").primary();
    table.string("name").notNullable();
    table.string("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("CASCADE");
    table.index("userId");
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.dropTable("notebooks");
};
