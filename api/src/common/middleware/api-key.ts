import { NextFunction, Request, Response } from "express";
import type { Env } from "../../config/env";
import { UnauthorizedError } from "../errors/app-error";

export const apiKeyMiddleware = (config: Pick<Env, "API_KEY">) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (
      req.path === "/docs" ||
      req.path.startsWith("/docs/") ||
      req.path === "/favicon.ico" ||
      req.path.startsWith("/.well-known/")
    ) {
      return next();
    }

    const apiKey = req.header("x-api-key");
    if (!apiKey || apiKey !== config.API_KEY) {
      throw new UnauthorizedError("Missing or invalid x-api-key header");
    }

    next();
  };
};
