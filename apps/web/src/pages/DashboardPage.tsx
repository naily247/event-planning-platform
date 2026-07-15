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
      label: 'Planning',
      active: Boolean(activeEvent),
    },
    {
      label: 'Tasks',
      active: dashboard.tasks.byStatus.COMPLETED > 0 || dashboard.tasks.byStatus.IN_PROGRESS > 0,
    },
    {
      label: 'Vendors',
      active: dashboard.bookings.total > 0,
    },
    {
      label: 'Final checks',
      active: planningProgress >= 80,
    },
  ];

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
              {dashboard.notifications.unreadCount} unread
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
          <section className="grid gap-6 lg:grid-cols-[1fr_0.42fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <LayoutDashboard className="size-4" />
                Customer workspace
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                {getGreeting()}, {user.firstName}. Your event is moving beautifully.
              </h1>

              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                Keep an eye on budgets, bookings, upcoming tasks, guest responses, and the next
                decisions that need your attention.
              </p>
            </div>

            <div className="glass-card p-5">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Active event</p>

              {activeEvent ? (
                <>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    {activeEvent.name}
                  </h2>

                  <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                    {formatEventDate(activeEvent.eventDate)} · {activeEvent.location}
                  </p>

                  <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/40">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))]"
                      style={{
                        width: `${planningProgress}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/62">
                    {planningProgress}% task progress
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    No upcoming event
                  </h2>

                  <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                    Create an event to begin planning.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, value, helper, icon: Icon, tone }) => (
              <article key={label} className="luxe-card p-6">
                <div className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
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

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Event overview
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Planning, vendors, and bookings in one flow.
                  </h2>
                </div>

                <span className="status-chip w-fit" data-tone="plum">
                  {activeEvent?.status.replaceAll('_', ' ') ?? 'No active event'}
                </span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                {timeline.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/28 p-4 backdrop-blur-xl">
                    <div
                      className={
                        item.active
                          ? 'size-3 rounded-full bg-[var(--color-deep-plum)]'
                          : 'size-3 rounded-full bg-[var(--color-pearl-gray)]'
                      }
                    />

                    <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/68">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl">
                <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Next deadline</p>

                <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {nextTask?.title ?? 'No upcoming task'}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[var(--color-rosewood)]">
                      {nextTask ? getDeadlineLabel(nextTask.dueDate) : 'Your task list is clear'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary text-sm font-bold"
                    disabled={!nextTask}
                  >
                    Review details
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </article>

            <aside className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
              <Sparkles className="size-6 text-[var(--color-powder-blue)]" />

              <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Quick actions</h2>

              <p className="mt-3 leading-7 text-white/68">
                Continue the most important planning work without hunting through messages or
                spreadsheets.
              </p>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  className="w-full rounded-2xl bg-white/14 px-4 py-3 text-left text-sm font-bold backdrop-blur transition hover:bg-white/20"
                >
                  Create a quotation request
                </button>

                <button
                  type="button"
                  className="w-full rounded-2xl bg-white/14 px-4 py-3 text-left text-sm font-bold backdrop-blur transition hover:bg-white/20"
                >
                  Update guest list
                </button>

                <Link
                  to="/notifications"
                  className="block w-full rounded-2xl bg-white/14 px-4 py-3 text-left text-sm font-bold backdrop-blur transition hover:bg-white/20"
                >
                  Review notifications
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <FileCheck2 className="size-5 text-[var(--color-powder-blue)]" />

                  <p className="mt-4 text-2xl font-black">{dashboard.payments.pendingCount}</p>

                  <p className="mt-1 text-xs font-bold text-white/62">Pending payments</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <Bell className="size-5 text-[var(--color-powder-blue)]" />

                  <p className="mt-4 text-2xl font-black">{dashboard.notifications.unreadCount}</p>

                  <p className="mt-1 text-xs font-bold text-white/62">Unread updates</p>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
