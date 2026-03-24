import { Knex } from "knex";
import { hashPassword } from "../../../server/features/auth/password";

export const seed = async (knex: Knex): Promise<void> => {
  await _truncate(knex);
  await _seedUsers(knex);
  await _seedNotebooks(knex);
};

const _truncate = async (knex: Knex): Promise<void> => {
  await knex("notes").delete();
  await knex("notebooks").delete();
  await knex("users").delete();
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

const _seedNotebooks = async (knex: Knex): Promise<void> => {
  await knex("notebooks").insert([
    { id: "notebook1", name: "Seed Notebook 1", userId: "user6" },
    { id: "notebook2", name: "Seed Notebook 2", userId: "user6" },
    { id: "notebook3", name: "Seed Notebook 3", userId: "user7" },
  ]);
};
