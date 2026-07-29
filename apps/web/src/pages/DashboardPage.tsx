import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthTokens } from '../features/auth/auth.storage';
import { api } from '../lib/api';

type EventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

type BookingStatus =
  | 'AWAITING_VENDOR_CONFIRMATION'
  | 'CONFIRMED'
  | 'DEPOSIT_PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'DISPUTED';

type EventTaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

type GuestStatus = 'NOT_INVITED' | 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'MAYBE';

type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DEACTIVATED';
};

type DashboardEvent = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: number | null;
  plannedBudget: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

type DashboardBooking = {
  id: string;
  agreedCost: string;
  serviceStart: string;
  serviceEnd: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    name: string;
    eventType: string;
    eventDate: string;
    location: string;
    status: EventStatus;
  };
  vendor: {
    id: string;
    businessName: string;
    slug: string;
    verificationStatus: string;
  };
};

type DashboardTask = {
  id: string;
  title: string;
  description: string | null;
  status: EventTaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    name: string;
    eventDate: string;
    status: EventStatus;
  };
};

type DashboardNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};

type CustomerDashboard = {
  generatedAt: string;
  filters: {
    recentLimit: number;
  };
  events: {
    total: number;
    byStatus: Record<EventStatus, number>;
    upcomingEvent: DashboardEvent | null;
    recent: DashboardEvent[];
  };
  bookings: {
    total: number;
    byStatus: Record<BookingStatus, number>;
    upcoming: DashboardBooking[];
  };
  payments: {
    pendingCount: number;
  };
  notifications: {
    unreadCount: number;
    recent: DashboardNotification[];
  };
  tasks: {
    byStatus: Record<EventTaskStatus, number>;
    upcoming: DashboardTask[];
  };
  guests: {
    total: number;
    byStatus: Record<GuestStatus, number>;
  };
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

const formatCurrency = (value: string | number) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'LKR 0';
  }

  if (amount >= 1_000_000) {
    return `LKR ${(amount / 1_000_000).toFixed(1)}M`;
  }

  if (amount >= 1_000) {
    return `LKR ${Math.round(amount / 1_000)}k`;
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
};

const getErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load your dashboard. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load your dashboard. Please try again.'
  );
};

const getTaskProgress = (taskCounts: Record<EventTaskStatus, number>) => {
  const relevantTotal = taskCounts.TODO + taskCounts.IN_PROGRESS + taskCounts.COMPLETED;

  if (relevantTotal === 0) {
    return 0;
  }

  return Math.round((taskCounts.COMPLETED / relevantTotal) * 100);
};

const getDaysUntil = (value: string) => {
  const target = new Date(value);
  const today = new Date();

  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getDeadlineLabel = (dueDate: string | null) => {
  if (!dueDate) {
    return 'No due date';
  }

  const days = getDaysUntil(dueDate);

  if (days < 0) {
    return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`;
  }

  if (days === 0) {
    return 'Due today';
  }

  if (days === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${days} days`;
};

export function DashboardPage() {
  const navigate = useNavigate();

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.get<ApiSuccessResponse<CurrentUser>>('/auth/me');

      return response.data.data;
    },
  });

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'customer'],
    queryFn: async () => {
      const response = await api.get<ApiSuccessResponse<CustomerDashboard>>('/dashboard/customer', {
        params: {
          recentLimit: 5,
        },
      });

      return response.data.data;
    },
  });

  const handleLogout = () => {
    clearAuthTokens();
    navigate('/login', {
      replace: true,
    });
  };

  const isLoading = currentUserQuery.isLoading || dashboardQuery.isLoading;

  const queryError = currentUserQuery.error ?? dashboardQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Preparing your workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading your events, tasks, bookings, and planning progress.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (queryError || !currentUserQuery.data || !dashboardQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Dashboard unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(queryError)}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="btn-primary text-sm font-bold"
                onClick={() => {
                  void Promise.all([currentUserQuery.refetch(), dashboardQuery.refetch()]);
                }}
              >
                Try again
              </button>

              <button
                type="button"
                className="btn-secondary text-sm font-bold"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = currentUserQuery.data;
  const dashboard = dashboardQuery.data;
  const activeEvent = dashboard.events.upcomingEvent;

  const planningProgress = getTaskProgress(dashboard.tasks.byStatus);

  const committedCost = dashboard.bookings.upcoming.reduce(
    (sum, booking) => sum + Number(booking.agreedCost),
    0,
  );

  const upcomingTaskCount = dashboard.tasks.byStatus.TODO + dashboard.tasks.byStatus.IN_PROGRESS;

  const nextTask = dashboard.tasks.upcoming[0] ?? null;

  const confirmedGuestCount = dashboard.guests.byStatus.CONFIRMED;

  const activeBookingCount =
    dashboard.bookings.byStatus.CONFIRMED +
    dashboard.bookings.byStatus.DEPOSIT_PENDING +
    dashboard.bookings.byStatus.ACTIVE;

  const stats = [
    {
      label: 'Planned budget',
      value: activeEvent?.plannedBudget ? formatCurrency(activeEvent.plannedBudget) : 'Not set',
      helper: activeEvent ? `${activeEvent.name} estimate` : 'Create an event to begin',
      icon: WalletCards,
      tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
    },
    {
      label: 'Committed',
      value: formatCurrency(committedCost),
      helper: `${activeBookingCount} active ${activeBookingCount === 1 ? 'booking' : 'bookings'}`,
      icon: CheckCircle2,
      tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
    },
    {
      label: 'Confirmed guests',
      value: String(confirmedGuestCount),
      helper: `${dashboard.guests.total} total guest ${
        dashboard.guests.total === 1 ? 'entry' : 'entries'
      }`,
      icon: UsersRound,
      tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
    },
    {
      label: 'Upcoming tasks',
      value: String(upcomingTaskCount),
      helper: `${dashboard.tasks.byStatus.IN_PROGRESS} currently in progress`,
      icon: ClipboardList,
      tone: 'bg-[rgba(142,92,103,0.18)] text-[var(--color-rosewood)]',
    },
  ];

  const timeline = [
    {
      label: 'Planning started',
      description: activeEvent ? 'Your event workspace is ready.' : 'Create your event workspace.',
      complete: Boolean(activeEvent),
    },
    {
      label: 'Tasks underway',
      description:
        dashboard.tasks.byStatus.COMPLETED > 0 || dashboard.tasks.byStatus.IN_PROGRESS > 0
          ? `${dashboard.tasks.byStatus.COMPLETED} completed so far.`
          : 'Add and begin your planning tasks.',
      complete: dashboard.tasks.byStatus.COMPLETED > 0 || dashboard.tasks.byStatus.IN_PROGRESS > 0,
    },
    {
      label: 'Vendors booked',
      description:
        dashboard.bookings.total > 0
          ? `${activeBookingCount} active ${activeBookingCount === 1 ? 'booking' : 'bookings'}.`
          : 'Compare vendors and confirm bookings.',
      complete: dashboard.bookings.total > 0,
    },
    {
      label: 'Final preparation',
      description:
        planningProgress >= 80
          ? 'Your event is approaching the final checks.'
          : 'Complete most tasks to reach this stage.',
      complete: planningProgress >= 80,
    },
  ];

  const firstIncompleteTimelineIndex = timeline.findIndex((item) => !item.complete);

  const currentTimelineIndex =
    firstIncompleteTimelineIndex === -1 ? timeline.length - 1 : firstIncompleteTimelineIndex;

  return (
    <div className="app-shell px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl">
              <CalendarDays className="size-5 text-[var(--color-deep-plum)]" />
            </span>

            <span className="flex flex-col leading-none">
              <span className="text-base font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                Eventure
              </span>

              <span className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Customer workspace
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/notifications"
              className="soft-chip text-sm font-bold transition hover:bg-[rgba(93,58,85,0.92)] hover:text-[#fffaf5]"
            >
              <Bell className="size-4" />
              {dashboard.notifications.unreadCount}{' '}
              {dashboard.notifications.unreadCount === 1 ? 'unread update' : 'unread updates'}
            </Link>

            <Link to="/vendors" className="btn-secondary text-sm font-bold">
              Browse vendors
            </Link>

            <Link to="/events" className="btn-primary text-sm font-bold">
              <Plus className="size-4" />
              My events
            </Link>

            <button
              type="button"
              className="btn-secondary text-sm font-bold"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </header>

        <main className="py-10">
          <section className="overflow-hidden rounded-[2.25rem] border border-white/55 bg-white/22 shadow-[0_28px_90px_rgba(31,27,29,0.10)] backdrop-blur-2xl">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
                <div
                  aria-hidden="true"
                  className="absolute -left-24 top-8 size-64 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 size-72 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl"
                />

                <div className="relative">
                  <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                    <LayoutDashboard className="size-4" />
                    Planning command centre
                  </div>

                  <h1 className="max-w-3xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl xl:text-6xl">
                    {getGreeting()}, {user.firstName}.
                  </h1>

                  <p className="mt-4 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/68">
                    {activeEvent
                      ? `Here is what needs your attention as you continue planning ${activeEvent.name}.`
                      : 'Create your first event and bring every planning detail into one organised workspace.'}
                  </p>

                  {activeEvent ? (
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link
                        to={`/events/${activeEvent.id}`}
                        className="btn-primary text-sm font-bold"
                      >
                        Open event workspace
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>

                      <Link
                        to={`/events/${activeEvent.id}/tasks`}
                        className="btn-secondary text-sm font-bold"
                      >
                        Review tasks
                        <ClipboardList className="size-4" />
                      </Link>
                    </div>
                  ) : (
                    <Link to="/events" className="btn-primary mt-8 w-fit text-sm font-bold">
                      Create your first event
                      <Plus aria-hidden="true" className="size-4" />
                    </Link>
                  )}

                  {activeEvent ? (
                    <div className="mt-10 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.35rem] border border-white/55 bg-white/30 p-4 backdrop-blur-xl">
                        <CalendarDays className="size-5 text-[var(--color-deep-plum)]" />

                        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                          Event date
                        </p>

                        <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                          {formatEventDate(activeEvent.eventDate)}
                        </p>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/55 bg-white/30 p-4 backdrop-blur-xl">
                        <ClipboardList className="size-5 text-[var(--color-rosewood)]" />

                        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                          Next priority
                        </p>

                        <p className="mt-2 line-clamp-2 text-sm font-black text-[var(--color-near-black)]">
                          {nextTask?.title ?? 'No pending task'}
                        </p>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/55 bg-white/30 p-4 backdrop-blur-xl">
                        <CheckCircle2 className="size-5 text-[#536044]" />

                        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                          Progress
                        </p>

                        <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                          {planningProgress}% completed
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-white/45 bg-[linear-gradient(145deg,rgba(93,58,85,0.96),rgba(130,72,77,0.92))] p-6 text-[#fffaf5] sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
                {activeEvent ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/55">
                          Active event
                        </p>

                        <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">
                          {activeEvent.name}
                        </h2>

                        <p className="mt-2 text-sm font-semibold text-white/66">
                          {activeEvent.eventType.replaceAll('_', ' ')} · {activeEvent.location}
                        </p>
                      </div>

                      <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-white/78 backdrop-blur">
                        {activeEvent.status.replaceAll('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-10">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-white/58">Planning progress</p>

                          <p className="mt-2 text-5xl font-black tracking-[-0.06em]">
                            {planningProgress}%
                          </p>
                        </div>

                        <p className="max-w-32 text-right text-sm font-semibold leading-6 text-white/58">
                          Based on completed event tasks
                        </p>
                      </div>

                      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/14">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#fffaf5,var(--color-powder-blue))] transition-[width] duration-700"
                          style={{
                            width: `${planningProgress}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-8 rounded-[1.5rem] border border-white/12 bg-white/10 p-5 backdrop-blur-xl">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/48">
                        Next deadline
                      </p>

                      <p className="mt-3 text-xl font-black tracking-[-0.03em]">
                        {nextTask?.title ?? 'Your task list is clear'}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-[var(--color-powder-blue)]">
                        {nextTask ? getDeadlineLabel(nextTask.dueDate) : 'Nothing urgent right now'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-80 flex-col justify-between">
                    <Sparkles className="size-7 text-[var(--color-powder-blue)]" />

                    <div className="mt-12">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/55">
                        Start planning
                      </p>

                      <h2 className="mt-3 text-4xl font-black tracking-[-0.05em]">
                        Your next event begins here.
                      </h2>

                      <p className="mt-4 leading-7 text-white/66">
                        Add the event date, location, budget, and guest estimate to unlock your full
                        planning workspace.
                      </p>
                    </div>

                    <Link
                      to="/events"
                      className="mt-8 flex items-center justify-between rounded-2xl bg-white/14 px-5 py-4 text-sm font-bold backdrop-blur transition hover:bg-white/20"
                    >
                      Set up an event
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, value, helper, icon: Icon, tone }) => (
              <article
                key={label}
                className="group relative overflow-hidden rounded-[1.75rem] border border-white/55 bg-white/26 p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[rgba(93,58,85,0.18)] hover:shadow-[0_24px_70px_rgba(31,27,29,0.12)]"
              >
                <div
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/18 blur-2xl transition-transform duration-500 group-hover:scale-125"
                />

                <div className="relative flex items-start justify-between">
                  <div className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
                    <Icon className="size-5" />
                  </div>

                  <span className="rounded-full bg-white/35 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/55">
                    Live
                  </span>
                </div>

                <p className="relative mt-8 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/48">
                  {label}
                </p>

                <p className="relative mt-3 text-4xl font-black tracking-[-0.06em] text-[var(--color-near-black)]">
                  {value}
                </p>

                <div className="relative mt-6 border-t border-white/45 pt-4">
                  <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                    {helper}
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="glass-card overflow-hidden p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Event journey
                  </p>

                  <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    See where your planning stands and what comes next.
                  </h2>
                </div>

                <span className="status-chip w-fit" data-tone="plum">
                  {activeEvent?.status.replaceAll('_', ' ') ?? 'Not started'}
                </span>
              </div>

              <div className="mt-9">
                {timeline.map((item, index) => {
                  const isCurrent = index === currentTimelineIndex;
                  const isLast = index === timeline.length - 1;

                  return (
                    <div key={item.label} className="relative flex gap-4">
                      <div className="flex w-10 shrink-0 flex-col items-center">
                        <div
                          className={`relative z-10 grid size-10 place-items-center rounded-full border transition ${
                            item.complete
                              ? 'border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] text-white shadow-[0_10px_25px_rgba(93,58,85,0.24)]'
                              : isCurrent
                                ? 'border-[rgba(93,58,85,0.28)] bg-white/55 text-[var(--color-deep-plum)] ring-4 ring-[rgba(183,167,200,0.18)]'
                                : 'border-white/55 bg-white/30 text-[var(--color-charcoal)]/42'
                          }`}
                        >
                          {item.complete ? (
                            <CheckCircle2 aria-hidden="true" className="size-5" />
                          ) : (
                            <span className="text-xs font-black">{index + 1}</span>
                          )}
                        </div>

                        {!isLast ? (
                          <div
                            aria-hidden="true"
                            className={`min-h-14 w-px flex-1 ${
                              item.complete
                                ? 'bg-[linear-gradient(var(--color-deep-plum),rgba(93,58,85,0.18))]'
                                : 'bg-white/55'
                            }`}
                          />
                        ) : null}
                      </div>

                      <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                        <div
                          className={`rounded-[1.35rem] border p-4 transition ${
                            isCurrent
                              ? 'border-[rgba(93,58,85,0.16)] bg-white/42 shadow-[0_14px_40px_rgba(31,27,29,0.07)]'
                              : 'border-white/45 bg-white/22'
                          }`}
                        >
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <p className="font-black text-[var(--color-near-black)]">
                              {item.label}
                            </p>

                            <span
                              className={`w-fit rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] ${
                                item.complete
                                  ? 'bg-[rgba(142,151,115,0.20)] text-[#465038]'
                                  : isCurrent
                                    ? 'bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]'
                                    : 'bg-white/35 text-[var(--color-charcoal)]/46'
                              }`}
                            >
                              {item.complete ? 'Complete' : isCurrent ? 'Next stage' : 'Upcoming'}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 overflow-hidden rounded-[1.65rem] border border-[rgba(93,58,85,0.12)] bg-[linear-gradient(135deg,rgba(255,255,255,0.42),rgba(183,167,200,0.15))]">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                          Next priority
                        </p>

                        {nextTask ? (
                          <span className="rounded-full bg-[rgba(142,92,103,0.14)] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                            {nextTask.priority}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        {nextTask?.title ?? 'Your task list is clear'}
                      </h3>

                      <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                        {nextTask
                          ? getDeadlineLabel(nextTask.dueDate)
                          : 'Nothing currently needs attention'}
                      </p>

                      {nextTask?.description ? (
                        <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-[var(--color-charcoal)]/60">
                          {nextTask.description}
                        </p>
                      ) : null}
                    </div>

                    {nextTask ? (
                      <Link
                        to={`/events/${nextTask.event.id}/tasks`}
                        className="btn-secondary shrink-0 text-sm font-bold"
                      >
                        Review task
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    ) : activeEvent ? (
                      <Link
                        to={`/events/${activeEvent.id}/tasks`}
                        className="btn-secondary shrink-0 text-sm font-bold"
                      >
                        Open task list
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    ) : (
                      <Link to="/events" className="btn-secondary shrink-0 text-sm font-bold">
                        Create an event
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>

            <aside className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-20 size-56 rounded-full bg-white/10 blur-3xl"
              />

              <div
                aria-hidden="true"
                className="absolute -bottom-24 -left-20 size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-11 place-items-center rounded-2xl border border-white/12 bg-white/10 backdrop-blur-xl">
                    <Sparkles className="size-5 text-[var(--color-powder-blue)]" />
                  </div>

                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-white/64 backdrop-blur-xl">
                    Shortcuts
                  </span>
                </div>

                <h2 className="mt-7 text-3xl font-black tracking-[-0.045em]">Continue planning</h2>

                <p className="mt-3 leading-7 text-white/66">
                  Jump straight into the work that keeps your event moving forward.
                </p>

                <div className="mt-8 space-y-3">
                  {activeEvent ? (
                    <>
                      <Link
                        to={`/events/${activeEvent.id}/quotation-requests`}
                        className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] transition group-hover:bg-white/18">
                          <ClipboardList className="size-5" />
                        </span>

                        <span className="min-w-0 flex-1 text-left">
                          <span className="block text-sm font-black">Request quotations</span>

                          <span className="mt-1 block text-xs font-semibold leading-5 text-white/54">
                            Send event details to suitable vendors.
                          </span>
                        </span>

                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-white/58 transition-transform group-hover:translate-x-1 group-hover:text-white"
                        />
                      </Link>

                      <Link
                        to={`/events/${activeEvent.id}/guests`}
                        className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] transition group-hover:bg-white/18">
                          <UsersRound className="size-5" />
                        </span>

                        <span className="min-w-0 flex-1 text-left">
                          <span className="block text-sm font-black">Manage guests</span>

                          <span className="mt-1 block text-xs font-semibold leading-5 text-white/54">
                            Review names, responses, and party sizes.
                          </span>
                        </span>

                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-white/58 transition-transform group-hover:translate-x-1 group-hover:text-white"
                        />
                      </Link>

                      <Link
                        to={`/events/${activeEvent.id}/bookings`}
                        className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] transition group-hover:bg-white/18">
                          <CheckCircle2 className="size-5" />
                        </span>

                        <span className="min-w-0 flex-1 text-left">
                          <span className="block text-sm font-black">Review bookings</span>

                          <span className="mt-1 block text-xs font-semibold leading-5 text-white/54">
                            Track confirmations and vendor commitments.
                          </span>
                        </span>

                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-white/58 transition-transform group-hover:translate-x-1 group-hover:text-white"
                        />
                      </Link>
                    </>
                  ) : (
                    <Link
                      to="/events"
                      className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] transition group-hover:bg-white/18">
                        <Plus className="size-5" />
                      </span>

                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-sm font-black">Create your first event</span>

                        <span className="mt-1 block text-xs font-semibold leading-5 text-white/54">
                          Unlock budgets, guests, tasks, vendors, and bookings.
                        </span>
                      </span>

                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-white/58 transition-transform group-hover:translate-x-1 group-hover:text-white"
                      />
                    </Link>
                  )}
                </div>

                <div className="mt-8 border-t border-white/12 pt-6">
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to="/notifications"
                      className="group rounded-[1.25rem] border border-white/10 bg-white/8 p-4 backdrop-blur-xl transition hover:border-white/18 hover:bg-white/13"
                    >
                      <Bell className="size-5 text-[var(--color-powder-blue)]" />

                      <p className="mt-4 text-2xl font-black">
                        {dashboard.notifications.unreadCount}
                      </p>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white/58">Unread updates</p>

                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 text-white/42 transition-transform group-hover:translate-x-0.5 group-hover:text-white/75"
                        />
                      </div>
                    </Link>

                    <div className="rounded-[1.25rem] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                      <FileCheck2 className="size-5 text-[var(--color-powder-blue)]" />

                      <p className="mt-4 text-2xl font-black">{dashboard.payments.pendingCount}</p>

                      <p className="mt-1 text-xs font-bold text-white/58">Pending payments</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
