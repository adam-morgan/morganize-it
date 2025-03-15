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

    it("should return 200 if valid email and password specified", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "user1@gmail.com", password: "password1" });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });
  });

  describe("GET /api/auth/whoami", () => {
    it("should return 200 if user is not logged in", async () => {
      const response = await request(app).get("/api/auth/whoami").send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it("should return 200 if user is logged in", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({ email: "user1@gmail.com", password: "password1" });

      const whoamiResponse = await agent.get("/api/auth/whoami").send();

      expect(whoamiResponse.status).toBe(200);
      expect(whoamiResponse.body.email).toBe("user1@gmail.com");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should return 200 and user session destroyed", async () => {
      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({ email: "user1@gmail.com", password: "password1" });

      const logoutResponse = await agent.post("/api/auth/logout").send();

      expect(logoutResponse.status).toBe(200);

      const whoamiResponse = await agent.get("/api/auth/whoami").send();
      expect(whoamiResponse.body).toEqual({});
    });
  });

  describe("POST /api/auth/create-account", () => {
    it("should return 400 if account already exists", async () => {
      const response = await request(app)
        .post("/api/auth/create-account")
        .send({ email: "user1@gmail.com", password: "password1" });

      expect(response.status).toBe(400);
    });

    it("should return 200 if account created", async () => {
      const response = await request(app)
        .post("/api/auth/create-account")
        .send({ email: "new-account@gmail.com", password: "password123" });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe("new-account@gmail.com");
      expect(response.body.user.password).toBeUndefined();
    });
  });
});
