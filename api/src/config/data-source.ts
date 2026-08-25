import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env";
import { IdempotencyKeyRecord } from "../modules/idempotency/entities";
import {
  NotificationAttempt,
  Task,
  TaskAssignment,
} from "../modules/tasks/entities";
import { User } from "../modules/users/entities";

export const buildDataSource = () => {
  return new DataSource({
    type: "postgres",
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: [
      User,
      Task,
      TaskAssignment,
      NotificationAttempt,
      IdempotencyKeyRecord,
    ],
    migrations: ["dist/database/migrations/*.js"],
    synchronize: false,
    logging: false,
  });
};

export const appDataSource = buildDataSource();
