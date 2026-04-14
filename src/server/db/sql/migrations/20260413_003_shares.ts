import { Knex } from "knex";

export const up = async (knex: Knex) => {
  await knex.schema.createTable("shares", (table) => {
    table.string("id").primary();
    table.string("resourceType").notNullable(); // 'notebook' | 'note'
    table.string("resourceId").notNullable();
    table.string("ownerId").notNullable();
    table.string("sharedWithUserId").notNullable();
    table.string("permission").notNullable().defaultTo("read"); // 'read' | 'readwrite'
    table.string("notebookId").notNullable();
    table.string("createdAt").notNullable();
    table.string("updatedAt").notNullable();

    table.foreign("ownerId").references("users.id").onDelete("CASCADE");
    table.foreign("sharedWithUserId").references("users.id").onDelete("CASCADE");
    table.unique(["resourceType", "resourceId", "sharedWithUserId"]);
    table.index(["sharedWithUserId", "resourceType"]);
    table.index(["resourceType", "resourceId"]);
    table.index("ownerId");
    table.index("notebookId");
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.dropTable("shares");
};
