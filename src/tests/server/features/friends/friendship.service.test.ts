import { firstValueFrom } from "rxjs";
import { v4 as uuid } from "uuid";
import { getFriendshipService } from "@/server/features/friends";
import { getKnex } from "@/server/db/sql/knex";

describe("FriendshipService", () => {
  const svc = getFriendshipService();

  const now = () => new Date().toISOString();

  beforeEach(async () => {
    await getKnex()("friendships").delete();
  });

  const createPending = async (requesterId: string, recipientId: string) => {
    const friendship: Friendship = {
      id: uuid(),
      requesterId,
      recipientId,
      status: "pending",
      createdAt: now(),
      updatedAt: now(),
    };
    return firstValueFrom(svc.create(friendship));
  };

  describe("#findBetween", () => {
    it("should return undefined when no friendship exists", async () => {
      const result = await firstValueFrom(svc.findBetween("user1", "user2"));
      expect(result).toBeUndefined();
    });

    it("should find friendship in either direction", async () => {
      const created = await createPending("user1", "user2");

      const a = await firstValueFrom(svc.findBetween("user1", "user2"));
      const b = await firstValueFrom(svc.findBetween("user2", "user1"));

      expect(a?.id).toBe(created.id);
      expect(b?.id).toBe(created.id);
    });
  });

  describe("#listFriends", () => {
    it("returns accepted friendships in either direction", async () => {
      const f1 = await createPending("user1", "user2");
      await firstValueFrom(svc.updateStatus(f1.id, "accepted"));
      const f2 = await createPending("user3", "user1");
      await firstValueFrom(svc.updateStatus(f2.id, "accepted"));

      const friends = await firstValueFrom(svc.listFriends("user1"));
      const friendIds = friends.map((f) => f.userId).sort();
      expect(friendIds).toEqual(["user2", "user3"]);
    });

    it("excludes pending friendships", async () => {
      await createPending("user1", "user2");

      const friends = await firstValueFrom(svc.listFriends("user1"));
      expect(friends).toHaveLength(0);
    });
  });

  describe("#listIncomingRequests", () => {
    it("returns only pending requests where I am the recipient", async () => {
      await createPending("user2", "user1");
      await createPending("user1", "user3"); // outgoing — should not appear

      const incoming = await firstValueFrom(svc.listIncomingRequests("user1"));
      expect(incoming).toHaveLength(1);
      expect(incoming[0].userId).toBe("user2");
    });
  });

  describe("#listOutgoingRequests", () => {
    it("returns only pending requests where I am the requester", async () => {
      await createPending("user1", "user2");
      await createPending("user3", "user1"); // incoming — should not appear

      const outgoing = await firstValueFrom(svc.listOutgoingRequests("user1"));
      expect(outgoing).toHaveLength(1);
      expect(outgoing[0].userId).toBe("user2");
    });
  });

  describe("#delete", () => {
    it("removes the friendship", async () => {
      const f = await createPending("user1", "user2");
      await firstValueFrom(svc.delete(f.id));

      const after = await firstValueFrom(svc.findBetween("user1", "user2"));
      expect(after).toBeUndefined();
    });
  });
});
