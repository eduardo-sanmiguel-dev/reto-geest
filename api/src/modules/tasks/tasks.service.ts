import { DataSource, In } from "typeorm";
import { buildPaginationMeta } from "../../common/pagination";
import { NotFoundError, ValidationError } from "../../common/errors/app-error";
import { NotificationService } from "./notification.service";
import {
  NotificationAttempt,
  Task,
  TaskAssignment,
  TaskStatus,
} from "./entities";
import { User } from "../users/entities";

export class TasksService {
  private readonly dataSource: DataSource;
  private readonly notificationService: NotificationService;

  constructor(
    dataSource: DataSource,
    notificationService: NotificationService,
  ) {
    this.dataSource = dataSource;
    this.notificationService = notificationService;
  }

  async createTask(
    input: Pick<Task, "title"> & Partial<Pick<Task, "description">>,
  ): Promise<Task> {
    const repo = this.dataSource.getRepository(Task);
    const task = repo.create({
      title: input.title,
      description: input.description ?? null,
      status: TaskStatus.OPEN,
      archivedAt: null,
    });
    return repo.save(task);
  }

  async assignUsers(taskId: number, userIds: number[]): Promise<void> {
    const normalizedUserIds = [...new Set(userIds)];

    await this.dataSource.transaction(async (manager) => {
      const task = await manager.findOne(Task, { where: { id: taskId } });
      if (!task) {
        throw new NotFoundError("Task not found");
      }

      const users = await manager.find(User, {
        where: { id: In(normalizedUserIds) },
      });
      if (users.length !== normalizedUserIds.length) {
        throw new NotFoundError("One or more users were not found");
      }

      const existingAssignments = await manager.find(TaskAssignment, {
        where: {
          taskId,
          userId: In(normalizedUserIds),
        },
      });

      const existingUserIds = new Set(
        existingAssignments.map((assignment) => assignment.userId),
      );
      const toInsert = normalizedUserIds
        .filter((userId) => !existingUserIds.has(userId))
        .map((userId) =>
          manager.create(TaskAssignment, {
            taskId,
            userId,
            completedAt: null,
          }),
        );

      if (toInsert.length > 0) {
        await manager.save(TaskAssignment, toInsert);
      }
    });
  }

  async completeTaskForUser(
    taskId: number,
    userId: number,
  ): Promise<{ archived: boolean }> {
    let shouldNotify = false;
    let archivedTask: Task | null = null;

    await this.dataSource.transaction(async (manager) => {
      const task = await manager
        .getRepository(Task)
        .createQueryBuilder("task")
        .setLock("pessimistic_write")
        .where("task.id = :taskId", { taskId })
        .getOne();

      if (!task) {
        throw new NotFoundError("Task not found");
      }

      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const assignment = await manager
        .getRepository(TaskAssignment)
        .createQueryBuilder("assignment")
        .setLock("pessimistic_write")
        .where("assignment.taskId = :taskId", { taskId })
        .andWhere("assignment.userId = :userId", { userId })
        .getOne();

      if (!assignment) {
        throw new ValidationError("User is not assigned to this task");
      }

      if (!assignment.completedAt) {
        assignment.completedAt = new Date();
        await manager.save(TaskAssignment, assignment);
      }

      const incompleteCount = await manager
        .getRepository(TaskAssignment)
        .createQueryBuilder("assignment")
        .where("assignment.taskId = :taskId", { taskId })
        .andWhere("assignment.completedAt IS NULL")
        .getCount();

      if (incompleteCount === 0 && task.status !== TaskStatus.ARCHIVED) {
        task.status = TaskStatus.ARCHIVED;
        task.archivedAt = new Date();
        archivedTask = await manager.save(Task, task);
        shouldNotify = true;
      }
    });

    if (shouldNotify && archivedTask) {
      await this.notificationService.notifyTaskArchived(archivedTask);
    }

    return { archived: shouldNotify };
  }

  async listTasks(status: TaskStatus | undefined, page: number, limit: number) {
    const [tasks, total] = await this.dataSource
      .getRepository(Task)
      .findAndCount({
        where: status ? { status } : undefined,
        relations: {
          assignments: {
            user: true,
          },
        },
        order: {
          id: "ASC",
        },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        users: task.assignments.map((assignment) => ({
          id: assignment.user.id,
          name: assignment.user.name,
          lastName: assignment.user.lastName,
          email: assignment.user.email,
          completed: Boolean(assignment.completedAt),
        })),
      })),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async getTaskById(taskId: number) {
    const task = await this.dataSource.getRepository(Task).findOne({
      where: { id: taskId },
      relations: {
        assignments: {
          user: true,
        },
      },
    });

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      archivedAt: task.archivedAt,
      users: task.assignments.map((assignment) => ({
        id: assignment.user.id,
        name: assignment.user.name,
        lastName: assignment.user.lastName,
        email: assignment.user.email,
        completed: Boolean(assignment.completedAt),
        completedAt: assignment.completedAt,
      })),
    };
  }

  async listNotificationAttempts(taskId: number, page: number, limit: number) {
    const task = await this.dataSource
      .getRepository(Task)
      .findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundError("Task not found");
    }

    const [attempts, total] = await this.dataSource
      .getRepository(NotificationAttempt)
      .findAndCount({
        where: { taskId },
        order: {
          attemptNumber: "ASC",
        },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items: attempts.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        timestamp: attempt.createdAt,
        httpStatus: attempt.httpStatus,
        success: attempt.success,
        errorMessage: attempt.errorMessage,
      })),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }
}
