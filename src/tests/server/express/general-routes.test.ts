import request from "supertest";
import app from "@/server/express/restApi";

describe("Express - General Routes", () => {
  describe("GET /api/health", () => {
    it("should return 200", async () => {
      const response = await request(app).get("/api/health").send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok" });
    });
  });

  describe("GET /api/version", () => {
    it("should return the version", async () => {
      const response = await request(app).get("/api/version").send();

      expect(response.status).toBe(200);
      expect(response.body?.version).toBeDefined();
    });
  });

  describe("GET /api/does-not-exist", () => {
    it("should return 404", async () => {
      const response = await request(app).get("/api/does-not-exist").send();

      expect(response.status).toBe(404);
    });
  });
});
