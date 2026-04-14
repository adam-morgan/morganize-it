import { Knex } from "knex";

export const up = async (knex: Knex) => {
  await knex.schema.alterTable("notes", (table) => {
    table.text("attachments").notNullable().defaultTo("[]");
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.alterTable("notes", (table) => {
    table.dropColumn("attachments");
  });
};
