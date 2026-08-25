import { z } from "zod";
import { TaskStatus } from "./entities";
import { paginationQuerySchema } from "../../common/pagination";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "title is required").max(255),
  description: z.string().trim().max(5000).optional(),
});

export const taskIdParamsSchema = z.object({
  idTask: z.coerce.number().int().positive(),
});

export const assignTaskSchema = z.object({
  userIds: z
    .array(z.number().int().positive())
    .min(1, "userIds must contain at least one element")
    .max(500),
});

export const completeTaskSchema = z.object({
  userId: z.number().int().positive(),
});

export const taskListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(TaskStatus).optional(),
});

export const notificationsListQuerySchema = paginationQuerySchema;
