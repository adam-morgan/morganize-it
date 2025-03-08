import { getKnex } from "@/server/db";
import { AbstractAuthService } from "./auth.service";

const userColumns = ["id", "name", "email", "password"];

export class PostgresAuthService extends AbstractAuthService {
  async _getUser(id: number) {
    return getKnex().select(userColumns).from<User>("users").where("id", id).first();
  }

  async _getUserByEmail(email: string) {
    return getKnex().select(userColumns).from<User>("users").where("email", email).first();
  }

  async _createUser(user: Omit<User, "id">): Promise<User> {
    const createdUser = await getKnex()
      .insert(user)
      .into<User>("users")
      .returning(userColumns)
      .then((rows) => rows[0]);

    if (!createdUser) {
      throw new Error("User creation failed");
    }

    return createdUser as User;
  }

  async _updateUser(user: User) {
    const updatedUser = await getKnex()
      .update(user)
      .from<User>("users")
      .where("id", user.id)
      .returning(userColumns)
      .first();

    if (!updatedUser) {
      throw new Error("User update failed");
    }

    return updatedUser as User;
  }

  async deleteUser(id: string) {
    const deleted = await getKnex().delete().from<User>("users").where("id", id);

    if (deleted === 0) {
      throw new Error("User deletion failed");
    }

    return;
  }
}
