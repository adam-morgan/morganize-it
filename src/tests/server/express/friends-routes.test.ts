import request from "supertest";
import app from "@/server/express/restApi";
import { getKnex } from "@/server/db/sql/knex";

const login = async (email: string, password: string): Promise<string> => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.token;
};

describe("Express - Friends Routes", () => {
  let token1: string;
  let token2: string;
  let token3: string;

  beforeAll(async () => {
    token1 = await login("user1@gmail.com", "password1");
    token2 = await login("user2@gmail.com", "password2");
    token3 = await login("user3@gmail.com", "password3");
  });

  beforeEach(async () => {
    await getKnex()("shares").delete();
    await getKnex()("friendships").delete();
  });

  describe("POST /api/friends/request", () => {
    it("returns 401 without auth", async () => {
      const res = await request(app)
        .post("/api/friends/request")
        .send({ email: "user2@gmail.com" });
      expect(res.status).toBe(401);
    });

    it("rejects requests for unknown users", async () => {
      const res = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "ghost@example.com" });
      expect(res.status).toBe(404);
    });

    it("rejects self-friend", async () => {
      const res = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user1@gmail.com" });
      expect(res.status).toBe(400);
    });

    it("creates a pending friendship", async () => {
      const res = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user2@gmail.com" });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending");
      expect(res.body.requesterId).toBe("user1");
      expect(res.body.recipientId).toBe("user2");
    });

    it("auto-accepts when reverse pending exists", async () => {
      await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token2}`)
        .send({ email: "user1@gmail.com" });

      const res = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user2@gmail.com" });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("accepted");
    });

    it("normalizes email case", async () => {
      const res = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "USER2@Gmail.com" });
      expect(res.status).toBe(201);
    });
  });

  describe("Accept / Deny / Cancel / Remove", () => {
    it("accept moves status to accepted; remove deletes", async () => {
      const create = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user2@gmail.com" });
      const id = create.body.id;

      const accept = await request(app)
        .post(`/api/friends/${id}/accept`)
        .set("Authorization", `Bearer ${token2}`)
        .send();
      expect(accept.status).toBe(200);
      expect(accept.body.status).toBe("accepted");

      const remove = await request(app)
        .delete(`/api/friends/${id}`)
        .set("Authorization", `Bearer ${token1}`)
        .send();
      expect(remove.status).toBe(204);

      const list = await request(app)
        .get("/api/friends")
        .set("Authorization", `Bearer ${token1}`)
        .send();
      expect(list.body).toEqual([]);
    });

    it("non-recipient cannot accept", async () => {
      const create = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user2@gmail.com" });

      const accept = await request(app)
        .post(`/api/friends/${create.body.id}/accept`)
        .set("Authorization", `Bearer ${token3}`)
        .send();
      expect(accept.status).toBe(403);
    });

    it("deny removes pending request", async () => {
      const create = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user2@gmail.com" });

      const deny = await request(app)
        .post(`/api/friends/${create.body.id}/deny`)
        .set("Authorization", `Bearer ${token2}`)
        .send();
      expect(deny.status).toBe(204);

      const incoming = await request(app)
        .get("/api/friends/requests/incoming")
        .set("Authorization", `Bearer ${token2}`)
        .send();
      expect(incoming.body).toEqual([]);
    });

    it("cancel removes outgoing request", async () => {
      const create = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user2@gmail.com" });

      const cancel = await request(app)
        .delete(`/api/friends/${create.body.id}/cancel`)
        .set("Authorization", `Bearer ${token1}`)
        .send();
      expect(cancel.status).toBe(204);
    });
  });

  describe("Listing endpoints", () => {
    it("returns hydrated friend records with name and email", async () => {
      const create = await request(app)
        .post("/api/friends/request")
        .set("Authorization", `Bearer ${token1}`)
        .send({ email: "user2@gmail.com" });
      await request(app)
        .post(`/api/friends/${create.body.id}/accept`)
        .set("Authorization", `Bearer ${token2}`)
        .send();

      const res = await request(app)
        .get("/api/friends")
        .set("Authorization", `Bearer ${token1}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].userId).toBe("user2");
      expect(res.body[0].email).toBe("user2@gmail.com");
      expect(res.body[0].name).toBe("User 2");
    });
  });
});

describe("Express - Users Routes", () => {
  let token: string;
  beforeAll(async () => {
    token = await login("user1@gmail.com", "password1");
  });

  it("GET /api/users/find returns matching user", async () => {
    const res = await request(app)
      .get("/api/users/find")
      .query({ email: "user2@gmail.com" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("user2");
    expect(res.body.password).toBeUndefined();
  });

  it("GET /api/users/find is case-insensitive", async () => {
    const res = await request(app)
      .get("/api/users/find")
      .query({ email: "USER2@Gmail.com" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("user2");
  });

  it("returns 404 for unknown email", async () => {
    const res = await request(app)
      .get("/api/users/find")
      .query({ email: "ghost@example.com" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("requires auth", async () => {
    const res = await request(app)
      .get("/api/users/find")
      .query({ email: "user2@gmail.com" });
    expect(res.status).toBe(401);
  });
});
