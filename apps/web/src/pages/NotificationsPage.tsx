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
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  notificationTypes,
  type Notification,
  type NotificationReadStatus,
  type NotificationSort,
  type NotificationType,
} from '../features/notifications/notification.api';

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

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
  });

  const invalidateNotificationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread-count'],
      }),
    ]);
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

  if (notificationsQuery.isLoading || unreadCountQuery.isLoading) {
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
    unreadCountQuery.isError ||
    !notificationsQuery.data ||
    !unreadCountQuery.data
  ) {
    const firstError = notificationsQuery.error ?? unreadCountQuery.error;

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
                  void Promise.all([notificationsQuery.refetch(), unreadCountQuery.refetch()]);
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
  const unreadCount = unreadCountQuery.data.unreadCount;
  const readCount = Math.max(pagination.total - unreadCount, 0);

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-x-0.5 hover:bg-white/45"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-5" />
            </Link>

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
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[7%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  Platform activity
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Keep track of every important update.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Follow booking progress, quotation activity, payments, complaints and account
                  decisions from one organised notification centre.
                </p>
              </div>

              <div className="glass-card relative overflow-hidden p-6">
                <div className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                      <BellDot className="size-6" />
                    </div>

                    <span className="status-chip" data-tone={unreadCount > 0 ? 'plum' : 'green'}>
                      {unreadCount > 0 ? 'Action pending' : 'All reviewed'}
                    </span>
                  </div>

                  <p className="mt-7 text-sm font-bold text-[var(--color-charcoal)]/58">
                    Needs attention
                  </p>

                  <p className="mt-2 text-5xl font-black tracking-[-0.055em] text-[var(--color-near-black)]">
                    {unreadCount}
                  </p>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-rosewood)]">
                    {unreadCount === 1
                      ? 'One unread update is waiting for your review.'
                      : `${unreadCount} unread updates are waiting for your review.`}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="luxe-card p-6">
              <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                <Bell className="size-5" />
              </div>

              <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">
                Total notifications
              </p>

              <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {pagination.total}
              </p>

              <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                All activity currently recorded
              </p>
            </article>

            <article className="luxe-card p-6">
              <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                <BellDot className="size-5" />
              </div>

              <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">Unread</p>

              <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {unreadCount}
              </p>

              <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                Updates still requiring review
              </p>
            </article>

            <article className="luxe-card p-6">
              <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(89,133,113,0.14)] text-[#3f735d]">
                <CheckCheck className="size-5" />
              </div>

              <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">Read</p>

              <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {readCount}
              </p>

              <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                Updates already reviewed
              </p>
            </article>
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

                    return (
                      <article
                        key={notification.id}
                        className={
                          notification.isRead
                            ? 'group relative overflow-hidden rounded-[1.7rem] border border-white/55 bg-white/20 p-5 shadow-[0_12px_38px_rgba(31,27,29,0.035)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/28 hover:shadow-[0_20px_55px_rgba(31,27,29,0.07)] sm:p-6'
                            : 'group relative overflow-hidden rounded-[1.7rem] border border-[rgba(93,58,85,0.24)] bg-white/36 p-5 shadow-[0_18px_52px_rgba(93,58,85,0.10)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/42 hover:shadow-[0_24px_65px_rgba(93,58,85,0.14)] sm:p-6'
                        }
                      >
                        <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />

                        {!notification.isRead ? (
                          <span className="absolute right-5 top-5 size-2.5 rounded-full bg-[var(--color-rosewood)] shadow-[0_0_0_5px_rgba(130,72,77,0.10)]" />
                        ) : null}

                        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
                          <div
                            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${getNotificationIconSurfaceClass(
                              notification.type,
                            )}`}
                          >
                            <Icon className="size-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="status-chip"
                                data-tone={getNotificationTone(notification.type)}
                              >
                                {notificationTypeLabels[notification.type]}
                              </span>

                              {!notification.isRead ? (
                                <span className="status-chip" data-tone="plum">
                                  <BellDot className="size-3.5" />
                                  Unread
                                </span>
                              ) : (
                                <span className="status-chip" data-tone="green">
                                  <Check className="size-3.5" />
                                  Read
                                </span>
                              )}
                            </div>

                            <h3 className="mt-4 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                              {notification.title}
                            </h3>

                            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                              {notification.message}
                            </p>

                            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-[var(--color-charcoal)]/50">
                              <span className="inline-flex items-center gap-2">
                                <CalendarClock className="size-4 text-[var(--color-rosewood)]" />
                                {formatRelativeNotificationDate(notification.createdAt)}
                              </span>

                              <span>{formatNotificationDate(notification.createdAt)}</span>

                              {notification.readAt ? (
                                <span>Read {formatNotificationDate(notification.readAt)}</span>
                              ) : null}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                              {!notification.isRead ? (
                                <button
                                  type="button"
                                  className="btn-secondary text-sm font-bold"
                                  disabled={
                                    markNotificationAsReadMutation.isPending &&
                                    markNotificationAsReadMutation.variables === notification.id
                                  }
                                  onClick={() => {
                                    markNotificationAsReadMutation.mutate(notification.id);
                                  }}
                                >
                                  {markNotificationAsReadMutation.isPending &&
                                  markNotificationAsReadMutation.variables === notification.id ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                  ) : (
                                    <Check className="size-4" />
                                  )}
                                  {markNotificationAsReadMutation.isPending &&
                                  markNotificationAsReadMutation.variables === notification.id
                                    ? 'Marking as read...'
                                    : 'Mark as read'}
                                </button>
                              ) : null}

                              {contextualLink ? (
                                <Link
                                  to={contextualLink}
                                  className="btn-primary text-sm font-bold"
                                  onClick={() => {
                                    if (!notification.isRead) {
                                      markNotificationAsReadMutation.mutate(notification.id);
                                    }
                                  }}
                                >
                                  Open related item
                                  <ArrowUpRight className="size-4" />
                                </Link>
                              ) : null}
                            </div>

                            {markNotificationAsReadMutation.isError &&
                            markNotificationAsReadMutation.variables === notification.id ? (
                              <div
                                role="alert"
                                className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                              >
                                {getApiErrorMessage(markNotificationAsReadMutation.error)}
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
              <article className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-white/14 backdrop-blur">
                      <BellDot className="size-6 text-[var(--color-powder-blue)]" />
                    </div>

                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/74 backdrop-blur">
                      {unreadCount} unread
                    </span>
                  </div>

                  <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">
                    Notification overview
                  </h2>

                  <p className="mt-3 leading-7 text-white/68">
                    Review account activity and clear updates after you have handled them.
                  </p>

                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
                      <div>
                        <span className="text-sm font-black text-white/88">All notifications</span>
                        <p className="mt-1 text-xs font-semibold text-white/48">
                          Current activity view
                        </p>
                      </div>

                      <span className="grid size-10 place-items-center rounded-xl bg-white/12 text-lg font-black">
                        {pagination.total}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
                      <div>
                        <span className="text-sm font-black text-white/88">Unread</span>
                        <p className="mt-1 text-xs font-semibold text-white/48">
                          Needs your attention
                        </p>
                      </div>

                      <span className="grid size-10 place-items-center rounded-xl bg-white/12 text-lg font-black">
                        {unreadCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
                      <div>
                        <span className="text-sm font-black text-white/88">Read</span>
                        <p className="mt-1 text-xs font-semibold text-white/48">Already reviewed</p>
                      </div>

                      <span className="grid size-10 place-items-center rounded-xl bg-white/12 text-lg font-black">
                        {readCount}
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="glass-card relative overflow-hidden p-6">
                <div className="pointer-events-none absolute -bottom-16 -right-12 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                      <CircleUserRound className="size-6" />
                    </div>

                    <span className="rounded-full bg-white/30 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/52">
                      Account
                    </span>
                  </div>

                  <h2 className="mt-6 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                    Account-wide updates
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                    Notifications are connected to your logged-in account rather than one event, so
                    booking, vendor, payment and complaint activity appears together.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      'Booking and quotation progress',
                      'Payment verification decisions',
                      'Complaint and account updates',
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-2xl border border-white/45 bg-white/28 px-4 py-3"
                      >
                        <Check className="size-4 shrink-0 text-[var(--color-rosewood)]" />
                        <span className="text-sm font-bold text-[var(--color-charcoal)]/66">
                          {item}
                        </span>
                      </div>
                    ))}
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
