import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const maybeError = err as { status?: unknown } | null;

  if (
    err instanceof SyntaxError &&
    typeof err === "object" &&
    maybeError !== null &&
    "status" in maybeError
  ) {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON",
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues.map((issue) => issue.message).join("; "),
      },
    });
  }

  if (err instanceof AppError) {
    console.warn(
      JSON.stringify({
        level: "warn",
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
        method: req.method,
        path: req.originalUrl,
        code: err.code,
        message: err.message,
      }),
    );

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  console.error(
    JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
      method: req.method,
      path: req.originalUrl,
      message: "Unexpected server error",
      error: err instanceof Error ? err.message : String(err),
    }),
  );
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
    },
  });
};
