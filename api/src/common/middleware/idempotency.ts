import { DataSource, QueryFailedError } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { ConflictError, ValidationError } from "../errors/app-error";
import { hashPayload } from "../utils/hash";
import {
  IdempotencyKeyRecord,
  IdempotencyStatus,
} from "../../modules/idempotency/entities";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const replayResponse = (
  res: Response,
  statusCode: number,
  rawBody: string | null,
) => {
  if (!rawBody) {
    return res.sendStatus(statusCode);
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return res.status(statusCode).json(parsed);
  } catch {
    return res.status(statusCode).send(rawBody);
  }
};

export const idempotencyMiddleware = (dataSource: DataSource) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "POST") {
      return next();
    }

    const key = req.header("Idempotency-Key");
    if (!key) {
      throw new ValidationError("Missing Idempotency-Key header");
    }

    const requestHash = hashPayload(req.body ?? {});
    const repository = dataSource.getRepository(IdempotencyKeyRecord);

    let isOwner = false;

    try {
      const insertResult = await repository.insert({
        idempotencyKey: key,
        method: req.method,
        path: req.path,
        requestHash,
        status: IdempotencyStatus.IN_PROGRESS,
      });

      if ((insertResult.identifiers?.length ?? 0) > 0) {
        isOwner = true;
        res.locals.idempotencyRecordId = insertResult.identifiers[0]
          .id as number;
      }
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { driverError?: { code?: string } }).driverError?.code ===
          "23505"
      ) {
        isOwner = false;
      } else {
        throw error;
      }
    }

    let record = await repository.findOne({
      where: {
        idempotencyKey: key,
        method: req.method,
        path: req.path,
      },
    });

    if (!record) {
      throw new ConflictError(
        "Unable to create or fetch idempotency record",
        "IDEMPOTENCY_ERROR",
      );
    }

    if (record.requestHash !== requestHash) {
      throw new ConflictError(
        "Idempotency-Key has already been used with a different request payload",
        "IDEMPOTENCY_KEY_REUSED",
      );
    }

    if (!isOwner) {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (
          record.status === IdempotencyStatus.COMPLETED &&
          record.statusCode !== null
        ) {
          return replayResponse(res, record.statusCode, record.responseBody);
        }

        await sleep(100);
        const latest = await repository.findOne({ where: { id: record.id } });
        if (latest) {
          record = latest;
        }
      }

      throw new ConflictError(
        "Original request is still being processed for this Idempotency-Key",
        "IDEMPOTENCY_IN_PROGRESS",
      );
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = ((body: unknown) => {
      res.locals.idempotencyResponseBody = body;
      res.locals.idempotencyResponseCaptured = true;
      return originalJson(body);
    }) as Response["json"];

    res.send = ((body: unknown) => {
      if (!res.locals.idempotencyResponseCaptured) {
        res.locals.idempotencyResponseBody = body;
      }
      return originalSend(body as never);
    }) as Response["send"];

    res.on("finish", () => {
      const payload = res.locals.idempotencyResponseBody;
      const responseBody =
        payload === undefined
          ? null
          : typeof payload === "string"
            ? payload
            : JSON.stringify(payload);

      if (res.locals.idempotencyRecordId) {
        void repository.update(res.locals.idempotencyRecordId, {
          status: IdempotencyStatus.COMPLETED,
          statusCode: res.statusCode,
          responseBody,
        });
      }
    });

    return next();
  };
};
