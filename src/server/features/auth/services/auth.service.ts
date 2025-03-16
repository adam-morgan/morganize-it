import * as R from "rambda";
import { v4 as uuid } from "uuid";
import { comparePasswords, hashPassword } from "../password";

export interface AuthService {
  getUser(id: string, withPassword: boolean): Promise<User>;
  getUserByEmail(email: string, withPassword: boolean): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;
  updateUser(user: User): Promise<User>;
  setUserPassword(id: string, password: string): Promise<User>;
  deleteUser(id: string): Promise<void>;

  login(email: string, password: string): Promise<LoginResponse>;
}

export abstract class AbstractAuthService implements AuthService {
  abstract _getUser(id: string): Promise<User>;
  abstract _getUserByEmail(email: string): Promise<User | undefined>;
  abstract _createUser(user: User): Promise<User>;
  abstract _updateUser(user: User): Promise<User>;
  abstract deleteUser(id: string): Promise<void>;

  async getUser(id: string, withPassword: boolean): Promise<User> {
    const user = await this._getUser(id);

    if (user == null) {
      throw new Error(`User not found with id: ${id}`);
    }

    if (!withPassword) {
      return R.omit(["password"], user);
    }

    return user;
  }

  async getUserByEmail(email: string, withPassword: boolean): Promise<User | undefined> {
    const user = await this._getUserByEmail(email);
    if (!user) {
      return undefined;
    }

    if (!withPassword) {
      return R.omit(["password"], user);
    }

    return user;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const userToCreate = {
      ...user,
      id: uuid(),
      password: user.password ? await hashPassword(user.password) : undefined,
    };

    const createdUser = await this._createUser(userToCreate);

    return R.omit(["password"], createdUser);
  }

  async updateUser(user: User): Promise<User> {
    const existingUser = await this._getUser(user.id);

    if (!existingUser) {
      throw new Error("User not found");
    }

    // Don't update password here, that's handled in setUserPassword
    const userToUpdate = { ...user, password: existingUser.password };

    const updatedUser = await this._updateUser(userToUpdate);

    return R.omit(["password"], updatedUser);
  }

  async setUserPassword(id: string, password: string): Promise<User> {
    const existingUser = await this._getUser(id);

    if (!existingUser) {
      throw new Error("User not found");
    }

    const userToUpdate = { ...existingUser, password: await hashPassword(password) };
    const updatedUser = await this._updateUser(userToUpdate);

    return R.omit(["password"], updatedUser);
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.getUserByEmail(email, true);
    if (!user) {
      throw new Error("User not found");
    }

    if (!(await comparePasswords(password, user.password as string))) {
      throw new Error("Invalid password");
    }

    return { user: R.omit(["password"], user) };
  }
}
