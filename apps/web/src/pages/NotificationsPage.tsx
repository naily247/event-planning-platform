import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BellDot,
  CalendarClock,
  Check,
  CheckCheck,
  CircleAlert,
  CircleDollarSign,
  CircleUserRound,
  FileWarning,
  LoaderCircle,
  MessageSquareQuote,
  PackageCheck,
  RefreshCcw,
  SearchX,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  getNotifications,
  getNotificationSummary,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  notificationTypes,
  type Notification,
  type NotificationReadStatus,
  type NotificationSort,
  type NotificationType,
} from '../features/notifications/notification.api';
import { PageBackButton } from '../components/navigation/PageBackButton';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const notificationTypeLabels: Record<NotificationType, string> = {
  BOOKING_CREATED: 'Booking created',
  BOOKING_CONFIRMED: 'Booking confirmed',
  BOOKING_REJECTED: 'Booking rejected',
  BOOKING_CANCELLED: 'Booking cancelled',
  BOOKING_COMPLETED: 'Booking completed',
  QUOTATION_REQUEST_RECEIVED: 'Quotation request received',
  QUOTATION_SENT: 'Quotation sent',
  QUOTATION_ACCEPTED: 'Quotation accepted',
  PAYMENT_SUBMITTED: 'Payment submitted',
  PAYMENT_VERIFIED: 'Payment verified',
  PAYMENT_REJECTED: 'Payment rejected',
  VENDOR_APPROVED: 'Vendor approved',
  VENDOR_REJECTED: 'Vendor rejected',
  COMPLAINT_CREATED: 'Complaint created',
  COMPLAINT_MESSAGE_RECEIVED: 'Complaint message received',
  COMPLAINT_STATUS_CHANGED: 'Complaint status changed',
  SYSTEM: 'System notification',
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error
      ? error.message
      : 'Something went wrong while loading notifications.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'Something went wrong while loading notifications.'
  );
};

const formatNotificationDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatRelativeNotificationDate = (value: string) => {
  const createdAt = new Date(value);
  const difference = Date.now() - createdAt.getTime();

  if (!Number.isFinite(createdAt.getTime())) {
    return 'Recently';
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) {
    return 'Just now';
  }

  if (difference < hour) {
    const minutes = Math.floor(difference / minute);

    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  if (difference < day) {
    const hours = Math.floor(difference / hour);

    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  if (difference < 7 * day) {
    const days = Math.floor(difference / day);

    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  return formatNotificationDate(value);
};

const getNotificationIcon = (type: NotificationType) => {
  if (type.startsWith('BOOKING_')) {
    return PackageCheck;
  }

  if (type.startsWith('QUOTATION_')) {
    return MessageSquareQuote;
  }

  if (type.startsWith('PAYMENT_')) {
    return CircleDollarSign;
  }

  if (type.startsWith('VENDOR_')) {
    return ShieldCheck;
  }

  if (type.startsWith('COMPLAINT_')) {
    return FileWarning;
  }

  return Bell;
};

const getNotificationTone = (
  type: NotificationType,
): 'gray' | 'blue' | 'green' | 'plum' | 'rose' => {
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_COMPLETED':
    case 'QUOTATION_ACCEPTED':
    case 'PAYMENT_VERIFIED':
    case 'VENDOR_APPROVED':
      return 'green';

    case 'BOOKING_REJECTED':
    case 'BOOKING_CANCELLED':
    case 'PAYMENT_REJECTED':
    case 'VENDOR_REJECTED':
    case 'COMPLAINT_CREATED':
      return 'rose';

    case 'QUOTATION_REQUEST_RECEIVED':
    case 'QUOTATION_SENT':
    case 'COMPLAINT_MESSAGE_RECEIVED':
    case 'COMPLAINT_STATUS_CHANGED':
      return 'plum';

    case 'BOOKING_CREATED':
    case 'PAYMENT_SUBMITTED':
      return 'blue';

    case 'SYSTEM':
    default:
      return 'gray';
  }
};

const getNotificationIconSurfaceClass = (type: NotificationType) => {
  const tone = getNotificationTone(type);

  switch (tone) {
    case 'green':
      return 'bg-[rgba(89,133,113,0.14)] text-[#3f735d]';

    case 'rose':
      return 'bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]';

    case 'blue':
      return 'bg-[rgba(175,201,216,0.22)] text-[var(--color-deep-plum)]';

    case 'plum':
      return 'bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]';

    case 'gray':
    default:
      return 'bg-white/38 text-[var(--color-charcoal)]/62';
  }
};

const getContextualLink = (notification: Notification) => {
  if (!notification.entityId || !notification.entityType) {
    return null;
  }

  const normalizedEntityType = notification.entityType
    .trim()
    .toUpperCase()
    .replaceAll('-', '_')
    .replaceAll(' ', '_');

  switch (normalizedEntityType) {
    case 'EVENT':
      return `/events/${notification.entityId}`;

    case 'VENDOR':
    case 'VENDOR_PROFILE':
      return `/vendors/${notification.entityId}`;

    default:
      return null;
  }
};

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<NotificationReadStatus>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [sort, setSort] = useState<NotificationSort>('newest');
  const [page, setPage] = useState(1);

  const notificationsQuery = useQuery({
    queryKey: [
      'notifications',
      {
        page,
        status: statusFilter,
        type: typeFilter,
        sort,
      },
    ],
    queryFn: () =>
      getNotifications({
        page,
        limit: 20,
        status: statusFilter,
        type: typeFilter || undefined,
        sort,
      }),
  });

  const notificationSummaryQuery = useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: getNotificationSummary,
  });

  const invalidateNotificationQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['notifications'],
    });
  };

  const markNotificationAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),

    onSuccess: async () => {
      await invalidateNotificationQueries();
    },
  });

  const markAllNotificationsAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,

    onSuccess: async () => {
      await invalidateNotificationQueries();
    },
  });

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('');
    setSort('newest');
    setPage(1);
  };

  const filtersAreActive = statusFilter !== 'all' || Boolean(typeFilter) || sort !== 'newest';

  if (notificationsQuery.isLoading || notificationSummaryQuery.isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your notifications
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading recent platform activity and updates requiring your attention.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    notificationsQuery.isError ||
    notificationSummaryQuery.isError ||
    !notificationsQuery.data ||
    !notificationSummaryQuery.data
  ) {
    const firstError = notificationsQuery.error ?? notificationSummaryQuery.error;

    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Notifications unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getApiErrorMessage(firstError)}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="btn-primary text-sm font-bold"
                onClick={() => {
                  void Promise.all([
                    notificationsQuery.refetch(),
                    notificationSummaryQuery.refetch(),
                  ]);
                }}
              >
                <RefreshCcw className="size-4" />
                Try again
              </button>

              <Link to="/dashboard" className="btn-secondary text-sm font-bold">
                <ArrowLeft className="size-4" />
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const notifications = notificationsQuery.data.notifications;
  const pagination = notificationsQuery.data.pagination;

  const totalCount = notificationSummaryQuery.data.totalCount;
  const unreadCount = notificationSummaryQuery.data.unreadCount;
  const readCount = notificationSummaryQuery.data.readCount;

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PageBackButton fallback="/dashboard" label="Dashboard" className="shrink-0" />

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Notification centre
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                Your latest updates
              </h1>
            </div>
          </div>

          <span className="status-chip w-fit" data-tone={unreadCount > 0 ? 'plum' : 'green'}>
            {unreadCount > 0 ? <BellDot className="size-4" /> : <CheckCheck className="size-4" />}
            {unreadCount} unread
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden rounded-[2.75rem] border border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.36),rgba(255,255,255,0.15))] px-7 py-10 shadow-[0_24px_80px_rgba(31,27,29,0.08)] backdrop-blur-3xl sm:px-10 lg:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 top-0 size-80 rounded-full bg-[rgba(183,167,200,0.26)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-[-5%] top-[-12%] size-[28rem] rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[-24%] left-[34%] size-72 rounded-full bg-[rgba(255,228,210,0.18)] blur-3xl"
            />

            <div className="relative grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Platform activity
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[var(--color-near-black)] sm:text-6xl">
                  Every important update,
                  <br />
                  clearly in view.
                </h2>

                <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--color-charcoal)]/68">
                  Follow booking progress, quotation activity, payments, complaints and account
                  decisions from one organised notification centre.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-white/50 bg-white/30 px-5 py-4 backdrop-blur-xl">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/45">
                      Unread updates
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {unreadCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/50 bg-white/30 px-5 py-4 backdrop-blur-xl">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/45">
                      Reviewed
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {readCount}
                    </p>
                  </div>
                </div>
              </div>

              <aside className="group/notification-health relative overflow-hidden rounded-[2.2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-7 text-[#fffaf5] shadow-[0_28px_80px_rgba(93,58,85,0.30)] transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_34px_92px_rgba(93,58,85,0.35)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-white/10 blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl border border-white/14 bg-white/10 text-[var(--color-powder-blue)] shadow-[0_12px_28px_rgba(31,27,29,0.12)] backdrop-blur transition duration-300 group-hover/notification-health:-translate-y-0.5 group-hover/notification-health:scale-105">
                      {unreadCount > 0 ? (
                        <BellDot aria-hidden="true" className="size-6" />
                      ) : (
                        <CheckCheck aria-hidden="true" className="size-6" />
                      )}
                    </div>

                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/74 backdrop-blur">
                      {unreadCount > 0 ? 'Needs review' : 'All reviewed'}
                    </span>
                  </div>

                  <p className="mt-8 text-xs font-black uppercase tracking-[0.20em] text-white/48">
                    Notification status
                  </p>

                  <p className="mt-3 text-5xl font-black tracking-[-0.055em]">{unreadCount}</p>

                  <p className="mt-2 text-sm font-semibold text-white/58">
                    {unreadCount === 1 ? 'Unread notification' : 'Unread notifications'}
                  </p>

                  <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-powder-blue),#fff4ea)] shadow-[0_0_18px_rgba(255,244,234,0.24)] transition-[width] duration-700"
                      style={{
                        width: `${
                          totalCount > 0
                            ? Math.min(Math.max((readCount / totalCount) * 100, 0), 100)
                            : 100
                        }%`,
                      }}
                    />
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Total
                      </p>

                      <p className="mt-2 text-2xl font-black">{totalCount}</p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-[rgba(142,151,115,0.16)] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(142,151,115,0.22)]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Reviewed
                      </p>

                      <p className="mt-2 text-2xl font-black">{readCount}</p>
                    </div>
                  </div>

                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/16 bg-white/12 px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18 hover:shadow-[0_16px_34px_rgba(31,27,29,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={markAllNotificationsAsReadMutation.isPending}
                      onClick={() => {
                        markAllNotificationsAsReadMutation.mutate();
                      }}
                    >
                      {markAllNotificationsAsReadMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <CheckCheck aria-hidden="true" className="size-4" />
                      )}

                      {markAllNotificationsAsReadMutation.isPending
                        ? 'Marking all...'
                        : 'Mark all as read'}
                    </button>
                  ) : null}
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              {
                label: 'Total notifications',
                value: totalCount,
                helper: 'All platform activity',
                icon: Bell,
              },
              {
                label: 'Unread',
                value: unreadCount,
                helper: 'Still needs your attention',
                icon: BellDot,
              },
              {
                label: 'Reviewed',
                value: readCount,
                helper: 'Already acknowledged',
                icon: CheckCheck,
              },
            ].map(({ label, value, helper, icon: Icon }) => (
              <article
                key={label}
                className={`group/notification-summary luxe-card relative overflow-hidden border-white/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/92 hover:shadow-[0_28px_70px_rgba(31,27,29,0.12)] ${
                  label === 'Total notifications'
                    ? 'bg-white/48 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(226,211,235,0.88))]'
                    : label === 'Unread'
                      ? 'bg-white/48 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(239,215,223,0.86))]'
                      : 'bg-white/48 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(216,226,194,0.86))]'
                }`}
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-14 -top-14 size-40 rounded-full opacity-60 blur-3xl transition duration-500 group-hover/notification-summary:scale-125 group-hover/notification-summary:opacity-100 ${
                    label === 'Total notifications'
                      ? 'bg-[rgba(164,126,184,0.34)]'
                      : label === 'Unread'
                        ? 'bg-[rgba(170,100,117,0.30)]'
                        : 'bg-[rgba(142,151,115,0.34)]'
                  }`}
                />

                <div className="relative">
                  <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.06)] transition duration-300 group-hover/notification-summary:-translate-y-0.5 group-hover/notification-summary:scale-110 group-hover/notification-summary:bg-[rgba(183,167,200,0.34)]">
                    <Icon
                      aria-hidden="true"
                      className="size-5 transition duration-300 group-hover/notification-summary:rotate-[4deg]"
                    />
                  </div>

                  <p className="mt-8 text-xs font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/48 transition duration-300 group-hover/notification-summary:text-[var(--color-rosewood)]/76">
                    {label}
                  </p>

                  <p className="mt-3 text-3xl font-black tracking-[-0.055em] text-[var(--color-near-black)] transition duration-300 group-hover/notification-summary:translate-x-0.5 group-hover/notification-summary:text-[var(--color-deep-plum)] sm:text-[2.15rem]">
                    {value}
                  </p>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/55 transition duration-300 group-hover/notification-summary:text-[var(--color-charcoal)]/68">
                    {helper}
                  </p>
                </div>
              </article>
            ))}
          </section>
          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.28fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Activity feed
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Notifications for your account.
                  </h2>
                </div>

                <button
                  type="button"
                  className="btn-primary shrink-0 text-sm font-bold"
                  disabled={unreadCount === 0 || markAllNotificationsAsReadMutation.isPending}
                  onClick={() => {
                    markAllNotificationsAsReadMutation.mutate();
                  }}
                >
                  {markAllNotificationsAsReadMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCheck className="size-4" />
                  )}

                  {markAllNotificationsAsReadMutation.isPending
                    ? 'Marking all...'
                    : 'Mark all as read'}
                </button>
              </div>

              <div className="mt-7 rounded-[1.6rem] border border-white/55 bg-white/22 p-5 backdrop-blur-xl">
                <div className="grid gap-4 lg:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                      Read status
                    </span>

                    <select
                      className="form-field min-h-12"
                      aria-label="Filter notifications by read status"
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value as NotificationReadStatus);
                        setPage(1);
                      }}
                    >
                      <option value="all">All notifications</option>
                      <option value="unread">Unread only</option>
                      <option value="read">Read only</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                      Activity type
                    </span>

                    <select
                      className="form-field min-h-12"
                      aria-label="Filter notifications by type"
                      value={typeFilter}
                      onChange={(event) => {
                        setTypeFilter(event.target.value as NotificationType | '');
                        setPage(1);
                      }}
                    >
                      <option value="">All activity types</option>

                      {notificationTypes.map((notificationType) => (
                        <option key={notificationType} value={notificationType}>
                          {notificationTypeLabels[notificationType]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                      Sort order
                    </span>

                    <select
                      className="form-field min-h-12"
                      aria-label="Sort notifications"
                      value={sort}
                      onChange={(event) => {
                        setSort(event.target.value as NotificationSort);
                        setPage(1);
                      }}
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/52">
                    {pagination.total} notification{pagination.total === 1 ? '' : 's'} in this view
                  </p>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>

              {markAllNotificationsAsReadMutation.isError ? (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                >
                  {getApiErrorMessage(markAllNotificationsAsReadMutation.error)}
                </div>
              ) : null}

              {notifications.length > 0 ? (
                <div className="mt-8 space-y-4">
                  {notifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const contextualLink = getContextualLink(notification);

                    const isMarkingThisNotification =
                      markNotificationAsReadMutation.isPending &&
                      markNotificationAsReadMutation.variables === notification.id;

                    return (
                      <article
                        key={notification.id}
                        className={`group/notification relative overflow-hidden rounded-[1.75rem] border p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 sm:p-6 ${
                          notification.isRead
                            ? 'border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.36),rgba(255,255,255,0.18))] shadow-[0_14px_42px_rgba(31,27,29,0.045)] hover:border-white/86 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(232,225,240,0.46))] hover:shadow-[0_24px_62px_rgba(31,27,29,0.09)]'
                            : 'border-[rgba(93,58,85,0.26)] bg-[linear-gradient(145deg,rgba(255,255,255,0.74),rgba(235,224,242,0.58))] shadow-[0_20px_58px_rgba(93,58,85,0.12)] hover:border-[rgba(93,58,85,0.36)] hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(226,211,235,0.70))] hover:shadow-[0_30px_74px_rgba(93,58,85,0.16)]'
                        }`}
                      >
                        <div
                          aria-hidden="true"
                          className={`pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl transition duration-500 group-hover/notification:scale-125 ${
                            notification.isRead
                              ? 'bg-[rgba(175,201,216,0.14)] group-hover/notification:bg-[rgba(175,201,216,0.24)]'
                              : 'bg-[rgba(183,167,200,0.22)] group-hover/notification:bg-[rgba(183,167,200,0.34)]'
                          }`}
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
                        />

                        {!notification.isRead ? (
                          <span
                            aria-hidden="true"
                            className="absolute right-5 top-5 size-2.5 rounded-full bg-[var(--color-rosewood)] shadow-[0_0_0_5px_rgba(130,72,77,0.10)]"
                          />
                        ) : null}

                        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
                          <div
                            className={`grid size-12 shrink-0 place-items-center rounded-2xl shadow-[0_10px_24px_rgba(31,27,29,0.06)] transition duration-300 group-hover/notification:-translate-y-0.5 group-hover/notification:scale-105 ${getNotificationIconSurfaceClass(
                              notification.type,
                            )}`}
                          >
                            <Icon
                              aria-hidden="true"
                              className="size-5 transition duration-300 group-hover/notification:rotate-[4deg]"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="status-chip transition duration-300 group-hover/notification:-translate-y-0.5 group-hover/notification:shadow-[0_8px_20px_rgba(31,27,29,0.07)]"
                                data-tone={getNotificationTone(notification.type)}
                              >
                                {notificationTypeLabels[notification.type]}
                              </span>

                              {!notification.isRead ? (
                                <span
                                  className="status-chip transition duration-300 group-hover/notification:-translate-y-0.5"
                                  data-tone="plum"
                                >
                                  <BellDot aria-hidden="true" className="size-3.5" />
                                  Unread
                                </span>
                              ) : (
                                <span
                                  className="status-chip transition duration-300 group-hover/notification:-translate-y-0.5"
                                  data-tone="green"
                                >
                                  <Check aria-hidden="true" className="size-3.5" />
                                  Read
                                </span>
                              )}
                            </div>

                            <h3 className="mt-4 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/notification:translate-x-0.5 group-hover/notification:text-[var(--color-deep-plum)]">
                              {notification.title}
                            </h3>

                            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66 transition duration-300 group-hover/notification:text-[var(--color-charcoal)]/76">
                              {notification.message}
                            </p>

                            <div className="mt-5 flex flex-wrap items-center gap-3">
                              <span className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/28 px-3 py-2 text-xs font-black text-[var(--color-charcoal)]/58 transition duration-300 group-hover/notification:border-white/72 group-hover/notification:bg-white/42">
                                <CalendarClock
                                  aria-hidden="true"
                                  className="size-4 text-[var(--color-rosewood)]"
                                />

                                {formatRelativeNotificationDate(notification.createdAt)}
                              </span>

                              <span className="inline-flex items-center rounded-xl border border-white/50 bg-white/28 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/54 transition duration-300 group-hover/notification:border-white/72 group-hover/notification:bg-white/42">
                                {formatNotificationDate(notification.createdAt)}
                              </span>

                              {notification.readAt ? (
                                <span className="inline-flex items-center gap-2 rounded-xl border border-[rgba(89,133,113,0.14)] bg-[rgba(89,133,113,0.08)] px-3 py-2 text-xs font-bold text-[#3f735d]">
                                  <Check aria-hidden="true" className="size-3.5" />
                                  Read {formatNotificationDate(notification.readAt)}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                              {!notification.isRead ? (
                                <button
                                  type="button"
                                  className="group/mark-notification btn-secondary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                                  disabled={isMarkingThisNotification}
                                  onClick={() => {
                                    markNotificationAsReadMutation.mutate(notification.id);
                                  }}
                                >
                                  {isMarkingThisNotification ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                  ) : (
                                    <Check
                                      aria-hidden="true"
                                      className="size-4 transition duration-300 group-hover/mark-notification:scale-110"
                                    />
                                  )}

                                  {isMarkingThisNotification
                                    ? 'Marking as read...'
                                    : 'Mark as read'}
                                </button>
                              ) : null}

                              {contextualLink ? (
                                <Link
                                  to={contextualLink}
                                  className="group/open-notification btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                                  onClick={() => {
                                    if (!notification.isRead) {
                                      markNotificationAsReadMutation.mutate(notification.id);
                                    }
                                  }}
                                >
                                  Open related item
                                  <ArrowUpRight
                                    aria-hidden="true"
                                    className="size-4 transition duration-300 group-hover/open-notification:-translate-y-0.5 group-hover/open-notification:translate-x-0.5"
                                  />
                                </Link>
                              ) : null}
                            </div>

                            {markNotificationAsReadMutation.isError &&
                            markNotificationAsReadMutation.variables === notification.id ? (
                              <div
                                role="alert"
                                className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                                    <CircleAlert aria-hidden="true" className="size-4" />
                                  </span>

                                  <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                                    {getApiErrorMessage(markNotificationAsReadMutation.error)}
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.7rem] border border-dashed border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.18))] p-9 text-center backdrop-blur-xl">
                  <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                    {filtersAreActive ? (
                      <SearchX className="size-8" />
                    ) : (
                      <CheckCheck className="size-8" />
                    )}
                  </div>

                  <p className="mt-6 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                    {filtersAreActive
                      ? 'No notifications match these filters'
                      : 'You are all caught up'}
                  </p>

                  <p className="mx-auto mt-3 max-w-lg leading-7 text-[var(--color-charcoal)]/62">
                    {filtersAreActive
                      ? 'Try changing the read status, activity type or sorting option.'
                      : 'New booking, quotation, payment and platform updates will appear here.'}
                  </p>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary mt-5 text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} notifications)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || notificationsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || notificationsQuery.isFetching}
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
              <article className="group/notification-overview relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_32px_86px_rgba(93,58,85,0.34)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-3xl transition duration-500 group-hover/notification-overview:scale-125"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl border border-white/14 bg-white/12 text-[var(--color-powder-blue)] shadow-[0_12px_28px_rgba(31,27,29,0.12)] backdrop-blur-xl transition duration-300 group-hover/notification-overview:-translate-y-0.5 group-hover/notification-overview:scale-105">
                      <BellDot aria-hidden="true" className="size-6" />
                    </div>

                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/74 backdrop-blur-xl">
                      {unreadCount} unread
                    </span>
                  </div>

                  <p className="mt-7 text-xs font-black uppercase tracking-[0.20em] text-white/48">
                    Activity status
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">
                    Notification overview
                  </h2>

                  <p className="mt-3 leading-7 text-white/68">
                    Review account activity and clear updates after you have handled them.
                  </p>

                  <div className="mt-8 space-y-3">
                    {[
                      {
                        label: 'All notifications',
                        helper: 'Complete account activity',
                        value: totalCount,
                        icon: Bell,
                      },
                      {
                        label: 'Unread',
                        helper: 'Needs your attention',
                        value: unreadCount,
                        icon: BellDot,
                      },
                      {
                        label: 'Reviewed',
                        helper: 'Already acknowledged',
                        value: readCount,
                        icon: CheckCheck,
                      },
                    ].map(({ label, helper, value, icon: Icon }) => (
                      <div
                        key={label}
                        className="group/overview-row flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.15]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[var(--color-powder-blue)] transition duration-300 group-hover/overview-row:scale-105">
                            <Icon aria-hidden="true" className="size-4" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-sm font-black text-white/88">{label}</p>

                            <p className="mt-1 text-xs font-semibold text-white/48">{helper}</p>
                          </div>
                        </div>

                        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/12 text-lg font-black shadow-[0_8px_20px_rgba(31,27,29,0.10)]">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      className="group/sidebar-mark-all mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/16 bg-white/12 px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18 hover:shadow-[0_16px_34px_rgba(31,27,29,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={markAllNotificationsAsReadMutation.isPending}
                      onClick={() => {
                        markAllNotificationsAsReadMutation.mutate();
                      }}
                    >
                      {markAllNotificationsAsReadMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <CheckCheck
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/sidebar-mark-all:scale-110"
                        />
                      )}

                      {markAllNotificationsAsReadMutation.isPending
                        ? 'Marking all...'
                        : 'Mark all as read'}
                    </button>
                  ) : (
                    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[rgba(142,151,115,0.20)] bg-[rgba(142,151,115,0.14)] px-4 py-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[#dfe9c9]">
                        <CheckCheck aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-sm font-bold text-white/76">
                        You have reviewed every current notification.
                      </p>
                    </div>
                  )}
                </div>
              </article>

              <article className="group/account-updates glass-card relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:shadow-[0_24px_60px_rgba(31,27,29,0.10)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-12 size-44 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/account-updates:scale-125 group-hover/account-updates:bg-[rgba(175,201,216,0.30)]"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/account-updates:-translate-y-0.5 group-hover/account-updates:scale-105">
                      <CircleUserRound aria-hidden="true" className="size-6" />
                    </div>

                    <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/52 backdrop-blur-xl">
                      Account
                    </span>
                  </div>

                  <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Notification scope
                  </p>

                  <h2 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/account-updates:text-[var(--color-deep-plum)]">
                    Account-wide updates
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/62">
                    Notifications are connected to your logged-in account rather than one event, so
                    booking, vendor, payment and complaint activity appears together.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      {
                        label: 'Booking and quotation progress',
                        icon: PackageCheck,
                      },
                      {
                        label: 'Payment verification decisions',
                        icon: CircleDollarSign,
                      },
                      {
                        label: 'Complaint and account updates',
                        icon: FileWarning,
                      },
                    ].map(({ label, icon: Icon }) => (
                      <div
                        key={label}
                        className="group/account-update-row flex items-center gap-3 rounded-2xl border border-white/46 bg-white/28 px-4 py-3 transition duration-300 hover:-translate-y-0.5 hover:border-white/72 hover:bg-white/42"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)] transition duration-300 group-hover/account-update-row:scale-105">
                          <Icon aria-hidden="true" className="size-4" />
                        </span>

                        <span className="text-sm font-bold leading-6 text-[var(--color-charcoal)]/68">
                          {label}
                        </span>

                        <Check
                          aria-hidden="true"
                          className="ml-auto size-4 shrink-0 text-[var(--color-rosewood)] transition duration-300 group-hover/account-update-row:scale-110"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[1.35rem] border border-[rgba(175,201,216,0.22)] bg-[rgba(222,236,242,0.28)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                        <Bell aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        Use the activity-type filter to focus on one workflow without losing the
                        complete account history.
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
