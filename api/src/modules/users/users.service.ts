import { DataSource } from "typeorm";
import { buildPaginationMeta } from "../../common/pagination";
import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { TaskAssignment, TaskStatus } from "../tasks/entities";
import { User } from "./entities";

export class UsersService {
  private readonly dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  async createUser(
    input: Pick<User, "name" | "lastName" | "email">,
  ): Promise<User> {
    const repo = this.dataSource.getRepository(User);

    const existing = await repo.findOne({ where: { email: input.email } });
    if (existing) {
      throw new ConflictError(
        "Email is already registered",
        "EMAIL_ALREADY_EXISTS",
      );
    }

    const user = repo.create(input);
    return repo.save(user);
  }

  async listUsersWithPendingTasks(page: number, limit: number) {
    const [users, total] = await this.dataSource
      .getRepository(User)
      .findAndCount({
        relations: {
          assignments: {
            task: true,
          },
        },
        order: {
          id: "ASC",
        },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items: users.map((user) => ({
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        pendingTasks: user.assignments
          .filter(
            (assignment) =>
              assignment.task.status === TaskStatus.OPEN &&
              !assignment.completedAt,
          )
          .map((assignment) => ({
            id: assignment.task.id,
            title: assignment.task.title,
            status: assignment.task.status,
          })),
      })),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async listTasksForUser(userId: number, page: number, limit: number) {
    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const [assignments, total] = await this.dataSource
      .getRepository(TaskAssignment)
      .findAndCount({
        where: { userId },
        relations: { task: true },
        order: { id: "ASC" },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
      },
      tasks: assignments.map((assignment) => ({
        id: assignment.task.id,
        title: assignment.task.title,
        description: assignment.task.description,
        status: assignment.task.status,
        userCompleted: Boolean(assignment.completedAt),
      })),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }
}
