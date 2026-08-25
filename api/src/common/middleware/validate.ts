import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

export const validate = (
  schema: ZodTypeAny,
  source: "body" | "params" | "query" = "body",
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[source]);

    if (source === "query") {
      Object.assign(req.query, parsed);
    } else {
      req[source] = parsed;
    }

    next();
  };
};
