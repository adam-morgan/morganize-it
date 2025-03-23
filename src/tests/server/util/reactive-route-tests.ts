import app from "@/server/express/restApi";
import * as R from "rambda";
import { firstValueFrom } from "rxjs";
import request from "supertest";
import { v4 as uuid } from "uuid";
import { ReactiveTestDef } from "./reactive-service-tests";

export const runGenericReactiveRouteTests = <T extends Entity>(
  routePrefix: string,
  def: ReactiveTestDef<T>,
  isUserEntity = true
) => {
  const agent = request.agent(app);

  beforeAll(async () => {
    await agent.post("/api/auth/login").send({ email: "user1@gmail.com", password: "password1" });
  });

  describe(`GET ${routePrefix}/:id`, () => {
    it("should fail with invalid id", async () => {
      const response = await agent.get(`${routePrefix}/invalid-id`);

      expect(response.status).toBe(404);
    });

    if (isUserEntity) {
      it("should fail when not permitted to access", async () => {
        const createdObj = await firstValueFrom(
          def.svc.create({ ...def.create, id: uuid(), userId: "user10" })
        );

        const response = await agent.get(`${routePrefix}/${createdObj.id}`);

        expect(response.status).toBe(404);
      });
    }

    it("should return record", async () => {
      const createResponse = await agent.post(routePrefix).send(def.create);
      const createdObj = createResponse.body;

      const response = await agent.get(`${routePrefix}/${createdObj.id}`);

      expect(response.status).toBe(200);
      expect(R.omit(["id"], response.body)).toEqual(def.create);
    });
  });

  describe(`POST ${routePrefix}`, () => {
    if (isUserEntity) {
      it("should fail with invalid user id", async () => {
        const response = await agent
          .post(routePrefix)
          .send({ ...def.create, userId: "invalid-user-id" });

        expect(response.status).toBe(403);
      });
    }

    it("should create", async () => {
      const response = await agent.post(routePrefix).send(def.create);

      expect(response.status).toBe(201);
      expect(R.omit(["id"], response.body)).toEqual(def.create);
    });
  });

  describe(`PUT ${routePrefix}/:id`, () => {
    it("should fail with invalid id", async () => {
      const response = await agent.put(`${routePrefix}/invalid-id`).send(def.update);

      expect(response.status).toBe(404);
    });

    it("should update", async () => {
      const createResponse = await agent.post(routePrefix).send(def.create);
      const createdObj = createResponse.body;

      const response = await agent.put(`${routePrefix}/${createdObj.id}`).send(def.update);

      expect(response.status).toBe(200);
      expect(R.omit(["id"], response.body)).toEqual(def.update);
    });
  });

  describe(`PATCH ${routePrefix}/:id`, () => {
    it("should fail with invalid id", async () => {
      const response = await agent.patch(`${routePrefix}/invalid-id`).send(def.patch);

      expect(response.status).toBe(404);
    });

    it("should patch", async () => {
      const createResponse = await agent.post(routePrefix).send(def.create);
      const createdObj = createResponse.body;

      const response = await agent.patch(`${routePrefix}/${createdObj.id}`).send(def.patch);

      expect(response.status).toBe(200);
      expect(R.omit(["id"], response.body)).toEqual({ ...def.create, ...def.patch });
    });
  });

  describe(`DELETE ${routePrefix}/:id`, () => {
    it("should fail with invalid id", async () => {
      const response = await agent.delete(`${routePrefix}/invalid-id`);

      expect(response.status).toBe(404);
    });

    it("should delete", async () => {
      const createResponse = await agent.post(routePrefix).send(def.create);
      const createdObj = createResponse.body;

      const response = await agent.delete(`${routePrefix}/${createdObj.id}`);

      expect(response.status).toBe(204);
    });
  });
};
