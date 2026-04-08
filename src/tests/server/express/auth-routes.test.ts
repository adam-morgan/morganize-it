import request from "supertest";
import app from "@/server/express/restApi";

describe("Express - Auth Routes", () => {
  describe("POST /api/auth/login", () => {
    it("should return 401 if invalid email specified", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "bad-email@gmail.com", password: "some-password" });

      expect(response.status).toBe(401);
    });

    it("should return 401 if invalid password specified", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "user1@gmail.com", password: "bad-password" });

      expect(response.status).toBe(401);
    });

    it("should return 200 with user and token if valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "user1@gmail.com", password: "password1" });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe("string");
    });
  });

  describe("GET /api/auth/whoami", () => {
    it("should return 401 if no token", async () => {
      const response = await request(app).get("/api/auth/whoami").send();

      expect(response.status).toBe(401);
    });

    it("should return 200 with user if valid token", async () => {
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ email: "user1@gmail.com", password: "password1" });

      const token = loginResponse.body.token;

      const whoamiResponse = await request(app)
        .get("/api/auth/whoami")
        .set("Authorization", `Bearer ${token}`)
        .send();

      expect(whoamiResponse.status).toBe(200);
      expect(whoamiResponse.body.email).toBe("user1@gmail.com");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should return 200 with valid token and invalidate refresh tokens", async () => {
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ email: "user1@gmail.com", password: "password1" });

      const { token, refreshToken } = loginResponse.body;

      const logoutResponse = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .send();

      expect(logoutResponse.status).toBe(200);

      // Refresh token should now be revoked
      const refreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
    });

    it("should return 401 without token", async () => {
      const logoutResponse = await request(app).post("/api/auth/logout").send();

      expect(logoutResponse.status).toBe(401);
    });
  });

  describe("POST /api/auth/create-account", () => {
    it("should return 400 if account already exists", async () => {
      const response = await request(app)
        .post("/api/auth/create-account")
        .send({ email: "user1@gmail.com", password: "password1" });

      expect(response.status).toBe(400);
    });

    it("should return 201 with user and token if account created", async () => {
      const response = await request(app)
        .post("/api/auth/create-account")
        .send({ email: "new-account@gmail.com", password: "password123" });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe("new-account@gmail.com");
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe("string");
    });
  });
});
