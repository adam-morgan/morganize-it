import { firstValueFrom } from "rxjs";
import { v4 as uuid } from "uuid";
import { getKnex } from "@/server/db/sql/knex";
import { getNotebookService, getNoteService } from "@/server/features/notes";
import { getShareService } from "@/server/features/shares";
import {
  affectedUsersForFriendship,
  affectedUsersForNote,
  affectedUsersForNotebook,
  affectedUsersForShare,
} from "@/server/features/realtime";

describe("realtime/affected-users", () => {
  const owner = "user1";
  const friendA = "user2";
  const friendB = "user3";

  beforeEach(async () => {
    await getKnex()("shares").delete();
    await getKnex()("notes").where({ userId: owner }).delete();
    await getKnex()("notebooks").where({ userId: owner }).delete();
  });

  const createNotebook = async () => {
    return firstValueFrom(
      getNotebookService().create({
        id: `nb-${uuid()}`,
        name: "Affected test",
        userId: owner,
        updatedAt: new Date().toISOString(),
      } as Notebook)
    );
  };

  const createNote = async (notebookId: string) =>
    firstValueFrom(
      getNoteService().create({
        id: `note-${uuid()}`,
        title: "Affected note",
        content: "",
        textContent: "",
        notebookId,
        userId: owner,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      } as Note)
    );

  const createShare = async (
    resourceType: ShareResourceType,
    resourceId: string,
    sharedWithUserId: string,
    notebookId: string
  ): Promise<Share> =>
    firstValueFrom(
      getShareService().create({
        id: `share-${uuid()}`,
        resourceType,
        resourceId,
        ownerId: owner,
        sharedWithUserId,
        permission: "readwrite",
        notebookId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );

  it("notebook: includes owner only when no shares exist", async () => {
    const notebook = await createNotebook();
    const ids = await firstValueFrom(affectedUsersForNotebook(notebook.id));
    expect(ids).toEqual([owner]);
  });

  it("notebook: includes recipients of notebook-level shares", async () => {
    const notebook = await createNotebook();
    await createShare("notebook", notebook.id, friendA, notebook.id);
    await createShare("notebook", notebook.id, friendB, notebook.id);

    const ids = await firstValueFrom(affectedUsersForNotebook(notebook.id));
    expect(ids.sort()).toEqual([owner, friendA, friendB].sort());
  });

  it("note: includes notebook-level and note-level recipients without duplicates", async () => {
    const notebook = await createNotebook();
    const note = await createNote(notebook.id);
    await createShare("notebook", notebook.id, friendA, notebook.id);
    await createShare("note", note.id, friendA, notebook.id); // same friend twice
    await createShare("note", note.id, friendB, notebook.id);

    const ids = await firstValueFrom(affectedUsersForNote(note.id));
    expect(ids.sort()).toEqual([owner, friendA, friendB].sort());
  });

  it("note: works without a notebook share", async () => {
    const notebook = await createNotebook();
    const note = await createNote(notebook.id);
    await createShare("note", note.id, friendA, notebook.id);

    const ids = await firstValueFrom(affectedUsersForNote(note.id));
    expect(ids.sort()).toEqual([owner, friendA].sort());
  });

  it("share: includes the owner and the recipient", () => {
    const share: Share = {
      id: "s1",
      resourceType: "notebook",
      resourceId: "nb1",
      ownerId: owner,
      sharedWithUserId: friendA,
      permission: "read",
      notebookId: "nb1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(affectedUsersForShare(share).sort()).toEqual([owner, friendA].sort());
  });

  it("friendship: includes both sides", () => {
    const friendship: Friendship = {
      id: "f1",
      requesterId: owner,
      recipientId: friendA,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(affectedUsersForFriendship(friendship).sort()).toEqual(
      [owner, friendA].sort()
    );
  });
});
