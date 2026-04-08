import { ReactiveService } from "@/server/db/reactive-service";
import { firstValueFrom } from "rxjs";
import { v4 as uuid } from "uuid";

export type ReactiveTestDef<T extends Entity> = {
  svc: ReactiveService<T>;
  create: Omit<T, "id">;
  update: Omit<T, "id">;
  patch: Partial<T>;
  writeRouteUser?: {
    id: string;
    email: string;
    password: string;
  };
  readRouteUser?: {
    id: string;
    email: string;
    password: string;
  };
  find: {
    records: T[];
    queries?: {
      name?: string;
      options: FindOptions;
      recordIds: string[];
    }[];
    routeQueries?: {
      name?: string;
      options: FindOptions;
      recordIds: string[];
    }[];
    svcQueries?: {
      name?: string;
      options: FindOptions;
      recordIds: string[];
    }[];
  };
};

export const runGenericReactiveServiceTests = <T extends Entity>(def: ReactiveTestDef<T>) => {
  describe("#find", () => {
    const queries = [...(def.find.queries ?? []), ...(def.find.svcQueries ?? [])];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const name = query.name || `Query ${i}`;

      it(name, async () => {
        const findResponse = await firstValueFrom(def.svc.find(query.options));

        const recordIds = findResponse.items.map((r) => r.id);

        if (query.options.sort != null) {
          expect(recordIds).toEqual(query.recordIds);
        } else {
          expect(recordIds).toEqual(expect.arrayContaining(query.recordIds));
        }
      });
    }
  });

  describe("#find cursor pagination", () => {
    it("should paginate through results using cursor", async () => {
      // Get first page
      const firstPage = await firstValueFrom(
        def.svc.find({ sort: [{ property: "id", direction: "asc" }], limit: 1 })
      );

      expect(firstPage.items).toHaveLength(1);
      expect(firstPage.nextCursor).toBeDefined();

      // Get second page using cursor
      const secondPage = await firstValueFrom(
        def.svc.find({
          sort: [{ property: "id", direction: "asc" }],
          limit: 1,
          cursor: firstPage.nextCursor,
        })
      );

      expect(secondPage.items).toHaveLength(1);
      expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
    });

    it("should return no nextCursor on last page", async () => {
      const result = await firstValueFrom(
        def.svc.find({ sort: [{ property: "id", direction: "asc" }], limit: 1000 })
      );

      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe("#findById", () => {
    it("should fail with invalid id", () => {
      const findResponsePromise = firstValueFrom(def.svc.findById("invalid"));

      expect(findResponsePromise).rejects.toThrow();
    });

    it("should find by id", async () => {
      const id = uuid();

      const toCreate = {
        ...def.create,
        id,
      } as T;

      await firstValueFrom(def.svc.create(toCreate));

      const findResponse = await firstValueFrom(def.svc.findById(id));
      expect(findResponse).toMatchObject(toCreate);
    });
  });

  describe("#create", () => {
    it("should fail without id", async () => {
      const createResponsePromise = firstValueFrom(def.svc.create(def.create));

      expect(createResponsePromise).rejects.toThrow();
    });

    it("should create", async () => {
      const id = uuid();

      const toCreate = {
        ...def.create,
        id,
      } as T;

      const createResponse = await firstValueFrom(def.svc.create(toCreate));
      expect(createResponse).toMatchObject(toCreate);

      const findResponse = await firstValueFrom(def.svc.findById(id));
      expect(findResponse).toMatchObject(toCreate);
    });
  });

  describe("#update", () => {
    it("should fail with invalid id", () => {
      const updateResponsePromise = firstValueFrom(def.svc.update("invalid", def.update as T));

      expect(updateResponsePromise).rejects.toThrow();
    });

    it("should update", async () => {
      const id = uuid();

      const toCreate = {
        ...def.create,
        id,
      } as T;

      await firstValueFrom(def.svc.create(toCreate));

      const toUpdate = {
        ...def.update,
        id,
      } as T;

      const updateResponse = await firstValueFrom(def.svc.update(id, toUpdate));
      expect(updateResponse).toMatchObject(toUpdate);

      const findResponse = await firstValueFrom(def.svc.findById(id));
      expect(findResponse).toMatchObject(toUpdate);
    });
  });

  describe("#patch", () => {
    it("should fail with invalid id", () => {
      const patchResponsePromise = firstValueFrom(def.svc.patch("invalid", def.patch));

      expect(patchResponsePromise).rejects.toThrow();
    });

    it("should patch", async () => {
      const id = uuid();

      const toCreate = {
        ...def.create,
        id,
      } as T;

      await firstValueFrom(def.svc.create(toCreate));

      const toPatch = {
        ...def.patch,
        id,
      } as T;

      const patchResponse = await firstValueFrom(def.svc.patch(id, toPatch));
      expect(patchResponse).toMatchObject({
        ...toCreate,
        ...toPatch,
      });

      const findResponse = await firstValueFrom(def.svc.findById(id));
      expect(findResponse).toMatchObject({
        ...toCreate,
        ...toPatch,
      });
    });
  });

  describe("#delete", () => {
    it("should fail with invalid id", () => {
      const deleteResponsePromise = firstValueFrom(def.svc.delete("invalid"));

      expect(deleteResponsePromise).rejects.toThrow();
    });

    it("should delete", async () => {
      const id = uuid();

      const toCreate = {
        ...def.create,
        id,
      } as T;

      await firstValueFrom(def.svc.create(toCreate));

      await firstValueFrom(def.svc.delete(id));

      const findResponsePromise = firstValueFrom(def.svc.findById(id));
      expect(findResponsePromise).rejects.toThrow();
    });
  });
};
