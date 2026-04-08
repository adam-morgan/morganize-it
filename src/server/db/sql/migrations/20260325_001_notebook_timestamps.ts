import { Knex } from "knex";

export const up = async (knex: Knex) => {
  await knex.schema.alterTable("notebooks", (table) => {
    table.string("updatedAt").notNullable().defaultTo("");
    table.string("deletedAt").nullable();
  });

  await knex("notebooks")
    .whereNull("updatedAt")
    .orWhere("updatedAt", "")
    .update({ updatedAt: new Date().toISOString() });
};

export const down = async (knex: Knex) => {
  await knex.schema.alterTable("notebooks", (table) => {
    table.dropColumn("updatedAt");
    table.dropColumn("deletedAt");
  });
};
