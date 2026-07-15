import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  createEventTask,
  deleteEventTask,
  eventTaskPriorities,
  eventTaskStatuses,
  getEventTasks,
  getEventTaskSummary,
  updateEventTask,
  updateEventTaskStatus,
  type EventTask,
  type EventTaskOverdueFilter,
  type EventTaskPriority,
  type EventTaskSort,
  type EventTaskStatus,
} from '../features/eventTasks/eventTask.api';
import {
  eventTaskPriorityLabels,
  eventTaskPriorityTones,
  eventTaskSortLabels,
  eventTaskStatusLabels,
  eventTaskStatusTones,
  formatEventTaskCompactDate,
  formatEventTaskDate,
  getEventTaskTimingLabel,
  toIsoDateTimeOrNull,
  toLocalDateTimeInput,
  validateEventTaskDescription,
  validateEventTaskTitle,
} from '../features/eventTasks/eventTask.ui';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type TaskStatusFilter = EventTaskStatus | '';
type TaskPriorityFilter = EventTaskPriority | '';

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error
      ? error.message
      : 'Something went wrong while loading event tasks.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'Something went wrong while loading event tasks.'
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const getEventStatusTone = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'blue';

    case 'PLANNING':
      return 'plum';

    case 'COMPLETED':
      return 'green';

    case 'CANCELLED':
      return 'rose';

    case 'DRAFT':
    default:
      return 'gray';
  }
};

const getTaskStatusIcon = (status: EventTaskStatus) => {
  switch (status) {
    case 'IN_PROGRESS':
      return Clock3;

    case 'COMPLETED':
      return CheckCircle2;

    case 'CANCELLED':
      return XCircle;

    case 'TODO':
    default:
      return CircleDot;
  }
};

const getNextTaskStatusActions = (
  status: EventTaskStatus,
): Array<{
  status: EventTaskStatus;
  label: string;
  icon: typeof CheckCircle2;
}> => {
  switch (status) {
    case 'TODO':
      return [
        {
          status: 'IN_PROGRESS',
          label: 'Start task',
          icon: Clock3,
        },
        {
          status: 'COMPLETED',
          label: 'Complete',
          icon: CheckCircle2,
        },
        {
          status: 'CANCELLED',
          label: 'Cancel',
          icon: XCircle,
        },
      ];

    case 'IN_PROGRESS':
      return [
        {
          status: 'TODO',
          label: 'Move to to-do',
          icon: RotateCcw,
        },
        {
          status: 'COMPLETED',
          label: 'Complete',
          icon: CheckCircle2,
        },
        {
          status: 'CANCELLED',
          label: 'Cancel',
          icon: XCircle,
        },
      ];

    case 'COMPLETED':
      return [
        {
          status: 'TODO',
          label: 'Reopen',
          icon: RotateCcw,
        },
        {
          status: 'IN_PROGRESS',
          label: 'Resume',
          icon: Clock3,
        },
      ];

    case 'CANCELLED':
      return [
        {
          status: 'TODO',
          label: 'Restore',
          icon: RotateCcw,
        },
      ];
  }
};

export function EventTasksWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriorityFilter>('');
  const [overdueFilter, setOverdueFilter] = useState<EventTaskOverdueFilter>('all');
  const [sort, setSort] = useState<EventTaskSort>('due_soon');
  const [page, setPage] = useState(1);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<EventTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<EventTask | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<EventTaskPriority>('MEDIUM');
  const [status, setStatus] = useState<EventTaskStatus>('TODO');
  const [dueDate, setDueDate] = useState('');

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'event-tasks', 'summary'],
    enabled: Boolean(eventId),
    queryFn: () => getEventTaskSummary(eventId!),
  });

  const tasksQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'event-tasks',
      'list',
      {
        page,
        status: statusFilter,
        priority: priorityFilter,
        overdue: overdueFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getEventTasks(eventId!, {
        page,
        limit: 20,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        overdue: overdueFilter,
        sort,
      }),
  });

  const invalidateTaskQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'event-tasks', 'summary'],
      }),

      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'event-tasks', 'list'],
      }),
    ]);
  };

  const resetTaskForm = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setStatus('TODO');
    setDueDate('');
  };

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      const normalizedTitle = validateEventTaskTitle(title);
      const normalizedDescription = validateEventTaskDescription(description);
      const normalizedDueDate = toIsoDateTimeOrNull(dueDate);

      return createEventTask(eventId, {
        title: normalizedTitle,
        description: normalizedDescription,
        priority,
        status,
        dueDate: normalizedDueDate,
      });
    },

    onSuccess: async () => {
      setIsCreateDialogOpen(false);
      resetTaskForm();

      await invalidateTaskQueries();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !taskToEdit) {
        throw new Error('Task details are missing.');
      }

      const normalizedTitle = validateEventTaskTitle(title);
      const normalizedDescription = validateEventTaskDescription(description);
      const normalizedDueDate = toIsoDateTimeOrNull(dueDate);

      const input: {
        title?: string;
        description?: string | null;
        priority?: EventTaskPriority;
        dueDate?: string | null;
      } = {};

      if (normalizedTitle !== taskToEdit.title) {
        input.title = normalizedTitle;
      }

      if (normalizedDescription !== taskToEdit.description) {
        input.description = normalizedDescription;
      }

      if (priority !== taskToEdit.priority) {
        input.priority = priority;
      }

      const currentDueDate = taskToEdit.dueDate ? new Date(taskToEdit.dueDate).getTime() : null;

      const nextDueDate = normalizedDueDate ? new Date(normalizedDueDate).getTime() : null;

      if (currentDueDate !== nextDueDate) {
        input.dueDate = normalizedDueDate;
      }

      if (Object.keys(input).length === 0) {
        throw new Error('No task details were changed.');
      }

      return updateEventTask(eventId, taskToEdit.id, input);
    },

    onSuccess: async () => {
      setTaskToEdit(null);
      resetTaskForm();

      await invalidateTaskQueries();
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ task, nextStatus }: { task: EventTask; nextStatus: EventTaskStatus }) => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      return updateEventTaskStatus(eventId, task.id, {
        status: nextStatus,
      });
    },

    onSuccess: async () => {
      await invalidateTaskQueries();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !taskToDelete) {
        throw new Error('Task details are missing.');
      }

      await deleteEventTask(eventId, taskToDelete.id);
    },

    onSuccess: async () => {
      setTaskToDelete(null);

      await invalidateTaskQueries();
    },
  });

  const openCreateDialog = () => {
    createTaskMutation.reset();
    resetTaskForm();
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createTaskMutation.isPending) {
      return;
    }

    createTaskMutation.reset();
    resetTaskForm();
    setIsCreateDialogOpen(false);
  };

  const openEditDialog = (task: EventTask) => {
    updateTaskMutation.reset();

    setTaskToEdit(task);
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDueDate(toLocalDateTimeInput(task.dueDate));
  };

  const closeEditDialog = () => {
    if (updateTaskMutation.isPending) {
      return;
    }

    updateTaskMutation.reset();
    setTaskToEdit(null);
    resetTaskForm();
  };

  const closeDeleteDialog = () => {
    if (deleteTaskMutation.isPending) {
      return;
    }

    deleteTaskMutation.reset();
    setTaskToDelete(null);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setOverdueFilter('all');
    setSort('due_soon');
    setPage(1);
  };

  const filtersAreActive =
    Boolean(statusFilter) ||
    Boolean(priorityFilter) ||
    overdueFilter !== 'all' ||
    sort !== 'due_soon';

  const isLoading = summaryQuery.isLoading || tasksQuery.isLoading;

  const isError = summaryQuery.isError || tasksQuery.isError;

  const firstError = summaryQuery.error ?? tasksQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your event tasks
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading deadlines, progress and planning priorities.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !summaryQuery.data || !tasksQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Task workspace unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {eventId ? getApiErrorMessage(firstError) : 'The event address is invalid.'}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {eventId ? (
                <button
                  type="button"
                  className="btn-primary text-sm font-bold"
                  onClick={() => {
                    void Promise.all([summaryQuery.refetch(), tasksQuery.refetch()]);
                  }}
                >
                  Try again
                </button>
              ) : null}

              <Link to="/events" className="btn-secondary text-sm font-bold">
                <ArrowLeft className="size-4" />
                Back to events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const taskSummary = summaryQuery.data;
  const tasks = tasksQuery.data.tasks;
  const pagination = tasksQuery.data.pagination;

  const summaryCards = [
    {
      label: 'Total tasks',
      value: taskSummary.summary.total,
      helper: `${taskSummary.summary.activeTaskTotal} active tasks`,
      icon: ClipboardList,
    },
    {
      label: 'In progress',
      value: taskSummary.summary.inProgress,
      helper: `${taskSummary.summary.todo} still waiting`,
      icon: Clock3,
    },
    {
      label: 'Completed',
      value: taskSummary.summary.completed,
      helper: `${taskSummary.summary.completionPercentage}% completion`,
      icon: CheckCircle2,
    },
    {
      label: 'Needs attention',
      value: taskSummary.summary.overdue + taskSummary.summary.dueSoon,
      helper: `${taskSummary.summary.overdue} overdue`,
      icon: TriangleAlert,
    },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/events/${eventId}`}
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to event workspace"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Event tasks
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {taskSummary.event.name}
              </h1>
            </div>
          </div>

          <span
            className="status-chip w-fit"
            data-tone={getEventStatusTone(taskSummary.event.status)}
          >
            {taskSummary.event.status.replaceAll('_', ' ')}
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[7%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  Planning progress
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Turn every planning detail into clear action.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Track upcoming work, handle urgent deadlines and keep the event moving forward
                  without losing smaller details.
                </p>
              </div>

              <div className="glass-card p-5">
                <CalendarClock className="size-6 text-[var(--color-deep-plum)]" />

                <p className="mt-6 text-sm font-bold text-[var(--color-charcoal)]/58">Event date</p>

                <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {formatEventDate(taskSummary.event.eventDate)}
                </p>

                <p className="mt-3 text-sm font-semibold text-[var(--color-rosewood)]">
                  {taskSummary.summary.completionPercentage}% of active tasks completed
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label, value, helper, icon: Icon }) => (
              <article key={label} className="luxe-card p-6">
                <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <Icon className="size-5" />
                </div>

                <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">{label}</p>

                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {value}
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                  {helper}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.28fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Planning checklist
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Tasks for this event.
                  </h2>
                </div>

                <button
                  type="button"
                  className="btn-primary shrink-0 text-sm font-bold"
                  onClick={openCreateDialog}
                >
                  <Plus className="size-4" />
                  Add task
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <select
                  className="form-field min-h-12"
                  aria-label="Filter tasks by status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as TaskStatusFilter);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>

                  {eventTaskStatuses.map((taskStatus) => (
                    <option key={taskStatus} value={taskStatus}>
                      {eventTaskStatusLabels[taskStatus]}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12"
                  aria-label="Filter tasks by priority"
                  value={priorityFilter}
                  onChange={(event) => {
                    setPriorityFilter(event.target.value as TaskPriorityFilter);
                    setPage(1);
                  }}
                >
                  <option value="">All priorities</option>

                  {eventTaskPriorities.map((taskPriority) => (
                    <option key={taskPriority} value={taskPriority}>
                      {eventTaskPriorityLabels[taskPriority]}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12"
                  aria-label="Filter tasks by overdue status"
                  value={overdueFilter}
                  onChange={(event) => {
                    setOverdueFilter(event.target.value as EventTaskOverdueFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">All deadlines</option>
                  <option value="overdue">Overdue only</option>
                  <option value="not_overdue">Not overdue</option>
                </select>

                <select
                  className="form-field min-h-12"
                  aria-label="Sort event tasks"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as EventTaskSort);
                    setPage(1);
                  }}
                >
                  {Object.entries(eventTaskSortLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {filtersAreActive ? (
                <button
                  type="button"
                  className="btn-secondary mt-4 text-sm font-bold"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : null}

              {tasks.length > 0 ? (
                <div className="mt-8 space-y-4">
                  {tasks.map((task) => {
                    const StatusIcon = getTaskStatusIcon(task.status);

                    return (
                      <article
                        key={task.id}
                        className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl sm:p-6"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="status-chip"
                                data-tone={eventTaskStatusTones[task.status]}
                              >
                                <StatusIcon className="size-3.5" />
                                {eventTaskStatusLabels[task.status]}
                              </span>

                              <span
                                className="status-chip"
                                data-tone={eventTaskPriorityTones[task.priority]}
                              >
                                {eventTaskPriorityLabels[task.priority]} priority
                              </span>

                              {task.isOverdue ? (
                                <span className="status-chip" data-tone="rose">
                                  <TriangleAlert className="size-3.5" />
                                  Overdue
                                </span>
                              ) : null}

                              {task.isDueSoon && !task.isOverdue ? (
                                <span className="status-chip" data-tone="plum">
                                  <Clock3 className="size-3.5" />
                                  Due soon
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                              {task.title}
                            </h3>

                            {task.description ? (
                              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
                                {task.description}
                              </p>
                            ) : null}

                            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-[var(--color-charcoal)]/54">
                              <span className="inline-flex items-center gap-2">
                                <CalendarClock className="size-4 text-[var(--color-rosewood)]" />

                                {task.dueDate ? formatEventTaskDate(task.dueDate) : 'No due date'}
                              </span>

                              <span>Created {formatEventTaskCompactDate(task.createdAt)}</span>

                              {task.completedAt ? (
                                <span>
                                  Completed {formatEventTaskCompactDate(task.completedAt)}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              className="grid size-10 place-items-center rounded-full border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.16)]"
                              aria-label={`Edit ${task.title}`}
                              onClick={() => {
                                openEditDialog(task);
                              }}
                            >
                              <Pencil className="size-4" />
                            </button>

                            <button
                              type="button"
                              className="grid size-10 place-items-center rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
                              aria-label={`Delete ${task.title}`}
                              onClick={() => {
                                deleteTaskMutation.reset();
                                setTaskToDelete(task);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/45 pt-5">
                          {getNextTaskStatusActions(task.status).map(
                            ({ status: nextStatus, label, icon: Icon }) => (
                              <button
                                key={nextStatus}
                                type="button"
                                className="btn-secondary text-sm font-bold"
                                disabled={updateTaskStatusMutation.isPending}
                                onClick={() => {
                                  updateTaskStatusMutation.mutate({
                                    task,
                                    nextStatus,
                                  });
                                }}
                              >
                                {updateTaskStatusMutation.isPending ? (
                                  <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                  <Icon className="size-4" />
                                )}

                                {label}
                              </button>
                            ),
                          )}
                        </div>

                        {updateTaskStatusMutation.isError ? (
                          <div
                            role="alert"
                            className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                          >
                            {getApiErrorMessage(updateTaskStatusMutation.error)}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <ClipboardCheck className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    {filtersAreActive ? 'No tasks match these filters' : 'No event tasks yet'}
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    {filtersAreActive
                      ? 'Try adjusting the task status, priority or deadline filters.'
                      : 'Add the first planning task and start building a clear event checklist.'}
                  </p>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary mt-5 text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary mt-5 text-sm font-bold"
                      onClick={openCreateDialog}
                    >
                      <Plus className="size-4" />
                      Add task
                    </button>
                  )}
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} tasks)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || tasksQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || tasksQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => currentPage + 1);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </article>

            <aside className="space-y-5">
              <article className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <ClipboardCheck className="size-6 text-[var(--color-powder-blue)]" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Planning progress</h2>

                <p className="mt-3 leading-7 text-white/68">
                  Completion is calculated from all non-cancelled tasks.
                </p>

                <div className="mt-8">
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-sm font-bold text-white/64">Completion</span>

                    <span className="text-3xl font-black">
                      {taskSummary.summary.completionPercentage}%
                    </span>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/16">
                    <div
                      className="h-full rounded-full bg-white/80 transition-all"
                      style={{
                        width: `${Math.min(taskSummary.summary.completionPercentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  {[
                    {
                      label: 'To do',
                      value: taskSummary.summary.todo,
                    },
                    {
                      label: 'In progress',
                      value: taskSummary.summary.inProgress,
                    },
                    {
                      label: 'Completed',
                      value: taskSummary.summary.completed,
                    },
                    {
                      label: 'Cancelled',
                      value: taskSummary.summary.cancelled,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl bg-white/14 px-4 py-3 backdrop-blur"
                    >
                      <span className="text-sm font-bold text-white/72">{label}</span>

                      <span className="text-lg font-black">{value}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card p-6">
                <TriangleAlert className="size-6 text-[var(--color-muted-burgundy)]" />

                <h2 className="mt-6 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Deadline watch
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-[rgba(124,74,90,0.08)] p-4">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Overdue</p>

                    <p className="mt-2 text-3xl font-black text-[var(--color-muted-burgundy)]">
                      {taskSummary.summary.overdue}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[rgba(93,58,85,0.08)] p-4">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                      Due within seven days
                    </p>

                    <p className="mt-2 text-3xl font-black text-[var(--color-deep-plum)]">
                      {taskSummary.summary.dueSoon}
                    </p>
                  </div>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-task-title"
        >
          <div className="mx-auto max-w-3xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Plus className="size-4" />
                    New task
                  </div>

                  <h2
                    id="create-event-task-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    Add a planning task.
                  </h2>

                  <p className="mt-3 max-w-xl leading-7 text-[var(--color-charcoal)]/66">
                    Capture the work that needs to happen and define its urgency and deadline.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close task form"
                  disabled={createTaskMutation.isPending}
                  onClick={closeCreateDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-8 grid gap-5">
                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Task title
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    maxLength={150}
                    value={title}
                    disabled={createTaskMutation.isPending}
                    onChange={(event) => {
                      createTaskMutation.reset();
                      setTitle(event.target.value);
                    }}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Description
                  </span>

                  <textarea
                    className="form-field min-h-28 resize-y"
                    maxLength={2000}
                    value={description}
                    disabled={createTaskMutation.isPending}
                    onChange={(event) => {
                      createTaskMutation.reset();
                      setDescription(event.target.value);
                    }}
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Priority
                    </span>

                    <select
                      className="form-field"
                      value={priority}
                      disabled={createTaskMutation.isPending}
                      onChange={(event) => {
                        createTaskMutation.reset();
                        setPriority(event.target.value as EventTaskPriority);
                      }}
                    >
                      {eventTaskPriorities.map((taskPriority) => (
                        <option key={taskPriority} value={taskPriority}>
                          {eventTaskPriorityLabels[taskPriority]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Initial status
                    </span>

                    <select
                      className="form-field"
                      value={status}
                      disabled={createTaskMutation.isPending}
                      onChange={(event) => {
                        createTaskMutation.reset();
                        setStatus(event.target.value as EventTaskStatus);
                      }}
                    >
                      {eventTaskStatuses.map((taskStatus) => (
                        <option key={taskStatus} value={taskStatus}>
                          {eventTaskStatusLabels[taskStatus]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Due date and time
                  </span>

                  <input
                    className="form-field"
                    type="datetime-local"
                    value={dueDate}
                    disabled={createTaskMutation.isPending}
                    onChange={(event) => {
                      createTaskMutation.reset();
                      setDueDate(event.target.value);
                    }}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Optional. Tasks without deadlines will appear after dated tasks when sorting by
                    due date.
                  </p>
                </label>

                {createTaskMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(createTaskMutation.error)}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={createTaskMutation.isPending}
                    onClick={closeCreateDialog}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={createTaskMutation.isPending}
                    onClick={() => {
                      createTaskMutation.mutate();
                    }}
                  >
                    {createTaskMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}

                    {createTaskMutation.isPending ? 'Creating task...' : 'Add task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {taskToEdit ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-event-task-title"
        >
          <div className="mx-auto max-w-3xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Pencil className="size-4" />
                    Edit task
                  </div>

                  <h2
                    id="edit-event-task-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    Update task details.
                  </h2>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close edit task form"
                  disabled={updateTaskMutation.isPending}
                  onClick={closeEditDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-8 grid gap-5">
                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Task title
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    maxLength={150}
                    value={title}
                    disabled={updateTaskMutation.isPending}
                    onChange={(event) => {
                      updateTaskMutation.reset();
                      setTitle(event.target.value);
                    }}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Description
                  </span>

                  <textarea
                    className="form-field min-h-28 resize-y"
                    maxLength={2000}
                    value={description}
                    disabled={updateTaskMutation.isPending}
                    onChange={(event) => {
                      updateTaskMutation.reset();
                      setDescription(event.target.value);
                    }}
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Priority
                    </span>

                    <select
                      className="form-field"
                      value={priority}
                      disabled={updateTaskMutation.isPending}
                      onChange={(event) => {
                        updateTaskMutation.reset();
                        setPriority(event.target.value as EventTaskPriority);
                      }}
                    >
                      {eventTaskPriorities.map((taskPriority) => (
                        <option key={taskPriority} value={taskPriority}>
                          {eventTaskPriorityLabels[taskPriority]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Due date and time
                    </span>

                    <input
                      className="form-field"
                      type="datetime-local"
                      value={dueDate}
                      disabled={updateTaskMutation.isPending}
                      onChange={(event) => {
                        updateTaskMutation.reset();
                        setDueDate(event.target.value);
                      }}
                    />
                  </label>
                </div>

                <p className="text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                  Task status is managed from the task card so progress changes remain explicit.
                </p>

                {updateTaskMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(updateTaskMutation.error)}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={updateTaskMutation.isPending}
                    onClick={closeEditDialog}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={updateTaskMutation.isPending}
                    onClick={() => {
                      updateTaskMutation.mutate();
                    }}
                  >
                    {updateTaskMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}

                    {updateTaskMutation.isPending ? 'Saving changes...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {taskToDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-task-title"
        >
          <div className="glass-card w-full max-w-lg p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Trash2 className="size-7" />
            </div>

            <h2
              id="delete-event-task-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Delete this task?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              <strong>{taskToDelete.title}</strong> will be permanently removed from this event
              checklist.
            </p>

            {deleteTaskMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(deleteTaskMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={deleteTaskMutation.isPending}
                onClick={closeDeleteDialog}
              >
                Keep task
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteTaskMutation.isPending}
                onClick={() => {
                  deleteTaskMutation.mutate();
                }}
              >
                {deleteTaskMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteTaskMutation.isPending ? 'Deleting task...' : 'Delete task'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
