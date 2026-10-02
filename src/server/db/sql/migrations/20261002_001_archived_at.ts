import { Knex } from "knex";

export const up = async (knex: Knex) => {
  await knex.schema.alterTable("notebooks", (table) => {
    table.string("archivedAt").nullable();
  });

  await knex.schema.alterTable("notes", (table) => {
    table.string("archivedAt").nullable();
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.alterTable("notebooks", (table) => {
    table.dropColumn("archivedAt");
  });

  await knex.schema.alterTable("notes", (table) => {
    table.dropColumn("archivedAt");
  });
};
