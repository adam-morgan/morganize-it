import { Knex } from "knex";

export const up = async (knex: Knex) => {
  await knex.schema.alterTable("notes", (table) => {
    table.string("deletedAt").nullable();
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.alterTable("notes", (table) => {
    table.dropColumn("deletedAt");
  });
};
