import { getAuthService } from "@/server/features";
import { comparePasswords } from "@/server/features/auth/password";

describe("AuthService", () => {
  const authService = getAuthService();

  const assertUser = (user: User | undefined, id: number, withPassword: boolean) => {
    expect(user).toBeDefined();
    expect(user?.id).toBe(`user${id}`);
    expect(user?.name).toBe(`User ${id}`);
    expect(user?.email).toBe(`user${id}@gmail.com`);

    if (withPassword) {
      expect(user?.password).toBeDefined();
    } else {
      expect(user?.password).toBeUndefined();
    }
  };

  describe("#getUser", () => {
    it("should throw exception if user id not found", async () => {
      const getUserPromise = authService.getUser("bad-id", true);

      await expect(getUserPromise).rejects.toThrow();
    });

    it("should return the user when given a valid id", async () => {
      const user = await authService.getUser("user1", true);

      assertUser(user, 1, true);
    });

    it("should return the user without password when withPassword is false", async () => {
      const user = await authService.getUser("user1", false);

      assertUser(user, 1, false);
    });
  });

  describe("#getUserByEmail", () => {
    it("should return undefined if email not found", async () => {
      const user = await authService.getUserByEmail("missing@gmail.com", false);

      expect(user).toBeUndefined();
    });

    it("should return the user when given a valid email", async () => {
      const user = await authService.getUserByEmail("user1@gmail.com", false);

      assertUser(user, 1, false);
    });
  });

  describe("#createUser", () => {
    it("should create a new user, hashing the password", async () => {
      const userToCreate = {
        name: "New User",
        email: "newuser@gmail.com",
        password: "mypassword",
      };

      const createdUser = await authService.createUser(userToCreate);

      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe(userToCreate.name);
      expect(createdUser.email).toBe(userToCreate.email);
      expect(createdUser.password).toBeUndefined();

      const user = await authService.getUser(createdUser.id, true);
      expect(user).toBeDefined();
      expect(user?.password).toBeDefined();
      expect(user?.password).not.toBe(userToCreate.password);

      expect(await comparePasswords(userToCreate.password, user?.password as string)).toBe(true);
    });
  });

  describe("#updateUser", () => {
    it("should throw exception if user id not found", async () => {
      const updateUserPromise = authService.updateUser({
        id: "bad-id",
        name: "New Name",
        email: "newemail@gmail.com",
      });

      await expect(updateUserPromise).rejects.toThrow();
    });

    it("should update the user", async () => {
      const userToUpdate = {
        id: "user10",
        name: "User 10 Updated",
        email: "user10-updated@gmail.com",
      };

      const updatedUser = await authService.updateUser(userToUpdate);

      expect(updatedUser.id).toBe(userToUpdate.id);
      expect(updatedUser.name).toBe(userToUpdate.name);
      expect(updatedUser.email).toBe(userToUpdate.email);
      expect(updatedUser.password).toBeUndefined();

      const user = await authService.getUser(updatedUser.id, false);
      expect(user).toBeDefined();
      expect(user?.name).toBe(userToUpdate.name);
      expect(user?.email).toBe(userToUpdate.email);
    });

    it("should not update the password", async () => {
      const userToUpdate = {
        id: "user10",
        name: "User 10 Updated",
        email: "user10-updated@gmail.com",
        password: "newpassword",
      };

      await authService.updateUser(userToUpdate);

      const user = await authService.getUser(userToUpdate.id, true);
      expect(
        await comparePasswords(userToUpdate.password as string, user?.password as string)
      ).toBe(false);
    });
  });

  describe("#setUserPassword", () => {
    it("should throw exception if user id not found", async () => {
      const setUserPasswordPromise = authService.setUserPassword("bad-id", "newpassword");

      await expect(setUserPasswordPromise).rejects.toThrow();
    });

    it("should update the user password", async () => {
      const updatedUser = await authService.setUserPassword("user10", "newpassword");

      expect(updatedUser.id).toBe("user10");
      expect(updatedUser.password).toBeUndefined();

      const user = await authService.getUser("user10", true);

      expect(await comparePasswords("newpassword", user?.password as string)).toBe(true);
    });
  });

  describe("#deleteUser", () => {
    it("should throw exception if user id not found", async () => {
      const deleteUserPromise = authService.deleteUser("bad-id");

      await expect(deleteUserPromise).rejects.toThrow();
    });

    it("should delete the user", async () => {
      const createdUser = await authService.createUser({
        name: "Delete Me",
        email: "deleteme@gmail.com",
      });

      await authService.deleteUser(createdUser.id);

      const user = await authService.getUserByEmail(createdUser.email, false);

      expect(user).toBeUndefined();
    });
  });

  describe("#login", () => {
    it("should throw exception if user not found", async () => {
      const loginPromise = authService.login("invalid@gmail.com", "password");

      await expect(loginPromise).rejects.toThrow();
    });

    it("should throw exception if password is invalid", async () => {
      const loginPromise = authService.login("user1@gmail.com", "bad-password");

      await expect(loginPromise).rejects.toThrow();
    });

    it("should return the user when given a valid email and password", async () => {
      const user = await authService.login("user1@gmail.com", "password1");

      assertUser(user.user, 1, false);
    });
  });
});
