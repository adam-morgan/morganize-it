import { Knex } from "knex";

export const up = async (knex: Knex) => {
  await knex.schema.createTable("friendships", (table) => {
    table.string("id").primary();
    table.string("requesterId").notNullable();
    table.string("recipientId").notNullable();
    table.string("status").notNullable().defaultTo("pending");
    table.string("createdAt").notNullable();
    table.string("updatedAt").notNullable();

    table.foreign("requesterId").references("users.id").onDelete("CASCADE");
    table.foreign("recipientId").references("users.id").onDelete("CASCADE");
    table.unique(["requesterId", "recipientId"]);
    table.index("requesterId");
    table.index("recipientId");
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.dropTable("friendships");
};
