import { Knex } from "knex";
import { hashPassword } from "../../../server/features/auth/password";

export const seed = async (knex: Knex): Promise<void> => {
  await _truncate(knex);
  await _seedUsers(knex);
};

const _truncate = async (knex: Knex): Promise<void> => {
  await knex("users").truncate();
};

const _seedUsers = async (knex: Knex): Promise<void> => {
  const users: User[] = [];

  for (let i = 1; i <= 10; i++) {
    users.push({
      id: `user${i}`,
      name: `User ${i}`,
      email: `user${i}@gmail.com`,
      password: await hashPassword(`password${i}`),
    });
  }

  await knex("users").insert(users);
};
