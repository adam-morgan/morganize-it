import { v4 as uuid } from "uuid";
import { ReactiveTestDef, runGenericReactiveServiceTests } from "./reactive-service-tests";
import { firstValueFrom } from "rxjs";
import { runGenericReactiveRouteTests } from "./reactive-route-tests";

export const runGenericTests = <T extends Entity>(routePrefix: string, def: ReactiveTestDef<T>) => {
  describe("Generic Reactive Tests", () => {
    const idToGuid: Record<string, string> = {};

    for (const record of def.find.records) {
      const id = uuid();
      idToGuid[record.id] = id;
    }

    def = {
      ...def,
      find: {
        ...def.find,
        queries: def.find.queries?.map((query) => ({
          ...query,
          recordIds: query.recordIds.map((id) => idToGuid[id]),
        })),
        svcQueries: def.find.svcQueries?.map((query) => ({
          ...query,
          recordIds: query.recordIds.map((id) => idToGuid[id]),
        })),
        routeQueries: def.find.routeQueries?.map((query) => ({
          ...query,
          recordIds: query.recordIds.map((id) => idToGuid[id]),
        })),
      },
    };

    beforeAll(async () => {
      for (const record of def.find.records) {
        await firstValueFrom(def.svc.create({ ...record, id: idToGuid[record.id] }));
      }
    });

    runGenericReactiveServiceTests(def);
    runGenericReactiveRouteTests(routePrefix, def);
  });
};
