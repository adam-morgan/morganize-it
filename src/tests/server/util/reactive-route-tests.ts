import request from "supertest";
import app from "@/server/express/restApi";
import { ReactiveTestDef } from "./reactive-service-tests";

export const runGenericReactiveRouteTests = <T extends Entity>(
  routePrefix: string,
  def: ReactiveTestDef<T>
) => {
  describe(`POST ${routePrefix}`, () => {
    it("should create", async () => {
      const response = await request(app).post(routePrefix).send(def.create);

      expect(response.status).toBe(201);
    });
  });
};
