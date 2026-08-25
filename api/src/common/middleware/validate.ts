import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

export const validate = (
  schema: ZodTypeAny,
  source: "body" | "params" | "query" = "body",
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(result.error);
    }

    const parsed = result.data;

    if (source === "query") {
      Object.assign(req.query, parsed);
    } else {
      req[source] = parsed;
    }

    next();
  };
};
