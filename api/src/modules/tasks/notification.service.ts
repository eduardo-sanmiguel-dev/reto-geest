import axios, { AxiosError } from "axios";
import { DataSource } from "typeorm";
import type { Env } from "../../config/env";
import { NotificationAttempt, Task } from "./entities";

type HttpClient = {
  post: (
    url: string,
    body: unknown,
    options?: { timeout?: number },
  ) => Promise<{ status: number }>;
};

export class NotificationService {
  private readonly dataSource: DataSource;
  private readonly config: Pick<Env, "NOTIFY_URL">;
  private readonly httpClient: HttpClient;

  constructor(
    dataSource: DataSource,
    config: Pick<Env, "NOTIFY_URL">,
    httpClient: HttpClient = axios,
  ) {
    this.dataSource = dataSource;
    this.config = config;
    this.httpClient = httpClient;
  }

  private shouldRetry(error: unknown): boolean {
    if (!error || !(error instanceof AxiosError)) {
      return true;
    }

    if (!error.response) {
      return true;
    }

    return error.response.status >= 500;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async notifyTaskArchived(task: Task): Promise<void> {
    const attemptsRepo = this.dataSource.getRepository(NotificationAttempt);

    const payload = {
      taskId: task.id,
      title: task.title,
      archivedAt: (task.archivedAt ?? new Date()).toISOString(),
    };

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      let httpStatus: number | null = null;
      let success = false;
      let errorMessage: string | null = null;

      try {
        const response = await this.httpClient.post(
          this.config.NOTIFY_URL,
          payload,
          { timeout: 3000 },
        );
        httpStatus = response.status;
        success = response.status >= 200 && response.status < 300;

        await attemptsRepo.save(
          attemptsRepo.create({
            taskId: task.id,
            attemptNumber: attempt,
            httpStatus,
            success,
            errorMessage,
          }),
        );

        if (success || (httpStatus >= 400 && httpStatus < 500)) {
          return;
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        httpStatus = axiosError.response?.status ?? null;
        success = false;
        errorMessage = axiosError.message;

        await attemptsRepo.save(
          attemptsRepo.create({
            taskId: task.id,
            attemptNumber: attempt,
            httpStatus,
            success,
            errorMessage,
          }),
        );

        if (!this.shouldRetry(error)) {
          return;
        }
      }

      if (attempt < 3) {
        const backoff = 300 * 2 ** (attempt - 1);
        await this.wait(backoff);
      }
    }
  }
}
