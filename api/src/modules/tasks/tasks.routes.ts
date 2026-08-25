import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { validate } from "../../common/middleware/validate";
import {
  assignTaskSchema,
  completeTaskSchema,
  createTaskSchema,
  notificationsListQuerySchema,
  taskIdParamsSchema,
  taskListQuerySchema,
} from "./task.schemas";
import { TasksService } from "./tasks.service";
import { TaskStatus } from "./entities";

export const buildTasksRouter = (tasksService: TasksService) => {
  const router = Router();

  router.post(
    "/tasks",
    validate(createTaskSchema),
    asyncHandler(async (req, res) => {
      const task = await tasksService.createTask(req.body);
      res.status(201).json({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
      });
    }),
  );

  router.post(
    "/tasks/:idTask/assign",
    validate(taskIdParamsSchema, "params"),
    validate(assignTaskSchema),
    asyncHandler(async (req, res) => {
      const { idTask } = req.params as unknown as { idTask: number };
      const { userIds } = req.body as { userIds: number[] };
      await tasksService.assignUsers(idTask, userIds);
      res.status(200).json({ message: "Task assigned successfully" });
    }),
  );

  router.post(
    "/tasks/:idTask/complete",
    validate(taskIdParamsSchema, "params"),
    validate(completeTaskSchema),
    asyncHandler(async (req, res) => {
      const { idTask } = req.params as unknown as { idTask: number };
      const { userId } = req.body as { userId: number };
      const result = await tasksService.completeTaskForUser(idTask, userId);
      res.status(200).json({
        message: "User participation marked as completed",
        taskArchived: result.archived,
      });
    }),
  );

  router.get(
    "/tasks",
    validate(taskListQuerySchema, "query"),
    asyncHandler(async (req, res) => {
      const { status, page, limit } = taskListQuerySchema.parse(req.query);
      const tasks = await tasksService.listTasks(status, page, limit);
      res.status(200).json(tasks);
    }),
  );

  router.get(
    "/tasks/:idTask",
    validate(taskIdParamsSchema, "params"),
    asyncHandler(async (req, res) => {
      const { idTask } = req.params as unknown as { idTask: number };
      const task = await tasksService.getTaskById(idTask);
      res.status(200).json(task);
    }),
  );

  router.get(
    "/tasks/:idTask/notifications",
    validate(taskIdParamsSchema, "params"),
    validate(notificationsListQuerySchema, "query"),
    asyncHandler(async (req, res) => {
      const { idTask } = req.params as unknown as { idTask: number };
      const { page, limit } = notificationsListQuerySchema.parse(req.query);
      const attempts = await tasksService.listNotificationAttempts(
        idTask,
        page,
        limit,
      );
      res.status(200).json(attempts);
    }),
  );

  return router;
};
