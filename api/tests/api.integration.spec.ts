import "reflect-metadata";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import { DataType, newDb } from "pg-mem";
import { DataSource } from "typeorm";
import { buildApp } from "../src/app";
import { IdempotencyKeyRecord } from "../src/modules/idempotency/entities";
import {
  NotificationAttempt,
  Task,
  TaskAssignment,
} from "../src/modules/tasks/entities";
import { User } from "../src/modules/users/entities";

type MockResponse = { status: number };

describe("GEEST API integration", () => {
  let dataSource: DataSource;

  const buildTestContext = async (
    responses: Array<MockResponse | Error> = [],
  ) => {
    const db = newDb({ autoCreateForeignKeyIndices: true });

    db.public.registerFunction({
      name: "version",
      returns: DataType.text,
      implementation: () => "PostgreSQL 16",
    });

    db.public.registerFunction({
      name: "current_database",
      returns: DataType.text,
      implementation: () => "geest_test",
    });

    dataSource = await db.adapters.createTypeormDataSource({
      type: "postgres",
      entities: [
        User,
        Task,
        TaskAssignment,
        NotificationAttempt,
        IdempotencyKeyRecord,
      ],
      synchronize: true,
    });

    await dataSource.initialize();

    let call = 0;
    const mockClient = {
      post: jest.fn(async () => {
        const current = responses[call] ?? { status: 200 };
        call += 1;
        if (current instanceof Error) {
          throw current;
        }
        return current;
      }),
    };

    const app = buildApp({
      dataSource,
      config: {
        NODE_ENV: "test",
        PORT: 3000,
        API_KEY: "123",
        NOTIFY_URL: "http://fake.local/notify",
        DB_HOST: "127.0.0.1",
        DB_PORT: 5432,
        DB_USERNAME: "postgres",
        DB_PASSWORD: "123",
        DB_NAME: "geest_dev",
      },
      notificationHttpClient: mockClient,
    });

    return { app, mockClient };
  };

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("rejects requests without x-api-key", async () => {
    const { app } = await buildTestContext();
    const response = await request(app).get("/users");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("creates users and enforces validation", async () => {
    const { app } = await buildTestContext();

    const invalid = await request(app)
      .post("/users")
      .set("x-api-key", "123")
      .set("Idempotency-Key", "u-1")
      .send({ name: "Ana", lastName: "Perez", email: "bad-email" });

    expect(invalid.status).toBe(400);

    const created = await request(app)
      .post("/users")
      .set("x-api-key", "123")
      .set("Idempotency-Key", "u-2")
      .send({ name: "Ana", lastName: "Perez", email: "ana@test.com" });

    expect(created.status).toBe(201);
    expect(created.body.id).toBeDefined();
  });

  it("handles idempotent POST replay with identical response", async () => {
    const { app } = await buildTestContext();

    const payload = { name: "Luis", lastName: "Diaz", email: "luis@test.com" };

    const first = await request(app)
      .post("/users")
      .set("x-api-key", "123")
      .set("Idempotency-Key", "same-key")
      .send(payload);

    const second = await request(app)
      .post("/users")
      .set("x-api-key", "123")
      .set("Idempotency-Key", "same-key")
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);

    const users = await request(app).get("/users").set("x-api-key", "123");
    expect(users.body.items).toHaveLength(1);
    expect(users.body.pagination.total).toBe(1);
  });

  it("archives task after all assigned users complete and records notification attempts", async () => {
    const { app, mockClient } = await buildTestContext([
      Object.assign(new Error("timeout"), { response: { status: 503 } }),
      Object.assign(new Error("timeout"), { response: { status: 502 } }),
      { status: 200 },
    ]);

    const u1 = await request(app)
      .post("/users")
      .set("x-api-key", "123")
      .set("Idempotency-Key", "u-a")
      .send({ name: "User", lastName: "One", email: "u1@test.com" });

    const u2 = await request(app)
      .post("/users")
      .set("x-api-key", "123")
      .set("Idempotency-Key", "u-b")
      .send({ name: "User", lastName: "Two", email: "u2@test.com" });

    const task = await request(app)
      .post("/tasks")
      .set("x-api-key", "123")
      .set("Idempotency-Key", "t-a")
      .send({ title: "Implement endpoint", description: "Critical" });

    await request(app)
      .post(`/tasks/${task.body.id}/assign`)
      .set("x-api-key", "123")
      .set("Idempotency-Key", "a-a")
      .send({ userIds: [u1.body.id, u2.body.id] })
      .expect(200);

    await request(app)
      .post(`/tasks/${task.body.id}/complete`)
      .set("x-api-key", "123")
      .set("Idempotency-Key", "c-a")
      .send({ userId: u1.body.id })
      .expect(200);

    await request(app)
      .post(`/tasks/${task.body.id}/complete`)
      .set("x-api-key", "123")
      .set("Idempotency-Key", "c-b")
      .send({ userId: u2.body.id })
      .expect(200);

    const taskDetail = await request(app)
      .get(`/tasks/${task.body.id}`)
      .set("x-api-key", "123");
    expect(taskDetail.body.status).toBe("archived");

    const attempts = await request(app)
      .get(`/tasks/${task.body.id}/notifications`)
      .set("x-api-key", "123");

    expect(attempts.status).toBe(200);
    expect(attempts.body.items).toHaveLength(3);
    expect(attempts.body.pagination.total).toBe(3);
    expect(mockClient.post).toHaveBeenCalledTimes(3);

    const filtered = await request(app)
      .get("/tasks?status=archived")
      .set("x-api-key", "123");

    expect(filtered.status).toBe(200);
    expect(Array.isArray(filtered.body.items)).toBe(true);
    expect(filtered.body.pagination.total).toBe(1);
  });
});
