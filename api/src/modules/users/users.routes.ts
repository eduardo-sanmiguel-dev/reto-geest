import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { validate } from "../../common/middleware/validate";
import { UsersService } from "./users.service";
import {
  createUserSchema,
  userIdParamsSchema,
  usersListQuerySchema,
  userTasksListQuerySchema,
} from "./user.schemas";

export const buildUsersRouter = (usersService: UsersService) => {
  const router = Router();

  router.post(
    "/users",
    validate(createUserSchema),
    asyncHandler(async (req, res) => {
      const user = await usersService.createUser(req.body);
      res.status(201).json({
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
      });
    }),
  );

  router.get(
    "/users",
    validate(usersListQuerySchema, "query"),
    asyncHandler(async (req, res) => {
      const { page, limit } = usersListQuerySchema.parse(req.query);
      const users = await usersService.listUsersWithPendingTasks(page, limit);
      res.status(200).json(users);
    }),
  );

  router.get(
    "/users/:idUser/tasks",
    validate(userIdParamsSchema, "params"),
    validate(userTasksListQuerySchema, "query"),
    asyncHandler(async (req, res) => {
      const { idUser } = req.params as unknown as { idUser: number };
      const { page, limit } = userTasksListQuerySchema.parse(req.query);
      const response = await usersService.listTasksForUser(idUser, page, limit);
      res.status(200).json(response);
    }),
  );

  return router;
};
