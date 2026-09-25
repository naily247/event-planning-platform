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
        <main className="py-6">
          <section className="relative overflow-hidden rounded-[1.8rem] border border-white/52 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),rgba(255,255,255,0.20))] px-5 py-5 shadow-[0_18px_55px_rgba(31,27,29,0.065)] backdrop-blur-3xl sm:px-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-20 size-56 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
            />

            <div className="relative">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/36 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)] backdrop-blur-xl">
                      <Sparkles aria-hidden="true" className="size-3.5" />
                      Platform activity
                    </span>

                    <span className="status-chip" data-tone={unreadCount > 0 ? 'plum' : 'green'}>
                      {unreadCount > 0 ? (
                        <BellDot aria-hidden="true" className="size-3.5" />
                      ) : (
                        <CheckCheck aria-hidden="true" className="size-3.5" />
                      )}

                      {unreadCount > 0 ? `${unreadCount} unread` : 'All reviewed'}
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-[1.8rem]">
                    Keep track of every important update.
                  </h2>

                  <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                    Booking, quotation, payment, complaint and account activity stays together in
                    one organised notification centre.
                  </p>
                </div>

                <div className="flex flex-wrap items-stretch gap-2.5 lg:justify-end">
                  {[
                    {
                      label: 'Total',
                      value: totalCount,
                      helper: 'All activity',
                      icon: Bell,
                    },
                    {
                      label: 'Unread',
                      value: unreadCount,
                      helper: 'Needs review',
                      icon: BellDot,
                    },
                    {
                      label: 'Reviewed',
                      value: readCount,
                      helper: 'Acknowledged',
                      icon: CheckCheck,
                    },
                  ].map(({ label, value, helper, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex min-w-[132px] items-center gap-3 rounded-2xl border border-white/58 bg-white/34 px-3.5 py-3 backdrop-blur-xl"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                            {value}
                          </span>

                          <span className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/46">
                            {label}
                          </span>
                        </div>

                        <p className="mt-0.5 whitespace-nowrap text-[0.68rem] font-semibold text-[var(--color-charcoal)]/48">
                          {helper}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-white/52 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-charcoal)]/54">
                  <span
                    className={`size-2 rounded-full ${
                      unreadCount > 0 ? 'bg-[var(--color-rosewood)]' : 'bg-[#598571]'
                    }`}
                  />

                  {unreadCount > 0
                    ? `${unreadCount} notification${
                        unreadCount === 1 ? '' : 's'
                      } still need${unreadCount === 1 ? 's' : ''} your attention.`
                    : 'You have reviewed every current notification.'}
                </div>

                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-deep-plum)] px-4 text-xs font-black text-white shadow-[0_8px_22px_rgba(93,58,85,0.16)] transition hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(93,58,85,0.20)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={markAllNotificationsAsReadMutation.isPending}
                    onClick={() => {
                      markAllNotificationsAsReadMutation.mutate();
                    }}
                  >
                    {markAllNotificationsAsReadMutation.isPending ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCheck aria-hidden="true" className="size-3.5" />
                    )}

                    {markAllNotificationsAsReadMutation.isPending
                      ? 'Marking all...'
                      : 'Mark all as read'}
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="mt-5">
            <article className="glass-card p-4 sm:p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                  Activity feed
                </p>

                <h2 className="mt-1.5 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Recent notifications
                </h2>
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-white/55 bg-white/22 px-4 py-3.5 backdrop-blur-xl">
                <div className="grid gap-3 lg:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                      Read status
                    </span>

                    <select
                      className="form-field min-h-10"
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
                      className="form-field min-h-10"
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
                      className="form-field min-h-10"
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

                <div className="mt-3 flex items-center justify-between gap-4">
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
          </section>
        </main>
      </div>
    </div>
  );
}
