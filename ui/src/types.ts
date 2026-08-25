export type User = {
  id: number;
  name: string;
  lastName: string;
  email: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type UserWithPendingTasks = User & {
  pendingTasks: Array<{
    id: number;
    title: string;
    status: "open" | "archived";
  }>;
};

export type TaskStatus = "open" | "archived";

export type TaskSummary = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  users: Array<{
    id: number;
    name: string;
    lastName: string;
    email: string;
    completed: boolean;
  }>;
};

export type TaskDetail = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  archivedAt: string | null;
  users: Array<{
    id: number;
    name: string;
    lastName: string;
    email: string;
    completed: boolean;
    completedAt: string | null;
  }>;
};

export type NotificationAttempt = {
  id: number;
  attemptNumber: number;
  timestamp: string;
  httpStatus: number | null;
  success: boolean;
  errorMessage: string | null;
};

export type UserTaskList = {
  user: User;
  tasks: Array<{
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    userCompleted: boolean;
  }>;
  pagination: PaginationMeta;
};

export type ApiErrorShape = {
  error: {
    code: string;
    message: string;
  };
};
