import { getAuthService } from "@/server/features";

describe("AuthService", () => {
  const authService = getAuthService();

  const assertUser = (user: User | undefined, id: number, withPassword: boolean) => {
    expect(user).toBeDefined();
    expect(user?.id).toBe(id);
    expect(user?.name).toBe(`User ${id}`);
    expect(user?.email).toBe(`user${id}@gmail.com`);

    if (withPassword) {
      expect(user?.password).toBeDefined();
    } else {
      expect(user?.password).toBeUndefined();
    }
  };

  describe("#getUser", () => {
    it("getUser should throw exception if user id not found", async () => {
      const getUserPromise = authService.getUser(1, true);

      await expect(getUserPromise).rejects.toThrow();
    });

    it("getUser should return the user when given a valid id", async () => {
      const user = await authService.getUser(1, true);

      assertUser(user, 1, true);
    });

    it("getUser should return the user without password when withPassword is false", async () => {
      const user = await authService.getUser(1, false);

      assertUser(user, 1, false);
    });
  });

  describe("#getUserByEmail", () => {
    it("getUserByEmail should return undefined if email not found", async () => {
      const user = await authService.getUserByEmail("missing@gmail.com", false);

      expect(user).toBeUndefined();
    });

    it("getUserByEmail should return the user when given a valid email", async () => {
      const user = await authService.getUserByEmail("user1@gmail.com", false);

      assertUser(user, 1, false);
    });
  });
});
