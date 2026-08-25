import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  const message = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Configuracion de entorno invalida: ${message}`);
}

const { PORT } = parsedEnv.data;

const notificationSchema = z.object({
  taskId: z.number().int().positive(),
  title: z.string().trim().min(1),
  archivedAt: z.string().datetime({ offset: true }),
});

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/notify", (req: Request, res: Response) => {
  const result = notificationSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: result.error.issues.map((issue) => issue.message).join("; "),
      },
    });
  }

  // Log estructurado para trazabilidad de notificaciones entrantes.
  console.log("[notification-api] payload recibido:", result.data);

  return res.status(200).json({
    message: "Notificacion recibida y validada",
  });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "JSON invalido en el body",
      },
    });
  }

  console.error("[notification-api] error interno:", err);
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
    },
  });
});

app.listen(PORT, () => {
  console.log(`[notification-api] escuchando en http://localhost:${PORT}`);
});
