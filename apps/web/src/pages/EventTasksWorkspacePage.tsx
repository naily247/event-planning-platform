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
import { PageBackButton } from '../components/navigation/PageBackButton';

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
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(240,231,246,0.84))] p-10 text-center shadow-[0_36px_100px_rgba(31,27,29,0.18)] backdrop-blur-3xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
          />

          <div className="relative">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl border border-white/58 bg-white/34 text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.06)]">
              <LoaderCircle className="size-8 animate-spin" />
            </div>

            <p className="mt-7 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              Opening your task workspace
            </p>

            <p className="mx-auto mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
              Loading deadlines, priorities, progress updates and every planning action connected to
              this event.
            </p>

            <div className="mx-auto mt-8 max-w-sm space-y-3">
              <div className="h-3 animate-pulse rounded-full bg-[rgba(183,167,200,0.22)]" />
              <div className="mx-auto h-3 w-4/5 animate-pulse rounded-full bg-[rgba(175,201,216,0.22)]" />
              <div className="mx-auto h-3 w-3/5 animate-pulse rounded-full bg-white/42" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !summaryQuery.data || !tasksQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(249,235,240,0.84))] p-10 text-center shadow-[0_36px_100px_rgba(31,27,29,0.18)] backdrop-blur-3xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.11)] text-[var(--color-muted-burgundy)] shadow-[0_14px_34px_rgba(124,74,90,0.08)]">
              <CircleAlert aria-hidden="true" className="size-8" />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
              Task workspace unavailable
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              We could not open your planning tasks.
            </h2>

            <p className="mx-auto mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/62">
              {eventId
                ? getApiErrorMessage(firstError)
                : 'The event address is invalid. Return to your events and open the task workspace again.'}
            </p>

            <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <Link
                to="/events"
                className="btn-secondary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Back to events
              </Link>

              {eventId ? (
                <button
                  type="button"
                  className="group/retry-tasks btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                  onClick={() => {
                    void Promise.all([summaryQuery.refetch(), tasksQuery.refetch()]);
                  }}
                >
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 transition duration-300 group-hover/retry-tasks:rotate-12"
                  />
                  Try again
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const taskSummary = summaryQuery.data;
  const tasks = tasksQuery.data.tasks;
  const pagination = tasksQuery.data.pagination;

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PageBackButton
              fallback={`/events/${eventId}`}
              label="Event workspace"
              className="shrink-0"
            />

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
          <section className="relative isolate min-h-[24.5rem] overflow-hidden rounded-[2.5rem] border border-white/68 bg-[#fffaf6] px-6 py-6 shadow-[0_26px_78px_rgba(31,27,29,0.11)] sm:px-8 sm:py-7 lg:px-9 lg:py-8">
            <img
              src="/images/workspaces/shortcuts/tasks.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-30 size-full scale-[1.01] object-cover object-[76%_center] opacity-100 saturate-[0.94] contrast-[0.99] transition duration-1000"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(255,250,246,0.995)_0%,rgba(255,250,246,0.985)_20%,rgba(255,250,246,0.93)_34%,rgba(255,250,246,0.72)_47%,rgba(255,250,246,0.40)_58%,rgba(255,250,246,0.14)_69%,rgba(255,250,246,0.025)_79%,transparent_88%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 -z-20 w-[58%] bg-[linear-gradient(90deg,rgba(255,250,246,0.42),rgba(255,250,246,0.10),transparent)] backdrop-blur-[2.5px]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_48%,rgba(255,250,246,0.09)_100%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 -top-28 -z-10 size-[30rem] rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
            />

            <div className="relative flex min-h-[19rem] flex-col justify-between gap-4">
              <div className="max-w-[35rem]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/44 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)] shadow-[0_10px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Planning progress
                </div>

                <div className="mt-3 max-w-[33rem] rounded-[1.35rem] border border-white/44 bg-white/[0.15] px-5 py-3.5 shadow-[0_14px_36px_rgba(31,27,29,0.055)] backdrop-blur-[3px] sm:px-6">
                  <h2 className="max-w-[31rem] text-balance text-[2.15rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.35rem] lg:text-[2.5rem]">
                    Every planning detail,
                    <br />
                    turned into action.
                  </h2>

                  <p className="mt-3 max-w-[31rem] text-sm font-semibold leading-6 text-[var(--color-charcoal)]/70">
                    Track priorities, deadlines and progress clearly so no important task gets lost
                    as the event moves forward.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="group/hero-add-task btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(93,58,85,0.24)]"
                      onClick={openCreateDialog}
                    >
                      <Plus
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/hero-add-task:rotate-90"
                      />
                      Add task
                    </button>

                    <span className="rounded-full border border-white/72 bg-white/46 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                      <CalendarClock aria-hidden="true" className="mr-1.5 inline size-3.5" />
                      {formatEventDate(taskSummary.event.eventDate)}
                    </span>
                  </div>

                  <div className="mt-4 max-w-[27rem] rounded-[1.15rem] border border-white/56 bg-white/34 px-4 py-3 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/48">
                          Task completion
                        </p>

                        <p className="mt-1 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/54">
                          Excludes cancelled tasks
                        </p>
                      </div>

                      <p className="text-sm font-black text-[var(--color-deep-plum)]">
                        {taskSummary.summary.completionPercentage}%
                      </p>
                    </div>

                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.09)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),#d7b7c3)] transition-[width] duration-700"
                        style={{
                          width: `${Math.min(
                            Math.max(taskSummary.summary.completionPercentage, 0),
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid max-w-[49rem] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="group/task-metric rounded-[1.3rem] border border-white/68 bg-white/40 px-4 py-3 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/56 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] transition duration-300 group-hover/task-metric:scale-105">
                    <ClipboardList aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2.5 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Total tasks
                  </p>

                  <p className="mt-1.5 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {taskSummary.summary.total}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {taskSummary.summary.activeTaskTotal} currently active
                  </p>
                </article>

                <article className="group/task-metric rounded-[1.3rem] border border-white/68 bg-[rgba(240,247,250,0.48)] px-4 py-3 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#334954] transition duration-300 group-hover/task-metric:scale-105">
                    <Clock3 aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2.5 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    In progress
                  </p>

                  <p className="mt-1.5 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {taskSummary.summary.inProgress}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {taskSummary.summary.todo} still waiting
                  </p>
                </article>

                <article className="group/task-metric rounded-[1.3rem] border border-white/68 bg-[rgba(244,246,236,0.50)] px-4 py-3 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#596449] transition duration-300 group-hover/task-metric:scale-105">
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2.5 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Completed
                  </p>

                  <p className="mt-1.5 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {taskSummary.summary.completed}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {taskSummary.summary.completionPercentage}% completion
                  </p>
                </article>

                <article
                  className={
                    taskSummary.summary.overdue > 0
                      ? 'group/task-metric rounded-[1.3rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(249,235,240,0.54)] px-4 py-3.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]'
                      : 'group/task-metric rounded-[1.3rem] border border-white/68 bg-[rgba(248,242,234,0.52)] px-4 py-3.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]'
                  }
                >
                  <span
                    className={
                      taskSummary.summary.overdue > 0
                        ? 'grid size-9 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)] transition duration-300 group-hover/task-metric:scale-105'
                        : 'grid size-9 place-items-center rounded-xl bg-[rgba(233,221,207,0.72)] text-[var(--color-deep-plum)] transition duration-300 group-hover/task-metric:scale-105'
                    }
                  >
                    <TriangleAlert aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-3 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Needs attention
                  </p>

                  <p
                    className={
                      taskSummary.summary.overdue > 0
                        ? 'mt-1.5 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-muted-burgundy)]'
                        : 'mt-1.5 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]'
                    }
                  >
                    {taskSummary.summary.overdue + taskSummary.summary.dueSoon}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {taskSummary.summary.overdue} overdue
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.32fr]">
            <article className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.52),rgba(255,255,255,0.22))] p-6 shadow-[0_22px_64px_rgba(31,27,29,0.07)] backdrop-blur-3xl sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 left-[18%] size-52 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <ClipboardCheck aria-hidden="true" className="size-5" />
                      </div>

                      <span className="status-chip" data-tone="plum">
                        {pagination.total} {pagination.total === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                      Planning checklist
                    </p>

                    <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                      Tasks for this event.
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/58">
                      Filter tasks by progress, priority or deadline, then focus on the work that
                      needs attention next.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="group/checklist-add-task btn-primary shrink-0 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                    onClick={openCreateDialog}
                  >
                    <Plus
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/checklist-add-task:rotate-90"
                    />
                    Add task
                  </button>
                </div>

                <div className="mt-7 rounded-[1.6rem] border border-white/56 bg-white/28 p-5 backdrop-blur-xl">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Task status
                      </span>

                      <select
                        className="form-field min-h-12 transition duration-300 focus:bg-white/52"
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
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Priority
                      </span>

                      <select
                        className="form-field min-h-12 transition duration-300 focus:bg-white/52"
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
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Deadline
                      </span>

                      <select
                        className="form-field min-h-12 transition duration-300 focus:bg-white/52"
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
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Sort order
                      </span>

                      <select
                        className="form-field min-h-12 transition duration-300 focus:bg-white/52"
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
                    </label>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/52">
                      Showing {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} on this page
                    </p>

                    {filtersAreActive ? (
                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                </div>

                {tasks.length > 0 ? (
                  <div className="mt-8 space-y-4">
                    {tasks.map((task) => {
                      const StatusIcon = getTaskStatusIcon(task.status);

                      return (
                        <article
                          key={task.id}
                          className={`group/task-card relative overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_18px_50px_rgba(31,27,29,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_72px_rgba(31,27,29,0.12)] sm:p-6 ${
                            task.isOverdue
                              ? 'border-[rgba(124,74,90,0.22)] bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(249,230,235,0.38))] hover:border-[rgba(124,74,90,0.34)]'
                              : task.status === 'COMPLETED'
                                ? 'border-[rgba(142,151,115,0.24)] bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(235,241,219,0.38))] hover:border-[rgba(142,151,115,0.36)]'
                                : 'border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.48),rgba(255,255,255,0.22))] hover:border-white/90 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(232,225,240,0.58))]'
                          }`}
                        >
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
                          />

                          <div
                            aria-hidden="true"
                            className={`pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-60 blur-3xl transition duration-500 group-hover/task-card:scale-125 group-hover/task-card:opacity-100 ${
                              task.isOverdue
                                ? 'bg-[rgba(210,146,160,0.24)]'
                                : task.status === 'COMPLETED'
                                  ? 'bg-[rgba(142,151,115,0.22)]'
                                  : 'bg-[rgba(183,167,200,0.22)]'
                            }`}
                          />

                          <div className="relative">
                            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className="status-chip transition duration-300 group-hover/task-card:-translate-y-0.5 group-hover/task-card:shadow-[0_8px_20px_rgba(31,27,29,0.08)]"
                                    data-tone={eventTaskStatusTones[task.status]}
                                  >
                                    <StatusIcon aria-hidden="true" className="size-3.5" />
                                    {eventTaskStatusLabels[task.status]}
                                  </span>

                                  <span
                                    className="status-chip transition duration-300 group-hover/task-card:-translate-y-0.5"
                                    data-tone={eventTaskPriorityTones[task.priority]}
                                  >
                                    {eventTaskPriorityLabels[task.priority]} priority
                                  </span>

                                  {task.isOverdue ? (
                                    <span
                                      className="status-chip transition duration-300 group-hover/task-card:-translate-y-0.5 group-hover/task-card:shadow-[0_8px_20px_rgba(124,74,90,0.10)]"
                                      data-tone="rose"
                                    >
                                      <TriangleAlert aria-hidden="true" className="size-3.5" />
                                      Overdue
                                    </span>
                                  ) : null}

                                  {task.isDueSoon && !task.isOverdue ? (
                                    <span
                                      className="status-chip transition duration-300 group-hover/task-card:-translate-y-0.5"
                                      data-tone="plum"
                                    >
                                      <Clock3 aria-hidden="true" className="size-3.5" />
                                      Due soon
                                    </span>
                                  ) : null}
                                </div>

                                <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] transition duration-300 group-hover/task-card:translate-x-0.5 group-hover/task-card:text-[var(--color-deep-plum)]">
                                  {task.title}
                                </h3>

                                {task.description ? (
                                  <div className="mt-4 rounded-[1.35rem] border border-white/50 bg-white/30 p-4 transition duration-300 group-hover/task-card:border-white/74 group-hover/task-card:bg-white/44">
                                    <p className="line-clamp-4 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66">
                                      {task.description}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="mt-4 rounded-[1.35rem] border border-dashed border-white/62 bg-white/20 p-4">
                                    <p className="text-sm font-semibold text-[var(--color-charcoal)]/50">
                                      No description added for this task.
                                    </p>
                                  </div>
                                )}

                                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                  <div
                                    className={`rounded-2xl border p-4 transition duration-300 group-hover/task-card:-translate-y-0.5 ${
                                      task.isOverdue
                                        ? 'border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)]'
                                        : 'border-white/50 bg-white/30 group-hover/task-card:border-white/72 group-hover/task-card:bg-white/44'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <CalendarClock
                                        aria-hidden="true"
                                        className={
                                          task.isOverdue
                                            ? 'size-4 text-[var(--color-muted-burgundy)]'
                                            : 'size-4 text-[var(--color-rosewood)]'
                                        }
                                      />

                                      <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                                        Due date
                                      </p>
                                    </div>

                                    <p
                                      className={`mt-2 text-sm font-black leading-6 ${
                                        task.isOverdue
                                          ? 'text-[var(--color-muted-burgundy)]'
                                          : 'text-[var(--color-near-black)]'
                                      }`}
                                    >
                                      {task.dueDate
                                        ? formatEventTaskDate(task.dueDate)
                                        : 'No due date'}
                                    </p>

                                    <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/48">
                                      {getEventTaskTimingLabel(task)}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl border border-white/50 bg-white/30 p-4 transition duration-300 group-hover/task-card:-translate-y-0.5 group-hover/task-card:border-white/72 group-hover/task-card:bg-white/44">
                                    <div className="flex items-center gap-2">
                                      <ClipboardList
                                        aria-hidden="true"
                                        className="size-4 text-[var(--color-deep-plum)]"
                                      />

                                      <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                                        Created
                                      </p>
                                    </div>

                                    <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                                      {formatEventTaskCompactDate(task.createdAt)}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl border border-white/50 bg-white/30 p-4 transition duration-300 group-hover/task-card:-translate-y-0.5 group-hover/task-card:border-white/72 group-hover/task-card:bg-white/44">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2
                                        aria-hidden="true"
                                        className="size-4 text-[#596449]"
                                      />

                                      <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                                        Completion
                                      </p>
                                    </div>

                                    <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                                      {task.completedAt
                                        ? formatEventTaskCompactDate(task.completedAt)
                                        : 'Not completed'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  className="group/edit-task grid size-10 place-items-center rounded-2xl border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] shadow-[0_8px_20px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.28)] hover:bg-[rgba(93,58,85,0.14)] hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                                  aria-label={`Edit ${task.title}`}
                                  onClick={() => {
                                    openEditDialog(task);
                                  }}
                                >
                                  <Pencil
                                    aria-hidden="true"
                                    className="size-4 transition duration-300 group-hover/edit-task:rotate-[3deg] group-hover/edit-task:scale-105"
                                  />
                                </button>

                                <button
                                  type="button"
                                  className="group/delete-task grid size-10 place-items-center rounded-2xl border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] shadow-[0_8px_20px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.28)] hover:bg-[rgba(124,74,90,0.14)] hover:shadow-[0_12px_28px_rgba(124,74,90,0.10)]"
                                  aria-label={`Delete ${task.title}`}
                                  onClick={() => {
                                    deleteTaskMutation.reset();
                                    setTaskToDelete(task);
                                  }}
                                >
                                  <Trash2
                                    aria-hidden="true"
                                    className="size-4 transition duration-300 group-hover/delete-task:scale-105"
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 rounded-[1.4rem] border border-white/48 bg-white/24 p-4 backdrop-blur-xl">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                                  Task progress
                                </p>

                                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                                  Move this task to the next appropriate stage.
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {getNextTaskStatusActions(task.status).map(
                                  ({ status: nextStatus, label, icon: Icon }) => {
                                    const isCompleting = nextStatus === 'COMPLETED';
                                    const isCancelling = nextStatus === 'CANCELLED';

                                    return (
                                      <button
                                        key={nextStatus}
                                        type="button"
                                        className={`group/task-status-action flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black shadow-[0_8px_20px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)] disabled:cursor-not-allowed disabled:opacity-55 ${
                                          isCompleting
                                            ? 'border-[rgba(142,151,115,0.24)] bg-[rgba(142,151,115,0.12)] text-[#596449] hover:border-[rgba(142,151,115,0.36)] hover:bg-[rgba(142,151,115,0.18)]'
                                            : isCancelling
                                              ? 'border-[rgba(124,74,90,0.20)] bg-[rgba(124,74,90,0.09)] text-[var(--color-muted-burgundy)] hover:border-[rgba(124,74,90,0.30)] hover:bg-[rgba(124,74,90,0.15)]'
                                              : 'border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] hover:border-[rgba(93,58,85,0.28)] hover:bg-[rgba(93,58,85,0.14)]'
                                        }`}
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
                                          <Icon
                                            aria-hidden="true"
                                            className="size-4 transition duration-300 group-hover/task-status-action:scale-105"
                                          />
                                        )}

                                        {label}
                                      </button>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          </div>

                          {updateTaskStatusMutation.isError ? (
                            <div
                              role="alert"
                              className="mt-4 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                            >
                              <div className="flex items-start gap-3">
                                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                                  <CircleAlert aria-hidden="true" className="size-4" />
                                </span>

                                <div>
                                  <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                                    Task status could not be updated
                                  </p>

                                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                                    {getApiErrorMessage(updateTaskStatusMutation.error)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-dashed border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.50),rgba(255,255,255,0.24))] p-8 text-center shadow-[0_16px_42px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-10">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                    />

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-16 -left-12 size-40 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.06)]">
                        <ClipboardCheck aria-hidden="true" className="size-8" />
                      </div>

                      <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        {filtersAreActive ? 'No tasks match these filters' : 'No event tasks yet'}
                      </p>

                      <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                        {filtersAreActive
                          ? 'Try changing the task status, priority, deadline filter or sort order.'
                          : 'Add your first planning task and start building a clear checklist for this event.'}
                      </p>

                      {filtersAreActive ? (
                        <button
                          type="button"
                          className="btn-secondary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="group/first-task btn-primary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                          onClick={openCreateDialog}
                        >
                          <Plus
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/first-task:rotate-90"
                          />
                          Add first task
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {pagination.totalPages > 1 ? (
                  <div className="relative mt-8 overflow-hidden rounded-[1.5rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(228,238,243,0.32))] p-4 shadow-[0_14px_38px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:p-5">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                    />

                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[var(--color-deep-plum)] shadow-[0_8px_20px_rgba(31,27,29,0.05)]">
                          <ClipboardList aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            Page {pagination.page} of {pagination.totalPages}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/50">
                            {pagination.total} {pagination.total === 1 ? 'task' : 'tasks'} in total
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                          disabled={!pagination.hasPreviousPage || tasksQuery.isFetching}
                          onClick={() => {
                            setPage((currentPage) => Math.max(currentPage - 1, 1));
                          }}
                        >
                          Previous
                        </button>

                        <button
                          type="button"
                          className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                          disabled={!pagination.hasNextPage || tasksQuery.isFetching}
                          onClick={() => {
                            setPage((currentPage) => currentPage + 1);
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>

            <aside className="space-y-5">
              <article className="group/deadline-watch glass-card relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:shadow-[0_24px_60px_rgba(31,27,29,0.10)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-12 size-44 rounded-full bg-[rgba(210,146,160,0.18)] blur-3xl transition duration-500 group-hover/deadline-watch:scale-125 group-hover/deadline-watch:bg-[rgba(210,146,160,0.28)]"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/deadline-watch:-translate-y-0.5 group-hover/deadline-watch:scale-105">
                      <TriangleAlert aria-hidden="true" className="size-6" />
                    </div>

                    <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/52 backdrop-blur-xl">
                      Deadline risk
                    </span>
                  </div>

                  <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Attention required
                  </p>

                  <h2 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/deadline-watch:text-[var(--color-deep-plum)]">
                    Deadline watch
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                    Keep urgent and approaching deadlines visible before they affect the event plan.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div className="group/overdue-card relative overflow-hidden rounded-[1.45rem] border border-[rgba(124,74,90,0.20)] bg-[linear-gradient(145deg,rgba(249,235,240,0.72),rgba(255,255,255,0.36))] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.30)] hover:shadow-[0_14px_32px_rgba(124,74,90,0.10)]">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-[rgba(210,146,160,0.18)] blur-3xl transition duration-500 group-hover/overdue-card:scale-125"
                      />

                      <div className="relative">
                        <div className="flex items-center justify-between gap-4">
                          <span className="grid size-10 place-items-center rounded-xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                            <TriangleAlert aria-hidden="true" className="size-5" />
                          </span>

                          <span className="status-chip" data-tone="rose">
                            Overdue
                          </span>
                        </div>

                        <p className="mt-5 text-4xl font-black tracking-[-0.05em] text-[var(--color-muted-burgundy)]">
                          {taskSummary.summary.overdue}
                        </p>

                        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                          {taskSummary.summary.overdue === 1
                            ? 'Task has passed its deadline.'
                            : 'Tasks have passed their deadlines.'}
                        </p>
                      </div>
                    </div>

                    <div className="group/due-soon-card relative overflow-hidden rounded-[1.45rem] border border-[rgba(93,58,85,0.18)] bg-[linear-gradient(145deg,rgba(240,231,246,0.70),rgba(255,255,255,0.36))] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.28)] hover:shadow-[0_14px_32px_rgba(93,58,85,0.09)]">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition duration-500 group-hover/due-soon-card:scale-125"
                      />

                      <div className="relative">
                        <div className="flex items-center justify-between gap-4">
                          <span className="grid size-10 place-items-center rounded-xl bg-[rgba(93,58,85,0.12)] text-[var(--color-deep-plum)]">
                            <Clock3 aria-hidden="true" className="size-5" />
                          </span>

                          <span className="status-chip" data-tone="plum">
                            Next 7 days
                          </span>
                        </div>

                        <p className="mt-5 text-4xl font-black tracking-[-0.05em] text-[var(--color-deep-plum)]">
                          {taskSummary.summary.dueSoon}
                        </p>

                        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                          {taskSummary.summary.dueSoon === 1
                            ? 'Task is due within the next seven days.'
                            : 'Tasks are due within the next seven days.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[1.35rem] border border-[rgba(175,201,216,0.22)] bg-[rgba(222,236,242,0.28)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                        <CalendarClock aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        Use the deadline filter to isolate overdue work or tasks that are still on
                        schedule.
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-task-title"
          onClick={() => {
            if (!createTaskMutation.isPending) {
              closeCreateDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-3xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(240,231,246,0.85))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[22%] top-[-7rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(255,228,210,0.12)] blur-3xl"
              />

              <div className="relative">
                <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <Plus aria-hidden="true" className="size-6" />
                      </div>

                      <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                        New planning task
                      </span>
                    </div>

                    <h2
                      id="create-event-task-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Add a planning task.
                    </h2>

                    <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      Capture the work that needs to happen, set its urgency and add an optional
                      deadline.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="status-chip" data-tone="plum">
                        <ClipboardList aria-hidden="true" className="size-3.5" />
                        Clear action
                      </span>

                      <span className="status-chip" data-tone="blue">
                        <CalendarClock aria-hidden="true" className="size-3.5" />
                        Optional deadline
                      </span>

                      <span className="status-chip" data-tone="gray">
                        <TriangleAlert aria-hidden="true" className="size-3.5" />
                        Priority tracking
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close task form"
                    disabled={createTaskMutation.isPending}
                    onClick={closeCreateDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <div className="mt-8 grid gap-5">
                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/30 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                    />

                    <div className="relative">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Task details
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Define the work clearly.
                      </h3>

                      <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        Give the task a specific title, describe the expected work and set its
                        initial planning state.
                      </p>

                      <label className="mt-6 block">
                        <span className="flex items-center justify-between gap-4">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Task title
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                            {title.length.toLocaleString('en-LK')} / 150
                          </span>
                        </span>

                        <input
                          className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                          type="text"
                          maxLength={150}
                          value={title}
                          disabled={createTaskMutation.isPending}
                          placeholder="e.g. Confirm catering menu"
                          onChange={(event) => {
                            createTaskMutation.reset();
                            setTitle(event.target.value);
                          }}
                        />

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Use a short action-focused title that is easy to scan in the checklist.
                        </p>
                      </label>

                      <label className="mt-5 block">
                        <span className="flex items-center justify-between gap-4">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Description
                          </span>

                          <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                            {description.length.toLocaleString('en-LK')} / 2,000
                          </span>
                        </span>

                        <textarea
                          className="form-field mt-2 min-h-32 resize-y transition duration-300 focus:bg-white/52"
                          maxLength={2000}
                          value={description}
                          disabled={createTaskMutation.isPending}
                          placeholder="Add useful context, expected outcomes or notes needed to complete this task."
                          onChange={(event) => {
                            createTaskMutation.reset();
                            setDescription(event.target.value);
                          }}
                        />

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Optional. Include enough context for the task to remain understandable
                          later.
                        </p>
                      </label>

                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Priority
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <select
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
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

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Priority helps important work stand out in the planning list.
                          </p>
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Initial status
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <select
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
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

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Choose the task’s current stage when adding it to the checklist.
                          </p>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="group/task-deadline relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(220,235,242,0.40))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-xl transition-all duration-300 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)] sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/task-deadline:scale-125"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/task-deadline:-translate-y-0.5 group-hover/task-deadline:scale-105">
                          <CalendarClock aria-hidden="true" className="size-6" />
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Deadline
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/task-deadline:text-[var(--color-deep-plum)]">
                            Set a due date and time
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                            Add a deadline when this task must be completed by a specific date.
                          </p>
                        </div>
                      </div>

                      <label className="mt-6 block">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                          Due date and time
                        </span>

                        <input
                          className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                          type="datetime-local"
                          value={dueDate}
                          disabled={createTaskMutation.isPending}
                          onChange={(event) => {
                            createTaskMutation.reset();
                            setDueDate(event.target.value);
                          }}
                        />

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Optional. Tasks without deadlines appear after dated tasks when sorting by
                          due date.
                        </p>
                      </label>

                      {dueDate ? (
                        <div className="mt-4 flex items-start gap-3 rounded-[1.35rem] border border-[rgba(175,201,216,0.24)] bg-[rgba(222,236,242,0.30)] p-4">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                            <Clock3 aria-hidden="true" className="size-4" />
                          </span>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                              Selected deadline
                            </p>

                            <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                              {formatEventTaskDate(toIsoDateTimeOrNull(dueDate)!)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-start gap-3 rounded-[1.35rem] border border-dashed border-white/70 bg-white/22 p-4">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                            <CalendarClock aria-hidden="true" className="size-4" />
                          </span>

                          <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            No deadline selected. This task can still be created without one.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  {createTaskMutation.isError ? (
                    <div
                      role="alert"
                      className="rounded-[1.4rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                          <CircleAlert aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                            Task could not be created
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {getApiErrorMessage(createTaskMutation.error)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <ClipboardCheck aria-hidden="true" className="size-4" />
                      </span>

                      <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                        You can edit this task, change its priority and update its progress after
                        creating it.
                      </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                        className="group/create-task-submit btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                        disabled={createTaskMutation.isPending}
                        onClick={() => {
                          createTaskMutation.mutate();
                        }}
                      >
                        {createTaskMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Plus
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/create-task-submit:rotate-90"
                          />
                        )}

                        {createTaskMutation.isPending ? 'Creating task...' : 'Create task'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {taskToEdit ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-event-task-title"
          onClick={() => {
            if (!updateTaskMutation.isPending) {
              closeEditDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-3xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(240,231,246,0.85))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[22%] top-[-7rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(255,228,210,0.12)] blur-3xl"
              />

              <div className="relative">
                <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <Pencil aria-hidden="true" className="size-6" />
                      </div>

                      <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                        Edit planning task
                      </span>
                    </div>

                    <h2
                      id="edit-event-task-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Update task details.
                    </h2>

                    <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      Refine the task title, description, priority or deadline while keeping its
                      current progress status unchanged.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span
                        className="status-chip"
                        data-tone={eventTaskStatusTones[taskToEdit.status]}
                      >
                        {eventTaskStatusLabels[taskToEdit.status]}
                      </span>

                      <span
                        className="status-chip"
                        data-tone={eventTaskPriorityTones[taskToEdit.priority]}
                      >
                        {eventTaskPriorityLabels[taskToEdit.priority]} priority
                      </span>

                      {taskToEdit.dueDate ? (
                        <span className="status-chip" data-tone="blue">
                          <CalendarClock aria-hidden="true" className="size-3.5" />
                          Deadline set
                        </span>
                      ) : (
                        <span className="status-chip" data-tone="gray">
                          No deadline
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close edit task form"
                    disabled={updateTaskMutation.isPending}
                    onClick={closeEditDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <div className="mt-8 grid gap-5">
                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/30 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                    />

                    <div className="relative">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Task details
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Refine the work clearly.
                      </h3>

                      <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        Update the title, context and priority while preserving the task’s current
                        progress stage.
                      </p>

                      <label className="mt-6 block">
                        <span className="flex items-center justify-between gap-4">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Task title
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                            {title.length.toLocaleString('en-LK')} / 150
                          </span>
                        </span>

                        <input
                          className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                          type="text"
                          maxLength={150}
                          value={title}
                          disabled={updateTaskMutation.isPending}
                          placeholder="Enter a clear action-focused title"
                          onChange={(event) => {
                            updateTaskMutation.reset();
                            setTitle(event.target.value);
                          }}
                        />

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Keep the title short, specific and easy to scan in the planning checklist.
                        </p>
                      </label>

                      <label className="mt-5 block">
                        <span className="flex items-center justify-between gap-4">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Description
                          </span>

                          <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                            {description.length.toLocaleString('en-LK')} / 2,000
                          </span>
                        </span>

                        <textarea
                          className="form-field mt-2 min-h-32 resize-y transition duration-300 focus:bg-white/52"
                          maxLength={2000}
                          value={description}
                          disabled={updateTaskMutation.isPending}
                          placeholder="Add context, expected outcomes or notes required to complete this task."
                          onChange={(event) => {
                            updateTaskMutation.reset();
                            setDescription(event.target.value);
                          }}
                        />

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Optional. Include enough detail for the task to remain understandable
                          later.
                        </p>
                      </label>

                      <label className="mt-5 block">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                          Priority
                          <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                        </span>

                        <select
                          className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
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

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Priority determines how prominently this task appears during planning.
                        </p>
                      </label>
                    </div>
                  </section>

                  <section className="group/edit-task-deadline relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(220,235,242,0.40))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-xl transition-all duration-300 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)] sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/edit-task-deadline:scale-125"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/edit-task-deadline:-translate-y-0.5 group-hover/edit-task-deadline:scale-105">
                          <CalendarClock aria-hidden="true" className="size-6" />
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Deadline
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/edit-task-deadline:text-[var(--color-deep-plum)]">
                            Update the due date
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                            Change or remove the deadline without altering the task’s progress
                            status.
                          </p>
                        </div>
                      </div>

                      <label className="mt-6 block">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                          Due date and time
                        </span>

                        <input
                          className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                          type="datetime-local"
                          value={dueDate}
                          disabled={updateTaskMutation.isPending}
                          onChange={(event) => {
                            updateTaskMutation.reset();
                            setDueDate(event.target.value);
                          }}
                        />

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Clear the field when this task no longer needs a specific deadline.
                        </p>
                      </label>

                      {dueDate ? (
                        <div className="mt-4 flex items-start gap-3 rounded-[1.35rem] border border-[rgba(175,201,216,0.24)] bg-[rgba(222,236,242,0.30)] p-4">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                            <Clock3 aria-hidden="true" className="size-4" />
                          </span>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                              Updated deadline
                            </p>

                            <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                              {formatEventTaskDate(toIsoDateTimeOrNull(dueDate)!)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-start gap-3 rounded-[1.35rem] border border-dashed border-white/70 bg-white/22 p-4">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                            <CalendarClock aria-hidden="true" className="size-4" />
                          </span>

                          <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            This task will have no deadline after the changes are saved.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <div className="rounded-[1.35rem] border border-[rgba(183,167,200,0.22)] bg-[rgba(240,231,246,0.30)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                        <ClipboardCheck aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        Task status is managed from the task card so every progress change remains
                        deliberate and visible.
                      </p>
                    </div>
                  </div>

                  {updateTaskMutation.isError ? (
                    <div
                      role="alert"
                      className="rounded-[1.4rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                          <CircleAlert aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                            Task changes could not be saved
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {getApiErrorMessage(updateTaskMutation.error)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Pencil aria-hidden="true" className="size-4" />
                      </span>

                      <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                        Saving changes updates the task details only. Its progress status remains
                        unchanged.
                      </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                        className="group/save-task-changes btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                        disabled={updateTaskMutation.isPending}
                        onClick={() => {
                          updateTaskMutation.mutate();
                        }}
                      >
                        {updateTaskMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Save
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/save-task-changes:scale-105"
                          />
                        )}

                        {updateTaskMutation.isPending ? 'Saving changes...' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {taskToDelete ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-task-title"
          onClick={() => {
            if (!deleteTaskMutation.isPending) {
              closeDeleteDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-[2.15rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(249,235,240,0.85))] p-6 shadow-[0_40px_110px_rgba(31,27,29,0.26)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-14 place-items-center rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_12px_28px_rgba(124,74,90,0.08)]">
                    <Trash2 aria-hidden="true" className="size-7" />
                  </div>

                  <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                    Permanent action
                  </span>
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
                  Delete planning task
                </p>

                <h2
                  id="delete-event-task-title"
                  className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                >
                  Delete this task?
                </h2>

                <p className="mt-4 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66">
                  <strong className="font-black text-[var(--color-near-black)]">
                    {taskToDelete.title}
                  </strong>{' '}
                  will be permanently removed from this event checklist.
                </p>

                <div className="mt-6 rounded-[1.45rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.08)] p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                      <ClipboardList aria-hidden="true" className="size-5" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        {eventTaskStatusLabels[taskToDelete.status]}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className="status-chip"
                          data-tone={eventTaskPriorityTones[taskToDelete.priority]}
                        >
                          {eventTaskPriorityLabels[taskToDelete.priority]} priority
                        </span>

                        {taskToDelete.dueDate ? (
                          <span className="status-chip" data-tone="blue">
                            <CalendarClock aria-hidden="true" className="size-3.5" />
                            {formatEventTaskCompactDate(taskToDelete.dueDate)}
                          </span>
                        ) : (
                          <span className="status-chip" data-tone="gray">
                            No deadline
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                {deleteTaskMutation.isError ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                        <CircleAlert aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                          Task could not be deleted
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                          {getApiErrorMessage(deleteTaskMutation.error)}
                        </p>
                      </div>
                    </div>
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
                    className="group/delete-task-confirm flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deleteTaskMutation.isPending}
                    onClick={() => {
                      deleteTaskMutation.mutate();
                    }}
                  >
                    {deleteTaskMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/delete-task-confirm:scale-105"
                      />
                    )}

                    {deleteTaskMutation.isPending ? 'Deleting task...' : 'Delete task'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
