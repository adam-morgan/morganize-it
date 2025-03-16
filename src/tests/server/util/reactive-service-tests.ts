import { ReactiveService } from "@/server/db/reactive-service";
import { firstValueFrom } from "rxjs";
import { v4 as uuid } from "uuid";

export type ReactiveTestDef<T> = {
  svc: ReactiveService<T>;
  create: Omit<T, "id">;
  update: Omit<T, "id">;
  patch: Partial<T>;
};

export const runGenericReactiveServiceTests = <T>(def: ReactiveTestDef<T>) => {
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
      expect(createResponse).toEqual(toCreate);

      const findResponse = await firstValueFrom(def.svc.findById(id));
      expect(findResponse).toEqual(toCreate);
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
      expect(updateResponse).toEqual(toUpdate);

      const findResponse = await firstValueFrom(def.svc.findById(id));
      expect(findResponse).toEqual(toUpdate);
    });
  });
};
