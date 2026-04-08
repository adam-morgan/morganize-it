import app from "@/server/express/restApi";
import * as R from "rambda";
import { firstValueFrom } from "rxjs";
import request, { Response } from "supertest";
import { v4 as uuid } from "uuid";
import { ReactiveTestDef } from "./reactive-service-tests";

const loginForToken = async (email: string, password: string): Promise<string> => {
  const response = await request(app).post("/api/auth/login").send({ email, password });
  return response.body.token;
};

const authGet = (token: string, url: string) =>
  request(app).get(url).set("Authorization", `Bearer ${token}`);

const authPost = (token: string, url: string) =>
  request(app).post(url).set("Authorization", `Bearer ${token}`);

const authPut = (token: string, url: string) =>
  request(app).put(url).set("Authorization", `Bearer ${token}`);

const authPatch = (token: string, url: string) =>
  request(app).patch(url).set("Authorization", `Bearer ${token}`);

const authDelete = (token: string, url: string) =>
  request(app).delete(url).set("Authorization", `Bearer ${token}`);

export const runGenericReactiveRouteTests = <T extends Entity>(
  routePrefix: string,
  def: ReactiveTestDef<T>,
  isUserEntity = true
) => {
  let writeToken: string;
  let readToken: string;

  beforeAll(async () => {
    if (def.writeRouteUser != null) {
      writeToken = await loginForToken(def.writeRouteUser.email, def.writeRouteUser.password!);
    }

    if (def.readRouteUser != null) {
      readToken = await loginForToken(def.readRouteUser.email, def.readRouteUser.password!);
    }
  });

  const queries = [...(def.find.queries ?? []), ...(def.find.routeQueries ?? [])];

  const testQueries = (queryFunc: (query: (typeof queries)[0]) => Promise<Response>) => {
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const name = query.name || `Query ${i}`;

      it(name, async () => {
        const findResponse = await queryFunc(query);

        expect(findResponse.status).toBe(200);

        const result: PageResult<T> = findResponse.body as unknown as PageResult<T>;
        const recordIds = result.items.map((r) => r.id);

        if (query.options.sort != null) {
          expect(recordIds).toEqual(query.recordIds);
        } else {
          expect(recordIds).toEqual(expect.arrayContaining(query.recordIds));
        }
      });
    }
  };

  describe(`GET ${routePrefix}`, () => {
    testQueries(async (query) => {
      let req = authGet(readToken, routePrefix);

      for (const key in query.options) {
        if (key === "limit" || key === "cursor") {
          req = req.query({ [key]: (query.options as any)[key] });
        } else {
          req = req.query({ [key]: JSON.stringify((query.options as any)[key]) });
        }
      }

      const response = await req;
      return response;
    });
  });

  describe(`POST ${routePrefix}/find`, () => {
    testQueries(async (query) => {
      const response = await authPost(readToken, `${routePrefix}/find`).send(query.options);

      return response;
    });
  });

  describe(`GET ${routePrefix}/:id`, () => {
    it("should fail with invalid id", async () => {
      const response = await authGet(writeToken, `${routePrefix}/invalid-id`);

      expect(response.status).toBe(404);
    });

    if (isUserEntity) {
      it("should fail when not permitted to access", async () => {
        const createdObj = await firstValueFrom(
          def.svc.create({ ...def.create, id: uuid(), userId: "user10" })
        );

        const response = await authGet(writeToken, `${routePrefix}/${createdObj.id}`);

        expect(response.status).toBe(404);
      });
    }

    it("should return record", async () => {
      const createResponse = await authPost(writeToken, routePrefix).send(def.create);
      const createdObj = createResponse.body;

      const response = await authGet(writeToken, `${routePrefix}/${createdObj.id}`);

      expect(response.status).toBe(200);
      expect(R.omit(["id"], response.body)).toMatchObject(def.create);
    });
  });

  describe(`POST ${routePrefix}`, () => {
    if (isUserEntity) {
      it("should fail with invalid user id", async () => {
        const response = await authPost(writeToken, routePrefix).send({
          ...def.create,
          userId: "invalid-user-id",
        });

        expect(response.status).toBe(403);
      });
    }

    it("should create", async () => {
      const response = await authPost(writeToken, routePrefix).send(def.create);

      expect(response.status).toBe(201);
      expect(R.omit(["id"], response.body)).toMatchObject(def.create);
    });
  });

  describe(`PUT ${routePrefix}/:id`, () => {
    it("should fail with invalid id", async () => {
      const response = await authPut(writeToken, `${routePrefix}/invalid-id`).send(def.update);

      expect(response.status).toBe(404);
    });

    it("should update", async () => {
      const createResponse = await authPost(writeToken, routePrefix).send(def.create);
      const createdObj = createResponse.body;

      const response = await authPut(writeToken, `${routePrefix}/${createdObj.id}`).send(
        def.update
      );

      expect(response.status).toBe(200);
      expect(R.omit(["id"], response.body)).toMatchObject(def.update);
    });
  });

  describe(`PATCH ${routePrefix}/:id`, () => {
    it("should fail with invalid id", async () => {
      const response = await authPatch(writeToken, `${routePrefix}/invalid-id`).send(def.patch);

      expect(response.status).toBe(404);
    });

    it("should patch", async () => {
      const createResponse = await authPost(writeToken, routePrefix).send(def.create);
      const createdObj = createResponse.body;

      const response = await authPatch(writeToken, `${routePrefix}/${createdObj.id}`).send(
        def.patch
      );

      expect(response.status).toBe(200);
      expect(R.omit(["id"], response.body)).toMatchObject({ ...def.create, ...def.patch });
    });
  });

  describe(`DELETE ${routePrefix}/:id`, () => {
    it("should fail with invalid id", async () => {
      const response = await authDelete(writeToken, `${routePrefix}/invalid-id`);

      expect(response.status).toBe(404);
    });

    it("should delete", async () => {
      const createResponse = await authPost(writeToken, routePrefix).send(def.create);
      const createdObj = createResponse.body;

      const response = await authDelete(writeToken, `${routePrefix}/${createdObj.id}`);

      expect(response.status).toBe(204);
    });
  });
};
