import { Knex } from "knex";

export const up = async (knex: Knex) => {
  await knex.schema.createTable("notes", (table) => {
    table.string("id").primary();
    table.string("title").notNullable();
    table.text("content").notNullable().defaultTo("");
    table.string("notebookId").notNullable();
    table.string("userId").notNullable();
    table.string("createdAt").notNullable();
    table.string("updatedAt").notNullable();
    table.string("lastOpenedAt").notNullable();
    table.foreign("notebookId").references("notebooks.id").onDelete("CASCADE");
    table.foreign("userId").references("users.id").onDelete("CASCADE");
    table.index("notebookId");
    table.index("userId");
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.dropTable("notes");
};
