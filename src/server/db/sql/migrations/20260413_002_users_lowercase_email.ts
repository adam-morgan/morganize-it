import { Knex } from "knex";

export const up = async (knex: Knex) => {
  // Normalize all existing emails to lowercase so future case-insensitive lookups
  // line up with what's stored.
  await knex.raw('UPDATE users SET email = LOWER(email)');
};

export const down = async () => {
  // Cannot restore original casing — no-op.
};
