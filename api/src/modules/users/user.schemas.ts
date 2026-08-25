import { z } from "zod";
import { paginationQuerySchema } from "../../common/pagination";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120),
  lastName: z.string().trim().min(1, "lastName is required").max(120),
  email: z.string().trim().email("email must be valid").max(255),
});

export const userIdParamsSchema = z.object({
  idUser: z.coerce.number().int().positive(),
});

export const usersListQuerySchema = paginationQuerySchema;
export const userTasksListQuerySchema = paginationQuerySchema;
