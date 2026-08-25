import axios from "axios";
import type {
  ApiErrorShape,
  NotificationAttempt,
  PaginatedResponse,
  TaskDetail,
  TaskStatus,
  TaskSummary,
  UserTaskList,
  UserWithPendingTasks,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const API_KEY = import.meta.env.VITE_API_KEY ?? "123";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
  },
});

const buildIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const post = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await client.post<T>(url, body, {
    headers: {
      "Idempotency-Key": buildIdempotencyKey(),
    },
  });

  return response.data;
};

export const mapApiError = (error: unknown): string => {
  if (axios.isAxiosError<ApiErrorShape>(error)) {
    const message = error.response?.data?.error?.message;
    if (message) {
      return message;
    }
  }

  return "Error inesperado del cliente. Intenta de nuevo.";
};

export const api = {
  health: () =>
    client
      .get<{ status: string; database: string }>("/health")
      .then((r) => r.data),

  createUser: (payload: { name: string; lastName: string; email: string }) =>
    post<{ id: number; name: string; lastName: string; email: string }>(
      "/users",
      payload,
    ),

  listUsers: (page = 1, limit = 10) =>
    client
      .get<PaginatedResponse<UserWithPendingTasks>>("/users", {
        params: { page, limit },
      })
      .then((r) => r.data),

  getUserTasks: (userId: number, page = 1, limit = 10) =>
    client
      .get<UserTaskList>(`/users/${userId}/tasks`, {
        params: { page, limit },
      })
      .then((r) => r.data),

  createTask: (payload: { title: string; description?: string }) =>
    post<{
      id: number;
      title: string;
      description: string | null;
      status: TaskStatus;
    }>("/tasks", payload),

  listTasks: (status?: TaskStatus | "all", page = 1, limit = 10) =>
    client
      .get<PaginatedResponse<TaskSummary>>("/tasks", {
        params: {
          ...(status && status !== "all" ? { status } : {}),
          page,
          limit,
        },
      })
      .then((r) => r.data),

  getTaskById: (taskId: number) =>
    client.get<TaskDetail>(`/tasks/${taskId}`).then((r) => r.data),

  assignTask: (taskId: number, userIds: number[]) =>
    post<{ message: string }>(`/tasks/${taskId}/assign`, { userIds }),

  completeTask: (taskId: number, userId: number) =>
    post<{ message: string; taskArchived: boolean }>(
      `/tasks/${taskId}/complete`,
      { userId },
    ),

  getNotifications: (taskId: number, page = 1, limit = 10) =>
    client
      .get<PaginatedResponse<NotificationAttempt>>(
        `/tasks/${taskId}/notifications`,
        {
          params: { page, limit },
        },
      )
      .then((r) => r.data),
};
