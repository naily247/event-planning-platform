import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '../features/auth/useCurrentUser';
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
  MapPin,
  Plus,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AmbientBackground } from '../components/ui/AmbientBackground';
import { SectionHeader } from '../components/ui/SectionHeader';
import { clearAuthTokens } from '../features/auth/auth.storage';
import { HeroAtmosphere } from '../components/ui/HeroAtmosphere';
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

const getEventCountdownLabel = (eventDate: string) => {
  const days = getDaysUntil(eventDate);

  if (days < 0) {
    return 'Event date passed';
  }

  if (days === 0) {
    return 'Event is today';
  }

  if (days === 1) {
    return '1 day remaining';
  }

  return `${days} days remaining`;
};

export function DashboardPage() {
  const navigate = useNavigate();

  const currentUserQuery = useCurrentUser();

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
      <div className="app-shell relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
        <AmbientBackground variant="dashboard" />

        <div className="glass-card relative grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div
            aria-hidden="true"
            className="absolute -left-20 top-0 size-56 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl"
          />

          <div className="relative">
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Preparing your workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading your events, tasks, bookings, and planning activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (queryError || !currentUserQuery.data || !dashboardQuery.data) {
    return (
      <div className="app-shell relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
        <AmbientBackground variant="dashboard" />

        <div className="glass-card relative grid min-h-80 w-full max-w-3xl place-items-center overflow-hidden p-10 text-center">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-16 size-56 rounded-full bg-[rgba(142,92,103,0.16)] blur-3xl"
          />

          <div className="relative max-w-lg">
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

  const dashboard = dashboardQuery.data;
  const highlightedEvent = dashboard.events.upcomingEvent;

  const accountTaskProgress = getTaskProgress(dashboard.tasks.byStatus);

  const openTaskCount = dashboard.tasks.byStatus.TODO + dashboard.tasks.byStatus.IN_PROGRESS;

  const highlightedEventTask =
    dashboard.tasks.upcoming.find((task) => task.event.id === highlightedEvent?.id) ?? null;

  const nextAccountTask = dashboard.tasks.upcoming[0] ?? null;
  const displayedTask = highlightedEventTask ?? nextAccountTask;

  const confirmedGuestCount = dashboard.guests.byStatus.CONFIRMED;

  const activeBookingCount =
    dashboard.bookings.byStatus.CONFIRMED +
    dashboard.bookings.byStatus.DEPOSIT_PENDING +
    dashboard.bookings.byStatus.ACTIVE;

  const upcomingBookingValue = dashboard.bookings.upcoming.reduce((sum, booking) => {
    const amount = Number(booking.agreedCost);

    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const hasActiveBooking = activeBookingCount > 0;

  const stats = [
    {
      label: 'Highlighted budget',
      value: highlightedEvent?.plannedBudget
        ? formatCurrency(highlightedEvent.plannedBudget)
        : 'Not set',
      helper: highlightedEvent
        ? `${highlightedEvent.name} planned budget`
        : 'Create an event to set a budget',
      badge: highlightedEvent ? 'Event' : 'Setup',
      icon: WalletCards,
      tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
      glow: 'bg-[rgba(183,167,200,0.24)]',
    },
    {
      label: 'Upcoming booking value',
      value: formatCurrency(upcomingBookingValue),
      helper: `${dashboard.bookings.upcoming.length} upcoming ${
        dashboard.bookings.upcoming.length === 1 ? 'booking' : 'bookings'
      } shown`,
      badge: 'Upcoming',
      icon: CheckCircle2,
      tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
      glow: 'bg-[rgba(142,151,115,0.20)]',
    },
    {
      label: 'Confirmed guests',
      value: String(confirmedGuestCount),
      helper: `${dashboard.guests.total} total guest ${
        dashboard.guests.total === 1 ? 'entry' : 'entries'
      } across your events`,
      badge: 'Overall',
      icon: UsersRound,
      tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
      glow: 'bg-[rgba(175,201,216,0.24)]',
    },
    {
      label: 'Open tasks',
      value: String(openTaskCount),
      helper: `${dashboard.tasks.byStatus.IN_PROGRESS} currently in progress`,
      badge: 'Overall',
      icon: ClipboardList,
      tone: 'bg-[rgba(142,92,103,0.18)] text-[var(--color-rosewood)]',
      glow: 'bg-[rgba(142,92,103,0.18)]',
    },
  ];

  const timeline = [
    {
      label: 'Event workspace created',
      description:
        dashboard.events.total > 0
          ? `${dashboard.events.total} ${
              dashboard.events.total === 1 ? 'event is' : 'events are'
            } available in your account.`
          : 'Create your first event workspace.',
      complete: dashboard.events.total > 0,
    },
    {
      label: 'Planning underway',
      description:
        dashboard.tasks.byStatus.COMPLETED > 0 || dashboard.tasks.byStatus.IN_PROGRESS > 0
          ? `${dashboard.tasks.byStatus.COMPLETED} completed and ${
              dashboard.tasks.byStatus.IN_PROGRESS
            } in progress across your events.`
          : 'Add tasks and begin organising the work.',
      complete: dashboard.tasks.byStatus.COMPLETED > 0 || dashboard.tasks.byStatus.IN_PROGRESS > 0,
    },
    {
      label: 'Vendors confirmed',
      description: hasActiveBooking
        ? `${activeBookingCount} active ${
            activeBookingCount === 1 ? 'vendor booking' : 'vendor bookings'
          }.`
        : 'Compare quotations and confirm suitable vendors.',
      complete: hasActiveBooking,
    },
    {
      label: 'Final preparation',
      description:
        accountTaskProgress >= 80
          ? 'Most active planning tasks across your events are complete.'
          : 'Complete most active tasks to reach final preparation.',
      complete: accountTaskProgress >= 80,
    },
  ];

  const firstIncompleteTimelineIndex = timeline.findIndex((item) => !item.complete);

  const currentTimelineIndex =
    firstIncompleteTimelineIndex === -1 ? timeline.length - 1 : firstIncompleteTimelineIndex;

  return (
    <div className="relative min-h-full px-4 pb-6 pt-3 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <AmbientBackground variant="dashboard" />

      {highlightedEvent ? (
        <div
  aria-hidden="true"
  className="pointer-events-none absolute -top-[10.5rem] right-0 z-0 hidden h-[52.5rem] w-[56vw] min-w-[46rem] overflow-hidden lg:block"
  style={{
    WebkitMaskImage:
      'linear-gradient(180deg, black 0%, black 60%, rgba(0,0,0,0.94) 68%, rgba(0,0,0,0.72) 76%, rgba(0,0,0,0.42) 84%, rgba(0,0,0,0.16) 91%, transparent 100%)',
    maskImage:
      'linear-gradient(180deg, black 0%, black 60%, rgba(0,0,0,0.94) 68%, rgba(0,0,0,0.72) 76%, rgba(0,0,0,0.42) 84%, rgba(0,0,0,0.16) 91%, transparent 100%)',
  }}
>
          <img
            src="/images/workspaces/dashboard-hero.png"
            alt=""
            className="absolute -inset-[0%] size-[100%] object-cover"
            style={{
              objectPosition: '72% center',
              opacity: 1.0,
              filter: ' saturate(0.96) contrast(0.98)',
              WebkitMaskImage:
                'radial-gradient(ellipse 118% 116% at 100% 0%, black 0%, black 45%, rgba(0,0,0,0.86) 58%, rgba(0,0,0,0.48) 73%, rgba(0,0,0,0.14) 87%, transparent 98%)',
              maskImage:
                'radial-gradient(ellipse 118% 116% at 100% 0%, black 0%, black 45%, rgba(0,0,0,0.86) 58%, rgba(0,0,0,0.48) 73%, rgba(0,0,0,0.14) 87%, transparent 98%)',
            }}
          />

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,239,233,0.94)_0%,rgba(246,239,233,0.58)_17%,rgba(246,239,233,0.18)_38%,transparent_64%)]" />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(73,43,68,0.02)_0%,rgba(93,58,85,0.03)_38%,rgba(190,163,162,0.08)_60%,rgba(224,209,201,0.22)_78%,rgba(239,228,219,0.42)_100%)]" />

          <div className="absolute -bottom-[8%] left-[10%] h-[54%] w-[92%] bg-[radial-gradient(ellipse_at_bottom,rgba(224,209,201,0.52),rgba(190,163,162,0.11)_44%,transparent_82%)] blur-3xl" />

          <div className="absolute -right-24 -top-24 size-[28rem] rounded-full bg-[rgba(255,210,190,0.1)] blur-3xl" />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto max-w-7xl">
        <main className="relative z-10 pb-10 pt-3">
          <section className="group/hero relative isolate overflow-visible rounded-[2.35rem] border border-white/20 bg-[linear-gradient(128deg,rgba(73,43,68,0.99),rgba(112,61,78,0.97)_48%,rgba(98,77,110,0.95))] text-[#fffaf5] shadow-[0_30px_90px_rgba(93,58,85,0.28)] animate-[heroFloat_2s_ease-in-out_infinite] transition-[transform,box-shadow] duration-500 ease-out hover:!translate-y-[-0.55rem] hover:shadow-[0_38px_110px_rgba(93,58,85,0.36)]">
            <HeroAtmosphere
              imageSrc={highlightedEvent ? '/images/workspaces/dashboard-hero.png' : undefined}
              imagePosition="68% center"
              imageOpacity={0.92}
            />

            {highlightedEvent ? (
              <div className="relative z-10 grid gap-10 p-6 :p-8 lg:min-h-[34rem] lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:p-10 xl:p-12">
                <div className="relative z-10 flex min-w-0 flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-[0.64rem] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur-xl">
                      <LayoutDashboard className="size-3.5 text-[var(--color-powder-blue)]" />
                      Planning command centre
                    </span>

                    <span className="rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-[0.64rem] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur-xl">
                      {highlightedEvent.status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <p className="mt-8 text-sm font-bold text-white/58">
                    {getGreeting()}, {currentUserQuery.data.firstName}.
                  </p>

                  <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.06em] sm:text-5xl lg:text-[3.7rem] lg:leading-[1.01]">
                    Everything for{' '}
                    <span className="text-[var(--color-powder-blue)]">{highlightedEvent.name}</span>{' '}
                    is ready in one workspace.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-white/66">
                    Keep the important details moving from one focused place. Review the next task,
                    coordinate guests, compare vendors, and stay ready for the day ahead.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/66">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-[var(--color-powder-blue)]" />
                      {formatEventDate(highlightedEvent.eventDate)}
                    </span>

                    <span className="flex items-center gap-2">
                      <MapPin className="size-4 text-[var(--color-powder-blue)]" />
                      {highlightedEvent.location}
                    </span>

                    <span className="flex items-center gap-2">
                      <UsersRound className="size-4 text-[var(--color-powder-blue)]" />
                      {highlightedEvent.guestCount ?? 0}{' '}
                      {(highlightedEvent.guestCount ?? 0) === 1 ? 'guest' : 'guests'}
                    </span>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      to={`/events/${highlightedEvent.id}`}
                      className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black !text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fffaf5] hover:shadow-[0_18px_42px_rgba(31,27,29,0.24)]"
                    >
                      Continue planning
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                      />
                    </Link>

                    <Link
                      to={`/events/${highlightedEvent.id}/tasks`}
                      className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/16"
                    >
                      Review event tasks
                      <ClipboardList className="size-4 transition-transform duration-300 group-hover:scale-105" />
                    </Link>
                  </div>
                </div>

                <div className="relative min-h-[25rem] lg:min-h-0">
                  <div
                    aria-hidden="true"
                    className="absolute left-[8%] top-[8%] size-44 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                  />

                  <div
                    aria-hidden="true"
                    className="absolute bottom-[7%] right-[3%] size-52 rounded-full bg-[rgba(255,199,169,0.12)] blur-3xl"
                  />

                  <div className="relative mx-auto h-full max-w-xl lg:max-w-none">
                    <div className="absolute left-0 top-[8%] w-[78%] rounded-[1.8rem] border border-white/14 bg-white/[0.11] p-5 shadow-[0_24px_70px_rgba(31,27,29,0.16)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.14] sm:p-6 lg:left-[2%] lg:w-[82%]">
                      <div className="flex items-start justify-between gap-5">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/48">
                            Event countdown
                          </p>

                          <p className="mt-3 text-[2.65rem] font-black leading-none tracking-[-0.06em] sm:text-5xl">
                            {getDaysUntil(highlightedEvent.eventDate) < 0
                              ? 'Passed'
                              : Math.max(getDaysUntil(highlightedEvent.eventDate), 0)}
                          </p>

                          <p className="mt-2 text-sm font-black text-[var(--color-powder-blue)]">
                            {getDaysUntil(highlightedEvent.eventDate) < 0
                              ? 'Event date passed'
                              : getDaysUntil(highlightedEvent.eventDate) === 1
                                ? 'day remaining'
                                : 'days remaining'}
                          </p>
                        </div>

                        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-[var(--color-powder-blue)]">
                          <CalendarDays className="size-5" />
                        </span>
                      </div>

                      <div className="mt-6 border-t border-white/12 pt-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">
                          Scheduled date
                        </p>

                        <p className="mt-2 text-sm font-bold text-white/70">
                          {formatEventDate(highlightedEvent.eventDate)}
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-[5%] left-[4%] w-[58%] rounded-[1.55rem] border border-white/13 bg-[rgba(58,35,58,0.34)] p-5 shadow-[0_22px_60px_rgba(31,27,29,0.18)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-[rgba(58,35,58,0.42)] sm:w-[54%] lg:left-0 lg:w-[58%]">
                      <ClipboardList className="size-5 text-[var(--color-powder-blue)]" />

                      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/46">
                        Priority task
                      </p>

                      <p className="mt-2 line-clamp-2 text-base font-black tracking-[-0.025em]">
                        {highlightedEventTask?.title ?? 'No upcoming task'}
                      </p>

                      <p className="mt-2 text-xs font-bold text-[var(--color-powder-blue)]">
                        {highlightedEventTask
                          ? getDeadlineLabel(highlightedEventTask.dueDate)
                          : 'Your event task list is clear'}
                      </p>
                    </div>

                    <div className="absolute bottom-[2%] right-0 w-[48%] rounded-[1.55rem] border border-white/13 bg-white/[0.12] p-5 shadow-[0_22px_60px_rgba(31,27,29,0.16)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.16] sm:w-[43%] lg:w-[46%]">
                      <WalletCards className="size-5 text-[var(--color-powder-blue)]" />

                      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/46">
                        Planned budget
                      </p>

                      <p className="mt-2 text-xl font-black tracking-[-0.035em]">
                        {highlightedEvent.plannedBudget
                          ? formatCurrency(highlightedEvent.plannedBudget)
                          : 'Not set'}
                      </p>

                      <Link
                        to={`/events/${highlightedEvent.id}/budget`}
                        className="group mt-3 inline-flex items-center gap-1.5 text-xs font-black text-[var(--color-powder-blue)] transition hover:text-white"
                      >
                        Review budget
                        <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative z-10 grid gap-10 p-6 ... sm:p-8 lg:min-h-[32rem] lg:grid-cols-[1.08fr_0.92fr] lg:p-10 xl:p-12">
                <div className="relative z-10 flex flex-col justify-center">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3.5 py-2 text-[0.64rem] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur-xl">
                    <Sparkles className="size-3.5 text-[var(--color-powder-blue)]" />
                    Planning command centre
                  </span>

                  <p className="mt-8 text-sm font-bold text-white/58">
                    {getGreeting()}, {currentUserQuery.data.firstName}.
                  </p>

                  <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.06em] sm:text-5xl lg:text-[3.7rem] lg:leading-[1.01]">
                    Your next event begins here.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-white/66">
                    Create an event workspace and bring your schedule, budget, guests, vendors,
                    documents, and bookings into one beautifully organised place.
                  </p>

                  <Link
                    to="/events"
                    className="group mt-8 inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black !text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fffaf5] hover:shadow-[0_18px_42px_rgba(31,27,29,0.24)]"
                  >
                    Set up an event
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>

                <div className="relative min-h-[24rem]">
                  <div
                    aria-hidden="true"
                    className="absolute left-[10%] top-[4%] size-48 rounded-full bg-[rgba(183,167,200,0.2)] blur-3xl"
                  />

                  <div className="absolute left-[4%] top-[4%] w-[66%] rounded-[1.7rem] border border-white/16 bg-white/[0.15] p-5 shadow-[0_22px_60px_rgba(31,27,29,0.18)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.19]">
                    <ClipboardList className="size-5 text-[var(--color-powder-blue)]" />

                    <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/46">
                      Plan the work
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-white/64">
                      Build tasks, dates, and priorities in one organised workspace.
                    </p>
                  </div>

                  <div className="absolute right-[2%] top-[26%] w-[50%] rounded-[1.7rem] border border-white/16 bg-[rgba(58,35,58,0.48)] p-5 shadow-[0_24px_64px_rgba(31,27,29,0.22)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-[rgba(58,35,58,0.56)]">
                    <UsersRound className="size-5 text-[var(--color-powder-blue)]" />

                    <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/46">
                      Manage guests
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-white/64">
                      Keep invitations, responses, and party sizes clear.
                    </p>
                  </div>

                  <div className="absolute bottom-[3%] left-[12%] w-[62%] rounded-[1.7rem] border border-white/16 bg-white/[0.16] p-5 shadow-[0_22px_60px_rgba(31,27,29,0.18)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.2]">
                    <WalletCards className="size-5 text-[var(--color-powder-blue)]" />

                    <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/46">
                      Stay in control
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-white/64">
                      Coordinate budgets, vendors, bookings, and documents together.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="mt-8">
            <SectionHeader
              eyebrow="Account pulse"
              icon={<Sparkles className="size-4" />}
              title="Your planning activity at a glance."
              description="A quick account-wide view of your budget, upcoming bookings, guests, and active work."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map(({ label, value, helper, badge, icon: Icon, tone, glow }) => (
                <article
                  key={label}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-white/55 bg-white/28 p-6 shadow-[0_16px_45px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-500 ease-out hover:-translate-y-2 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/42 hover:shadow-[0_28px_80px_rgba(31,27,29,0.14)]"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)] opacity-0 blur-sm transition-all duration-700 ease-out group-hover:left-[115%] group-hover:opacity-100"
                  />
                  <div
                    aria-hidden="true"
                    className={`absolute -right-10 -top-10 size-32 rounded-full ${glow} blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-90`}
                  />

                  <div className="relative flex items-start justify-between">
                    <div
                      className={`grid size-12 place-items-center rounded-2xl ${tone} shadow-[0_10px_24px_rgba(31,27,29,0.06)] transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:rotate-2 group-hover:scale-110 group-hover:shadow-[0_16px_34px_rgba(31,27,29,0.12)]`}
                    >
                      <Icon className="size-5" />
                    </div>

                    <span className="rounded-full border border-transparent bg-white/38 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/55 transition-all duration-300 group-hover:border-white/55 group-hover:bg-white/60 group-hover:text-[var(--color-deep-plum)]">
                      {' '}
                      {badge}
                    </span>
                  </div>

                  <p className="relative mt-8 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/48">
                    {label}
                  </p>

                  <p className="relative mt-3 text-4xl font-black tracking-[-0.06em] text-[var(--color-near-black)] transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.025]">
                    {' '}
                    {value}
                  </p>

                  <div className="relative mt-6 border-t border-white/45 pt-4">
                    <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                      {helper}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="glass-card overflow-hidden p-6 sm:p-7">
              <SectionHeader
                eyebrow="Planning journey"
                icon={<CheckCircle2 className="size-4" />}
                title="See how your customer account is progressing."
                description="This journey summarises planning activity across all of your Eventure events."
                badge={
                  <span className="status-chip" data-tone="plum">
                    {accountTaskProgress}% tasks complete
                  </span>
                }
              />

              <div className="mt-9">
                {timeline.map((item, index) => {
                  const isCurrent = index === currentTimelineIndex;
                  const isLast = index === timeline.length - 1;

                  return (
                    <div key={item.label} className="group/step relative flex gap-4">
                      <div className="flex w-10 shrink-0 flex-col items-center">
                        <div
                          className={`relative z-10 grid size-10 place-items-center rounded-full border transition-all duration-500 ease-out group-hover/step:-translate-y-0.5 group-hover/step:scale-110 ${
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
                            className={`min-h-14 w-px flex-1 transition-all duration-500 group-hover/step:w-[2px] ${
                              item.complete
                                ? 'bg-[linear-gradient(var(--color-deep-plum),rgba(93,58,85,0.18))] group-hover/step:bg-[linear-gradient(var(--color-deep-plum),rgba(93,58,85,0.38))]'
                                : 'bg-white/55 group-hover/step:bg-[rgba(93,58,85,0.22)]'
                            }`}
                          />
                        ) : null}
                      </div>

                      <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                        <div
                          className={`rounded-[1.35rem] border p-4 transition-all duration-500 ease-out group-hover/step:translate-x-1.5 group-hover/step:border-[rgba(93,58,85,0.20)] group-hover/step:bg-white/40 group-hover/step:shadow-[0_18px_48px_rgba(31,27,29,0.09)] ${
                            isCurrent
                              ? 'border-[rgba(93,58,85,0.16)] bg-white/42 shadow-[0_14px_40px_rgba(31,27,29,0.07)]'
                              : 'border-white/45 bg-white/22 hover:bg-white/32'
                          }`}
                        >
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <p className="font-black text-[var(--color-near-black)]">
                              {item.label}
                            </p>

                            <span
                              className={`w-fit rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] transition-all duration-300 group-hover/step:scale-105 ${
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

              <div className="group/priority relative mt-8 overflow-hidden rounded-[1.65rem] border border-[rgba(93,58,85,0.12)] bg-[linear-gradient(135deg,rgba(255,255,255,0.48),rgba(183,167,200,0.17))] shadow-[0_12px_36px_rgba(31,27,29,0.04)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[rgba(93,58,85,0.20)] hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(183,167,200,0.24))] hover:shadow-[0_24px_65px_rgba(31,27,29,0.11)]">
                <div
                  aria-hidden="true"
                  className="absolute -right-20 -top-24 size-56 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition-all duration-700 group-hover/priority:scale-125 group-hover/priority:bg-[rgba(183,167,200,0.28)]"
                />{' '}
                <div className="relative p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                          Next account priority
                        </p>

                        {displayedTask ? (
                          <span className="rounded-full bg-[rgba(142,92,103,0.14)] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                            {displayedTask.priority}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        {displayedTask?.title ?? 'Your task list is clear'}
                      </h3>

                      {displayedTask ? (
                        <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                          {displayedTask.event.name} · {getDeadlineLabel(displayedTask.dueDate)}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                          Nothing currently needs attention
                        </p>
                      )}

                      {displayedTask?.description ? (
                        <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-[var(--color-charcoal)]/60">
                          {displayedTask.description}
                        </p>
                      ) : null}
                    </div>

                    {displayedTask ? (
                      <Link
                        to={`/events/${displayedTask.event.id}/tasks`}
                        className="btn-secondary group/button shrink-0 text-sm font-bold transition-all duration-300 group-hover/priority:-translate-y-0.5 group-hover/priority:shadow-[0_14px_34px_rgba(31,27,29,0.12)]"
                      >
                        Review task
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 transition-transform duration-300 group-hover/button:translate-x-1"
                        />
                      </Link>
                    ) : highlightedEvent ? (
                      <Link
                        to={`/events/${highlightedEvent.id}/tasks`}
                        className="btn-secondary group/button shrink-0 text-sm font-bold transition-all duration-300 group-hover/priority:-translate-y-0.5 group-hover/priority:shadow-[0_14px_34px_rgba(31,27,29,0.12)]"
                      >
                        Open task list
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 transition-transform duration-300 group-hover/button:translate-x-1"
                        />
                      </Link>
                    ) : (
                      <Link
                        to="/events"
                        className="btn-secondary group/button shrink-0 text-sm font-bold transition-all duration-300 group-hover/priority:-translate-y-0.5 group-hover/priority:shadow-[0_14px_34px_rgba(31,27,29,0.12)]"
                      >
                        Create an event
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 transition-transform duration-300 group-hover/button:translate-x-1"
                        />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>

            <aside className="group/access relative self-start overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(93,58,85,0.36)]">
              {' '}
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-20 size-56 rounded-full bg-white/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-24 -left-20 size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />
              <div className="relative">
                <SectionHeader
                  eyebrow="Quick access"
                  icon={<Sparkles className="size-4" />}
                  title="Continue planning"
                  description={
                    highlightedEvent
                      ? 'Jump straight into the work that keeps your highlighted event moving forward.'
                      : 'Create an event workspace to unlock your planning tools and begin coordinating every detail.'
                  }
                  tone="light"
                />

                <div className="mt-8 space-y-3">
                  {highlightedEvent ? (
                    <>
                      <Link
                        to={`/events/${highlightedEvent.id}/quotations`}
                        className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:translate-x-0.5 hover:border-white/24 hover:bg-white/18 hover:shadow-[0_16px_36px_rgba(31,27,29,0.18)]"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] transition group-hover:bg-white/18">
                          <ClipboardList className="size-5" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black transition-colors duration-300 group-hover:text-white">
                            {' '}
                            quotations
                          </span>

                          <span className="mt-1 block text-xs font-semibold leading-5 text-white/54 transition-colors duration-300 group-hover:text-white/70">
                            {' '}
                            Send event details to suitable vendors.
                          </span>
                        </span>

                        <ArrowRight className="size-4 shrink-0 text-white/58 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                      </Link>

                      <Link
                        to={`/events/${highlightedEvent.id}/guests`}
                        className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:translate-x-0.5 hover:border-white/24 hover:bg-white/18 hover:shadow-[0_16px_36px_rgba(31,27,29,0.18)]"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] transition group-hover:bg-white/18">
                          <UsersRound className="size-5" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black transition-colors duration-300 group-hover:text-white">
                            Manage guests
                          </span>

                          <span className="mt-1 block text-xs font-semibold leading-5 text-white/54 transition-colors duration-300 group-hover:text-white/70">
                            {' '}
                            Review names, responses, and party sizes.
                          </span>
                        </span>

                        <ArrowRight className="size-4 shrink-0 text-white/58 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                      </Link>

                      <Link
                        to={`/events/${highlightedEvent.id}/bookings`}
                        className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:translate-x-0.5 hover:border-white/24 hover:bg-white/18 hover:shadow-[0_16px_36px_rgba(31,27,29,0.18)]"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] transition group-hover:bg-white/18">
                          <CheckCircle2 className="size-5" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black transition-colors duration-300 group-hover:text-white">
                            Review bookings
                          </span>

                          <span className="mt-1 block text-xs font-semibold leading-5 text-white/54 transition-colors duration-300 group-hover:text-white/70">
                            {' '}
                            Track confirmations and vendor commitments.
                          </span>
                        </span>

                        <ArrowRight className="size-4 shrink-0 text-white/58 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                      </Link>
                    </>
                  ) : (
                    <Link
                      to="/events"
                      className="group flex w-full items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:translate-x-0.5 hover:border-white/24 hover:bg-white/18 hover:shadow-[0_16px_36px_rgba(31,27,29,0.18)]"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-[var(--color-powder-blue)] transition group-hover:bg-white/18">
                        <Plus className="size-5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black transition-colors duration-300 group-hover:text-white">
                          Create your first event
                        </span>

                        <span className="mt-1 block text-xs font-semibold leading-5 text-white/54 transition-colors duration-300 group-hover:text-white/70">
                          Unlock budgets, guests, tasks, vendors, and bookings.
                        </span>
                      </span>

                      <ArrowRight className="size-4 shrink-0 text-white/58 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                    </Link>
                  )}
                </div>

                <div className="mt-8 border-t border-white/12 pt-6">
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to="/notifications"
                      className="group rounded-[1.25rem] border border-white/10 bg-white/8 p-4 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/22 hover:bg-white/16 hover:shadow-[0_16px_35px_rgba(31,27,29,0.16)]"
                    >
                      <Bell className="size-5 text-[var(--color-powder-blue)] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(175,201,216,0.65)]" />

                      <p className="mt-4 text-2xl font-black transition-all duration-500 group-hover:-translate-y-0.5 group-hover:text-white">
                        {dashboard.notifications.unreadCount}
                      </p>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white/58">Unread updates</p>

                        <ArrowRight className="size-3.5 text-white/42 transition-transform group-hover:translate-x-0.5 group-hover:text-white/75" />
                      </div>
                    </Link>

                    <div className="group rounded-[1.25rem] border border-white/10 bg-white/8 p-4 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/22 hover:bg-white/16 hover:shadow-[0_16px_35px_rgba(31,27,29,0.16)]">
                      {' '}
                      <FileCheck2 className="size-5 text-[var(--color-powder-blue)] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(175,201,216,0.65)]" />
                      <p className="mt-4 text-2xl font-black transition-all duration-500 group-hover:-translate-y-0.5 group-hover:text-white">
                        {dashboard.payments.pendingCount}
                      </p>
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
