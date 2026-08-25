import cors from "cors";
import { randomUUID } from "crypto";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { DataSource } from "typeorm";
import type { Env } from "./config/env";
import { apiKeyMiddleware } from "./common/middleware/api-key";
import { errorHandler } from "./common/middleware/error-handler";
import { idempotencyMiddleware } from "./common/middleware/idempotency";
import { NotificationService } from "./modules/tasks/notification.service";
import { buildTasksRouter } from "./modules/tasks/tasks.routes";
import { TasksService } from "./modules/tasks/tasks.service";
import { buildUsersRouter } from "./modules/users/users.routes";
import { UsersService } from "./modules/users/users.service";

type NotificationHttpClient = {
  post: (
    url: string,
    body: unknown,
    options?: { timeout?: number },
  ) => Promise<{ status: number }>;
};

type BuildAppDependencies = {
  dataSource: DataSource;
  config: Env;
  notificationHttpClient?: NotificationHttpClient;
};

export const buildApp = ({
  dataSource,
  config,
  notificationHttpClient,
}: BuildAppDependencies) => {
  const app = express();

  const usersService = new UsersService(dataSource);
  const notificationService = new NotificationService(
    dataSource,
    config,
    notificationHttpClient,
  );
  const tasksService = new TasksService(dataSource, notificationService);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(cors());
  app.use((req, res, next) => {
    const requestId = req.header("x-request-id") ?? randomUUID();
    req.requestId = requestId;
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });
  morgan.token(
    "request-id",
    (req) => (req as { requestId?: string }).requestId ?? "-",
  );
  app.use(
    morgan((tokens, req, res) => {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: tokens["request-id"](req, res),
        method: tokens.method(req, res),
        path: tokens.url(req, res),
        status: Number(tokens.status(req, res)),
        responseTimeMs: Number(tokens["response-time"](req, res)),
        contentLength: tokens.res(req, res, "content-length") ?? "0",
      });
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(apiKeyMiddleware(config));
  app.use(idempotencyMiddleware(dataSource));

  app.get("/health", async (_req, res, next) => {
    try {
      await dataSource.query("SELECT 1");
      res.status(200).json({ status: "ok", database: "up" });
    } catch (error) {
      next(error);
    }
  });

  app.use(buildUsersRouter(usersService));
  app.use(buildTasksRouter(tasksService));

  app.use(errorHandler);

  return app;
};
