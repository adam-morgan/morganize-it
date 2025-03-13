import { getAuthService } from "@/server/features";

describe("AuthService", () => {
  const authService = getAuthService();

  it("getUser should throw exception if user id not found", async () => {
    const getUserPromise = authService.getUser(-1, true);

    await expect(getUserPromise).rejects.toThrow();
  });
});
