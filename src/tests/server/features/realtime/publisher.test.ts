import request from "supertest";
import { firstValueFrom } from "rxjs";
import { v4 as uuid } from "uuid";
import app from "@/server/express/restApi";
import { getKnex } from "@/server/db/sql/knex";
import { getNotebookService, getNoteService } from "@/server/features/notes";
import {
  InMemoryConnectionRegistry,
  LocalWsPublisher,
  RealtimeEvent,
  setRealtimeBackend,
} from "@/server/features/realtime";

/**
 * Minimal in-test fake of the `ws` WebSocket. The publisher only reads
 * `readyState` and calls `send` — that's all we need to capture published
 * messages without spinning up a real WebSocketServer.
 */
type FakeSocket = {
  readyState: number;
  send: (data: string) => void;
  received: RealtimeEvent[];
};

const makeFakeSocket = (): FakeSocket => {
  const received: RealtimeEvent[] = [];
  return {
    readyState: 1,
    received,
    send(data: string) {
      received.push(JSON.parse(data) as RealtimeEvent);
    },
  };
};

const login = async (email: string, password: string): Promise<string> => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.token;
};

const ensureFriendship = async (a: string, b: string) => {
  await getKnex()("friendships").insert({
    id: `friend-${a}-${b}-${uuid()}`,
    requesterId: a,
    recipientId: b,
    status: "accepted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

describe("realtime/publisher integration", () => {
  let aliceToken: string;
  let bobToken: string;
  let registry: InMemoryConnectionRegistry;
  let aliceSocket: FakeSocket;
  let bobSocket: FakeSocket;

  const aliceId = "user1";
  const bobId = "user2";

  beforeAll(async () => {
    aliceToken = await login("user1@gmail.com", "password1");
    bobToken = await login("user2@gmail.com", "password2");
  });

  beforeEach(async () => {
    await getKnex()("shares").delete();
    await getKnex()("notes").where({ userId: aliceId }).delete();
    await getKnex()("notebooks").where({ userId: aliceId }).delete();
    await getKnex()("friendships").delete();

    registry = new InMemoryConnectionRegistry();
    setRealtimeBackend(registry, new LocalWsPublisher(registry));

    aliceSocket = makeFakeSocket();
    bobSocket = makeFakeSocket();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registry.registerSocket(aliceId, aliceSocket as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registry.registerSocket(bobId, bobSocket as any);
  });

  it("notifies the recipient when a notebook shared with them is updated", async () => {
    const notebook = await firstValueFrom(
      getNotebookService().create({
        id: `nb-${uuid()}`,
        name: "Original",
        userId: aliceId,
        updatedAt: new Date().toISOString(),
      } as Notebook)
    );
    await ensureFriendship(aliceId, bobId);
    await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        resourceType: "notebook",
        resourceId: notebook.id,
        sharedWithUserId: bobId,
        permission: "readwrite",
      })
      .expect(201);

    // Bob saw the share creation
    expect(bobSocket.received.some((e) => e.resourceType === "share" && e.action === "created"))
      .toBe(true);

    bobSocket.received.length = 0;

    await request(app)
      .patch(`/api/notebooks/${notebook.id}`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ name: "Renamed" })
      .expect(200);

    expect(
      bobSocket.received.some(
        (e) =>
          e.type === "resource.changed" &&
          e.resourceType === "notebook" &&
          e.resourceId === notebook.id &&
          e.action === "updated"
      )
    ).toBe(true);
  });

  it("notifies recipient when a friend request is sent", async () => {
    await request(app)
      .post("/api/friends/request")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ email: "user2@gmail.com" })
      .expect(201);

    expect(
      bobSocket.received.some(
        (e) => e.resourceType === "friend-request" && e.action === "created"
      )
    ).toBe(true);
  });

  it("notifies both sides when a friend request is accepted", async () => {
    const sendRes = await request(app)
      .post("/api/friends/request")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ email: "user2@gmail.com" })
      .expect(201);

    aliceSocket.received.length = 0;
    bobSocket.received.length = 0;

    const friendshipId = sendRes.body.id as string;
    await request(app)
      .post(`/api/friends/${friendshipId}/accept`)
      .set("Authorization", `Bearer ${bobToken}`)
      .expect(200);

    const accepted = (e: RealtimeEvent) =>
      e.resourceType === "friendship" && e.action === "accepted";
    expect(aliceSocket.received.some(accepted)).toBe(true);
    expect(bobSocket.received.some(accepted)).toBe(true);
  });

  it("notifies recipient when share is revoked", async () => {
    await ensureFriendship(aliceId, bobId);
    const notebook = await firstValueFrom(
      getNotebookService().create({
        id: `nb-${uuid()}`,
        name: "Shared",
        userId: aliceId,
        updatedAt: new Date().toISOString(),
      } as Notebook)
    );
    const shareRes = await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        resourceType: "notebook",
        resourceId: notebook.id,
        sharedWithUserId: bobId,
        permission: "readwrite",
      })
      .expect(201);

    bobSocket.received.length = 0;

    await request(app)
      .delete(`/api/shares/${shareRes.body.id}`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .expect(204);

    expect(
      bobSocket.received.some(
        (e) => e.resourceType === "share" && e.action === "deleted"
      )
    ).toBe(true);
  });

  it("notifies notebook recipient when a note in that notebook is patched", async () => {
    await ensureFriendship(aliceId, bobId);
    const notebook = await firstValueFrom(
      getNotebookService().create({
        id: `nb-${uuid()}`,
        name: "List",
        userId: aliceId,
        updatedAt: new Date().toISOString(),
      } as Notebook)
    );
    const note = await firstValueFrom(
      getNoteService().create({
        id: `note-${uuid()}`,
        title: "Groceries",
        content: "",
        textContent: "",
        notebookId: notebook.id,
        userId: aliceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      } as Note)
    );
    await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        resourceType: "notebook",
        resourceId: notebook.id,
        sharedWithUserId: bobId,
        permission: "readwrite",
      })
      .expect(201);

    bobSocket.received.length = 0;

    await request(app)
      .patch(`/api/notes/${note.id}`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ title: "Groceries v2" })
      .expect(200);

    expect(
      bobSocket.received.some(
        (e) =>
          e.resourceType === "note" &&
          e.resourceId === note.id &&
          e.action === "updated"
      )
    ).toBe(true);
  });
});
