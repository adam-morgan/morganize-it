import request from "supertest";
import { firstValueFrom } from "rxjs";
import app from "@/server/express/restApi";
import { getKnex } from "@/server/db/sql/knex";
import { getNotebookService, getNoteService } from "@/server/features/notes";

const login = async (email: string, password: string): Promise<string> => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.token;
};

describe("Express - Shares & Shared Resources", () => {
  let aliceToken: string; // owner
  let bobToken: string; // friend
  let carolToken: string; // not a friend

  let notebookId: string;
  let noteId: string;

  const aliceId = "user1";
  const bobId = "user2";

  const ensureFriendship = async (a: string, b: string) => {
    await getKnex()("friendships").insert({
      id: `friend-${a}-${b}`,
      requesterId: a,
      recipientId: b,
      status: "accepted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  beforeAll(async () => {
    aliceToken = await login("user1@gmail.com", "password1");
    bobToken = await login("user2@gmail.com", "password2");
    carolToken = await login("user3@gmail.com", "password3");
  });

  beforeEach(async () => {
    await getKnex()("shares").delete();
    await getKnex()("notes").where({ userId: aliceId }).delete();
    await getKnex()("notebooks").where({ userId: aliceId }).delete();
    await getKnex()("friendships").delete();

    const notebook = await firstValueFrom(
      getNotebookService().create({
        id: `nb-${Date.now()}`,
        name: "Alice's Notebook",
        userId: aliceId,
        updatedAt: new Date().toISOString(),
      } as Notebook)
    );
    notebookId = notebook.id;

    const note = await firstValueFrom(
      getNoteService().create({
        id: `note-${Date.now()}`,
        title: "Alice's Note",
        content: "",
        textContent: "",
        notebookId,
        userId: aliceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      } as Note)
    );
    noteId = note.id;

    await ensureFriendship(aliceId, bobId);
  });

  describe("POST /api/shares", () => {
    it("creates a notebook share with a friend", async () => {
      const res = await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "read",
        });
      expect(res.status).toBe(201);
      expect(res.body.permission).toBe("read");
      expect(res.body.notebookId).toBe(notebookId);
    });

    it("rejects sharing with non-friends", async () => {
      const res = await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: "user3",
          permission: "read",
        });
      expect(res.status).toBe(400);
    });

    it("rejects when caller is not the owner", async () => {
      const res = await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: aliceId,
          permission: "read",
        });
      expect(res.status).toBe(403);
    });

    it("rejects sharing with self", async () => {
      const res = await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: aliceId,
          permission: "read",
        });
      expect(res.status).toBe(400);
    });

    it("creates a note-level share with the right notebookId", async () => {
      const res = await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "note",
          resourceId: noteId,
          sharedWithUserId: bobId,
          permission: "readwrite",
        });
      expect(res.status).toBe(201);
      expect(res.body.notebookId).toBe(notebookId);
    });
  });

  describe("GET /api/shares/notebooks", () => {
    it("returns notebooks shared with me", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "read",
        });

      const res = await request(app)
        .get("/api/shares/notebooks")
        .set("Authorization", `Bearer ${bobToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(notebookId);
      expect(res.body[0].permission).toBe("read");
      expect(res.body[0].ownerName).toBe("User 1");
    });
  });

  describe("GET /api/shares/notes", () => {
    it("returns notes shared with me with parent notebook hydration", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "note",
          resourceId: noteId,
          sharedWithUserId: bobId,
          permission: "readwrite",
        });

      const res = await request(app)
        .get("/api/shares/notes")
        .set("Authorization", `Bearer ${bobToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(noteId);
      expect(res.body[0].parentNotebookName).toBe("Alice's Notebook");
    });
  });

  describe("Permission enforcement on notebook/note routes", () => {
    it("read-only recipient cannot update the notebook", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "read",
        });

      const res = await request(app)
        .put(`/api/notebooks/${notebookId}`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ id: notebookId, name: "Hijacked", userId: aliceId, updatedAt: new Date().toISOString() });
      expect(res.status).toBe(403);
    });

    it("readwrite recipient can update the notebook", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "readwrite",
        });

      const res = await request(app)
        .patch(`/api/notebooks/${notebookId}`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ name: "Updated by Bob" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated by Bob");
    });

    it("readwrite recipient cannot delete the notebook (owner-only)", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "readwrite",
        });

      const res = await request(app)
        .delete(`/api/notebooks/${notebookId}`)
        .set("Authorization", `Bearer ${bobToken}`);
      expect(res.status).toBe(403);
    });

    it("readwrite recipient can create notes in the shared notebook", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "readwrite",
        });

      const now = new Date().toISOString();
      const res = await request(app)
        .post("/api/notes")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({
          title: "Bob's note",
          content: "",
          textContent: "",
          notebookId,
          userId: bobId,
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
        });
      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(bobId);
    });

    it("read-only recipient cannot create notes in the shared notebook", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "read",
        });

      const now = new Date().toISOString();
      const res = await request(app)
        .post("/api/notes")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({
          title: "Bob's note",
          content: "",
          textContent: "",
          notebookId,
          userId: bobId,
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
        });
      expect(res.status).toBe(403);
    });

    it("note-level readwrite overrides notebook-level read (most privilege)", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "read",
        });
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "note",
          resourceId: noteId,
          sharedWithUserId: bobId,
          permission: "readwrite",
        });

      const res = await request(app)
        .patch(`/api/notes/${noteId}`)
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ title: "Edited by Bob" });
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/shared/notebooks/:id/notes", () => {
    it("returns all notes for owner", async () => {
      const res = await request(app)
        .get(`/api/shared/notebooks/${notebookId}/notes`)
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it("returns all notes for notebook-shared recipient", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "read",
        });

      const res = await request(app)
        .get(`/api/shared/notebooks/${notebookId}/notes`)
        .set("Authorization", `Bearer ${bobToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it("returns only individually-shared notes when no notebook-level access", async () => {
      await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "note",
          resourceId: noteId,
          sharedWithUserId: bobId,
          permission: "read",
        });

      const res = await request(app)
        .get(`/api/shared/notebooks/${notebookId}/notes`)
        .set("Authorization", `Bearer ${bobToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(noteId);
    });

    it("returns nothing for users with no access", async () => {
      const res = await request(app)
        .get(`/api/shared/notebooks/${notebookId}/notes`)
        .set("Authorization", `Bearer ${carolToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("DELETE /api/shares/:id", () => {
    it("recipient can leave a share", async () => {
      const created = await request(app)
        .post("/api/shares")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          resourceType: "notebook",
          resourceId: notebookId,
          sharedWithUserId: bobId,
          permission: "read",
        });

      const res = await request(app)
        .delete(`/api/shares/${created.body.id}`)
        .set("Authorization", `Bearer ${bobToken}`);
      expect(res.status).toBe(204);
    });
  });
});
