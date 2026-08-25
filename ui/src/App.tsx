import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, mapApiError } from "./lib/api";
import type {
  NotificationAttempt,
  PaginationMeta,
  TaskDetail,
  TaskStatus,
  TaskSummary,
  UserTaskList,
  UserWithPendingTasks,
} from "./types";

type AsyncState = "idle" | "loading";
type AppTab = "creacion" | "usuarios" | "asignacion";
const PAGE_LIMIT = 10;
const TAB_ORDER: AppTab[] = ["creacion", "usuarios", "asignacion"];

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const formatDate = (iso: string | null) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
};

const formatTaskStatus = (status: TaskStatus) => {
  return status === "open" ? "abierta" : "archivada";
};

type PaginationControlsProps = {
  pagination: PaginationMeta;
  onPrev: () => void;
  onNext: () => void;
};

const PaginationControls = ({
  pagination,
  onPrev,
  onNext,
}: PaginationControlsProps) => {
  return (
    <div className="row between pagination-row">
      <span className="meta">
        Pagina {pagination.page} de {pagination.totalPages} | Total:{" "}
        {pagination.total}
      </span>
      <div className="row">
        <button
          type="button"
          className="ghost-btn"
          onClick={onPrev}
          disabled={!pagination.hasPrev}
        >
          Anterior
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={onNext}
          disabled={!pagination.hasNext}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [busy, setBusy] = useState<AsyncState>("idle");
  const [flash, setFlash] = useState<{
    kind: "ok" | "error";
    message: string;
  } | null>(null);

  const [users, setUsers] = useState<UserWithPendingTasks[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [usersPagination, setUsersPagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);
  const [tasksPagination, setTasksPagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);
  const [notificationsPagination, setNotificationsPagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);
  const [userTasksPagination, setUserTasksPagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);

  const [usersPage, setUsersPage] = useState(1);
  const [tasksPage, setTasksPage] = useState(1);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [userTasksPage, setUserTasksPage] = useState(1);
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | "all">(
    "all",
  );

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const [selectedUserTasks, setSelectedUserTasks] =
    useState<UserTaskList | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] =
    useState<TaskDetail | null>(null);
  const [taskNotifications, setTaskNotifications] = useState<
    NotificationAttempt[]
  >([]);

  const [userForm, setUserForm] = useState({
    name: "",
    lastName: "",
    email: "",
  });
  const [taskForm, setTaskForm] = useState({ title: "", description: "" });
  const [assignUserIds, setAssignUserIds] = useState<number[]>([]);
  const [completeUserId, setCompleteUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("creacion");
  const tabRefs = useRef<Record<AppTab, HTMLButtonElement | null>>({
    creacion: null,
    usuarios: null,
    asignacion: null,
  });

  const canAssign = selectedTaskId !== null && assignUserIds.length > 0;
  const canComplete = selectedTaskId !== null && completeUserId !== null;

  const currentTaskUsers = useMemo(() => {
    if (!selectedTaskDetail) return [];
    return selectedTaskDetail.users;
  }, [selectedTaskDetail]);

  const showError = (error: unknown) => {
    setFlash({ kind: "error", message: mapApiError(error) });
  };

  const refreshUsers = async () => {
    const data = await api.listUsers(usersPage, PAGE_LIMIT);
    setUsers(data.items);
    setUsersPagination(data.pagination);
  };

  const refreshTasks = async () => {
    const data = await api.listTasks(taskStatusFilter, tasksPage, PAGE_LIMIT);
    setTasks(data.items);
    setTasksPagination(data.pagination);
  };

  const refreshTaskDependentPanels = async (taskId: number) => {
    const [detail, notifications] = await Promise.all([
      api.getTaskById(taskId),
      api.getNotifications(taskId, notificationsPage, PAGE_LIMIT),
    ]);
    setSelectedTaskDetail(detail);
    setTaskNotifications(notifications.items);
    setNotificationsPagination(notifications.pagination);
    setCompleteUserId(null);
    setAssignUserIds([]);
  };

  const loadInitialData = async () => {
    setBusy("loading");
    try {
      await Promise.all([refreshUsers(), refreshTasks(), api.health()]);
      setFlash({ kind: "ok", message: "Conectado a la API correctamente." });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("idle");
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    void refreshUsers().catch(showError);
  }, [usersPage]);

  useEffect(() => {
    void refreshTasks().catch(showError);
  }, [taskStatusFilter, tasksPage]);

  useEffect(() => {
    if (!selectedUserId) return;
    void (async () => {
      try {
        const data = await api.getUserTasks(
          selectedUserId,
          userTasksPage,
          PAGE_LIMIT,
        );
        setSelectedUserTasks(data);
        setUserTasksPagination(data.pagination);
      } catch (error) {
        showError(error);
      }
    })();
  }, [selectedUserId, userTasksPage]);

  useEffect(() => {
    if (!selectedTaskId) return;
    void (async () => {
      try {
        await refreshTaskDependentPanels(selectedTaskId);
      } catch (error) {
        showError(error);
      }
    })();
  }, [selectedTaskId, notificationsPage]);

  const onCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("loading");
    try {
      await api.createUser({
        name: userForm.name,
        lastName: userForm.lastName,
        email: userForm.email,
      });
      setUserForm({ name: "", lastName: "", email: "" });
      await refreshUsers();
      setFlash({ kind: "ok", message: "Usuario creado." });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("idle");
    }
  };

  const onCreateTask = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("loading");
    try {
      const created = await api.createTask({
        title: taskForm.title,
        description: taskForm.description || undefined,
      });
      setTaskForm({ title: "", description: "" });
      setSelectedTaskId(created.id);
      await refreshTasks();
      await refreshTaskDependentPanels(created.id);
      setFlash({ kind: "ok", message: "Tarea creada." });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("idle");
    }
  };

  const onSelectUser = async (userId: number) => {
    setSelectedUserId(userId);
    setUserTasksPage(1);
    setBusy("loading");
    try {
      const data = await api.getUserTasks(userId, 1, PAGE_LIMIT);
      setSelectedUserTasks(data);
      setUserTasksPagination(data.pagination);
    } catch (error) {
      showError(error);
    } finally {
      setBusy("idle");
    }
  };

  const onSelectTask = async (taskId: number) => {
    setSelectedTaskId(taskId);
    setNotificationsPage(1);
    setBusy("loading");
    try {
      await refreshTaskDependentPanels(taskId);
    } catch (error) {
      showError(error);
    } finally {
      setBusy("idle");
    }
  };

  const onAssignUsers = async () => {
    if (!selectedTaskId) return;
    setBusy("loading");
    try {
      await api.assignTask(selectedTaskId, assignUserIds);
      await Promise.all([
        refreshTasks(),
        refreshTaskDependentPanels(selectedTaskId),
        refreshUsers(),
      ]);
      setFlash({ kind: "ok", message: "Usuarios asignados a la tarea." });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("idle");
    }
  };

  const onCompletePart = async () => {
    if (!selectedTaskId || !completeUserId) return;
    setBusy("loading");
    try {
      const result = await api.completeTask(selectedTaskId, completeUserId);
      await Promise.all([
        refreshTasks(),
        refreshTaskDependentPanels(selectedTaskId),
        refreshUsers(),
      ]);
      setFlash({
        kind: "ok",
        message: result.taskArchived
          ? "Tarea archivada automaticamente."
          : "Finalizacion registrada.",
      });
    } catch (error) {
      showError(error);
    } finally {
      setBusy("idle");
    }
  };

  const onTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tab: AppTab,
  ) => {
    const currentIndex = TAB_ORDER.indexOf(tab);
    if (currentIndex < 0) return;

    let nextTab: AppTab | null = null;
    if (event.key === "ArrowRight") {
      nextTab = TAB_ORDER[(currentIndex + 1) % TAB_ORDER.length];
    } else if (event.key === "ArrowLeft") {
      nextTab =
        TAB_ORDER[(currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length];
    } else if (event.key === "Home") {
      nextTab = TAB_ORDER[0];
    } else if (event.key === "End") {
      nextTab = TAB_ORDER[TAB_ORDER.length - 1];
    }

    if (nextTab) {
      event.preventDefault();
      setActiveTab(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  };

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">GEEST Panel de Trabajo</p>
          <h1>Panel Operativo</h1>
          <p className="subtitle">
            Crea usuarios y tareas, asigna personas, registra finalizaciones y
            revisa notificaciones de archivado.
          </p>
        </div>
        <button
          className="ghost-btn"
          onClick={() => void loadInitialData()}
          disabled={busy === "loading"}
        >
          {busy === "loading" ? "Actualizando..." : "Actualizar"}
        </button>
      </header>

      {flash && <div className={`flash ${flash.kind}`}>{flash.message}</div>}

      <nav className="tabs" role="tablist" aria-label="Secciones principales">
        <button
          type="button"
          className={`tab-btn ${activeTab === "creacion" ? "active" : ""}`}
          onClick={() => setActiveTab("creacion")}
          onKeyDown={(event) => onTabKeyDown(event, "creacion")}
          ref={(element) => {
            tabRefs.current.creacion = element;
          }}
          id="tab-creacion"
          role="tab"
          aria-selected={activeTab === "creacion"}
          aria-controls="panel-creacion"
          tabIndex={activeTab === "creacion" ? 0 : -1}
        >
          1. Creacion
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "usuarios" ? "active" : ""}`}
          onClick={() => setActiveTab("usuarios")}
          onKeyDown={(event) => onTabKeyDown(event, "usuarios")}
          ref={(element) => {
            tabRefs.current.usuarios = element;
          }}
          id="tab-usuarios"
          role="tab"
          aria-selected={activeTab === "usuarios"}
          aria-controls="panel-usuarios"
          tabIndex={activeTab === "usuarios" ? 0 : -1}
        >
          2. Usuarios y Tareas
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "asignacion" ? "active" : ""}`}
          onClick={() => setActiveTab("asignacion")}
          onKeyDown={(event) => onTabKeyDown(event, "asignacion")}
          ref={(element) => {
            tabRefs.current.asignacion = element;
          }}
          id="tab-asignacion"
          role="tab"
          aria-selected={activeTab === "asignacion"}
          aria-controls="panel-asignacion"
          tabIndex={activeTab === "asignacion" ? 0 : -1}
        >
          3. Asignacion y Operaciones
        </button>
      </nav>

      <main className="modules-stack">
        {activeTab === "creacion" && (
          <section
            className="module-block rise"
            id="panel-creacion"
            role="tabpanel"
            aria-labelledby="tab-creacion"
          >
            <p className="eyebrow">Seccion 1</p>
            <h2 className="module-title">Creacion de Usuarios y Tareas</h2>
            <p className="module-subtitle">
              Alta inicial de datos para comenzar a operar.
            </p>

            <div className="grid module-grid">
              <section className="card">
                <h2>Crear Usuario</h2>
                <form onSubmit={onCreateUser} className="stack">
                  <input
                    placeholder="Nombre"
                    value={userForm.name}
                    onChange={(e) =>
                      setUserForm((v) => ({ ...v, name: e.target.value }))
                    }
                    required
                  />
                  <input
                    placeholder="Apellido"
                    value={userForm.lastName}
                    onChange={(e) =>
                      setUserForm((v) => ({ ...v, lastName: e.target.value }))
                    }
                    required
                  />
                  <input
                    placeholder="Correo electronico"
                    type="email"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm((v) => ({ ...v, email: e.target.value }))
                    }
                    required
                  />
                  <button type="submit" disabled={busy === "loading"}>
                    Crear usuario
                  </button>
                </form>
              </section>

              <section className="card">
                <h2>Crear Tarea</h2>
                <form onSubmit={onCreateTask} className="stack">
                  <input
                    placeholder="Titulo de la tarea"
                    value={taskForm.title}
                    onChange={(e) =>
                      setTaskForm((v) => ({ ...v, title: e.target.value }))
                    }
                    required
                  />
                  <textarea
                    placeholder="Descripcion (opcional)"
                    value={taskForm.description}
                    onChange={(e) =>
                      setTaskForm((v) => ({
                        ...v,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                  <button type="submit" disabled={busy === "loading"}>
                    Crear tarea
                  </button>
                </form>
              </section>
            </div>
          </section>
        )}

        {activeTab === "usuarios" && (
          <section
            className="module-block rise"
            id="panel-usuarios"
            role="tabpanel"
            aria-labelledby="tab-usuarios"
          >
            <p className="eyebrow">Seccion 2</p>
            <h2 className="module-title">Usuarios y Sus Tareas Asignadas</h2>
            <p className="module-subtitle">
              Consulta de usuarios y sus tareas relacionadas.
            </p>

            <div className="grid module-grid">
              <section className="card">
                <div className="row between">
                  <h2>Usuarios</h2>
                  <span className="meta">{usersPagination.total} total</span>
                </div>
                <PaginationControls
                  pagination={usersPagination}
                  onPrev={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                  onNext={() => setUsersPage((prev) => prev + 1)}
                />
                <div className="list-panel">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      className={`list-item ${selectedUserId === user.id ? "active" : ""}`}
                      onClick={() => void onSelectUser(user.id)}
                    >
                      <div>
                        <strong>
                          {user.name} {user.lastName}
                        </strong>
                        <p>{user.email}</p>
                      </div>
                      <span className="pill">
                        Pendientes: {user.pendingTasks.length}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card">
                <h2>Tareas del Usuario Seleccionado</h2>
                {!selectedUserTasks ? (
                  <p className="empty">
                    Selecciona un usuario para ver sus tareas asignadas.
                  </p>
                ) : (
                  <>
                    <p className="meta">
                      {selectedUserTasks.user.name}{" "}
                      {selectedUserTasks.user.lastName}
                    </p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Tarea</th>
                            <th>Estado</th>
                            <th>Usuario completo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUserTasks.tasks.map((task) => (
                            <tr key={task.id}>
                              <td>{task.title}</td>
                              <td>{formatTaskStatus(task.status)}</td>
                              <td>{task.userCompleted ? "Si" : "No"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationControls
                      pagination={userTasksPagination}
                      onPrev={() =>
                        setUserTasksPage((prev) => Math.max(1, prev - 1))
                      }
                      onNext={() => setUserTasksPage((prev) => prev + 1)}
                    />
                  </>
                )}
              </section>
            </div>
          </section>
        )}

        {activeTab === "asignacion" && (
          <section
            className="module-block rise section-ops"
            id="panel-asignacion"
            role="tabpanel"
            aria-labelledby="tab-asignacion"
          >
            <p className="eyebrow">Seccion 3</p>
            <h2 className="module-title">Asignacion de Usuarios a la Tarea</h2>
            <p className="module-subtitle">
              Seleccion de tareas y ejecucion de operaciones sobre la tarea
              activa.
            </p>

            <div className="grid module-grid">
              <section className="card wide section-ops-list-card">
                <div className="row between task-filter-row">
                  <h2>Tareas</h2>
                  <select
                    value={taskStatusFilter}
                    onChange={(e) => {
                      setTasksPage(1);
                      setTaskStatusFilter(e.target.value as TaskStatus | "all");
                    }}
                  >
                    <option value="all">Todas</option>
                    <option value="open">Abiertas</option>
                    <option value="archived">Archivadas</option>
                  </select>
                </div>

                <PaginationControls
                  pagination={tasksPagination}
                  onPrev={() => setTasksPage((prev) => Math.max(1, prev - 1))}
                  onNext={() => setTasksPage((prev) => prev + 1)}
                />

                <div className="list-panel">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      className={`list-item ${selectedTaskId === task.id ? "active" : ""}`}
                      onClick={() => void onSelectTask(task.id)}
                    >
                      <div>
                        <strong>{task.title}</strong>
                        <p>{task.description || "Sin descripcion"}</p>
                      </div>
                      <span className={`pill ${task.status}`}>
                        {formatTaskStatus(task.status)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card wide section-ops-detail-card">
                <h2>Operaciones de la Tarea Seleccionada</h2>
                {!selectedTaskDetail ? (
                  <p className="empty">
                    Selecciona una tarea para ver detalles, asignar usuarios y
                    marcar finalizaciones.
                  </p>
                ) : (
                  <div className="stack-lg">
                    <div className="row between">
                      <div>
                        <h3>{selectedTaskDetail.title}</h3>
                        <p className="meta">
                          Archivada en:{" "}
                          {formatDate(selectedTaskDetail.archivedAt)}
                        </p>
                      </div>
                      <span className={`pill ${selectedTaskDetail.status}`}>
                        {formatTaskStatus(selectedTaskDetail.status)}
                      </span>
                    </div>

                    <div className="row split ops-actions-row">
                      <div>
                        <p className="meta">Asignar usuarios</p>
                        <div className="chips">
                          {users.map((user) => {
                            const checked = assignUserIds.includes(user.id);
                            return (
                              <label key={user.id} className="chip-check">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAssignUserIds((prev) => [
                                        ...prev,
                                        user.id,
                                      ]);
                                    } else {
                                      setAssignUserIds((prev) =>
                                        prev.filter((id) => id !== user.id),
                                      );
                                    }
                                  }}
                                />
                                {user.name} {user.lastName}
                              </label>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => void onAssignUsers()}
                          disabled={!canAssign || busy === "loading"}
                        >
                          Asignar usuarios seleccionados
                        </button>
                      </div>

                      <div>
                        <p className="meta">Marcar finalizacion de usuario</p>
                        <select
                          value={completeUserId ?? ""}
                          onChange={(e) =>
                            setCompleteUserId(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        >
                          <option value="">Selecciona usuario asignado</option>
                          {currentTaskUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} {user.lastName} (
                              {user.completed ? "ya completo" : "pendiente"})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => void onCompletePart()}
                          disabled={!canComplete || busy === "loading"}
                        >
                          Completar parte del usuario
                        </button>
                      </div>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Usuario</th>
                            <th>Correo</th>
                            <th>Completado</th>
                            <th>Completado en</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTaskDetail.users.map((u) => (
                            <tr key={u.id}>
                              <td>
                                {u.name} {u.lastName}
                              </td>
                              <td>{u.email}</td>
                              <td>{u.completed ? "Si" : "No"}</td>
                              <td>{formatDate(u.completedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <h4>Intentos de notificacion</h4>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Intento</th>
                            <th>Fecha</th>
                            <th>Estado HTTP</th>
                            <th>Exito</th>
                            <th>Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {taskNotifications.map((n) => (
                            <tr key={n.id}>
                              <td>{n.attemptNumber}</td>
                              <td>{formatDate(n.timestamp)}</td>
                              <td>{n.httpStatus ?? "-"}</td>
                              <td>{n.success ? "Si" : "No"}</td>
                              <td>{n.errorMessage ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <PaginationControls
                      pagination={notificationsPagination}
                      onPrev={() =>
                        setNotificationsPage((prev) => Math.max(1, prev - 1))
                      }
                      onNext={() => setNotificationsPage((prev) => prev + 1)}
                    />
                  </div>
                )}
              </section>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
