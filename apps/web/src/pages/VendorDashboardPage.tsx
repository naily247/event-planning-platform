import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CircleAlert,
  FileText,
  Images,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../features/auth/auth.api';
import { clearAuthTokens } from '../features/auth/auth.storage';
import { getVendorBookings } from '../features/bookings/booking.api';
import {
  getNotifications,
  getUnreadNotificationCount,
} from '../features/notifications/notification.api';
import { getVendorQuotationRequests } from '../features/quotationRequests/quotationRequest.api';
import {
  getVendorAvailability,
  getVendorOnboardingProfile,
  getVendorPortfolio,
} from '../features/vendors/vendor.api';
import { VendorBookingCard } from '../features/vendors/components/VendorBookingCard';
import { VendorOnboardingCard } from '../features/vendors/components/VendorOnboardingCard';
import { VendorQuickActions } from '../features/vendors/components/VendorQuickActions';
import { VendorQuotationCard } from '../features/vendors/components/VendorQuotationCard';
import { VendorStatCard } from '../features/vendors/components/VendorStatCard';
import { useMemo } from 'react';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

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
    return 'We could not load your vendor workspace. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load your vendor workspace. Please try again.'
  );
};

const getAvailabilityRange = () => {
  const from = new Date();
  const to = new Date();

  to.setDate(to.getDate() + 30);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

export function VendorDashboardPage() {
  const navigate = useNavigate();

  const availabilityRange = useMemo(() => getAvailabilityRange(), []);

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
  });

  const onboardingQuery = useQuery({
    queryKey: ['vendors', 'me', 'onboarding'],
    queryFn: getVendorOnboardingProfile,
  });

  const portfolioQuery = useQuery({
    queryKey: ['vendors', 'me', 'portfolio'],
    queryFn: getVendorPortfolio,
  });

  const availabilityQuery = useQuery({
    queryKey: ['vendors', 'me', 'availability', availabilityRange.from, availabilityRange.to],
    queryFn: () => getVendorAvailability(availabilityRange),
  });

  const recentQuotationRequestsQuery = useQuery({
    queryKey: ['quotation-requests', 'vendor', 'recent'],
    queryFn: () =>
      getVendorQuotationRequests({
        page: 1,
        limit: 4,
        sort: 'newest',
      }),
  });

  const pendingQuotationRequestsQuery = useQuery({
    queryKey: ['quotation-requests', 'vendor', 'pending-count'],
    queryFn: async () => {
      const [sent, viewed] = await Promise.all([
        getVendorQuotationRequests({
          status: 'SENT',
          page: 1,
          limit: 1,
        }),
        getVendorQuotationRequests({
          status: 'VIEWED',
          page: 1,
          limit: 1,
        }),
      ]);

      return sent.pagination.total + viewed.pagination.total;
    },
  });

  const recentBookingsQuery = useQuery({
    queryKey: ['bookings', 'vendor', 'recent'],
    queryFn: () =>
      getVendorBookings({
        page: 1,
        limit: 4,
        sort: 'service_soonest',
      }),
  });

  const awaitingBookingsQuery = useQuery({
    queryKey: ['bookings', 'vendor', 'awaiting-count'],
    queryFn: async () => {
      const result = await getVendorBookings({
        status: 'AWAITING_VENDOR_CONFIRMATION',
        page: 1,
        limit: 1,
      });

      return result.pagination.total;
    },
  });

  const activeBookingsQuery = useQuery({
    queryKey: ['bookings', 'vendor', 'active-count'],
    queryFn: async () => {
      const [confirmed, depositPending, active] = await Promise.all([
        getVendorBookings({
          status: 'CONFIRMED',
          page: 1,
          limit: 1,
        }),
        getVendorBookings({
          status: 'DEPOSIT_PENDING',
          page: 1,
          limit: 1,
        }),
        getVendorBookings({
          status: 'ACTIVE',
          page: 1,
          limit: 1,
        }),
      ]);

      return confirmed.pagination.total + depositPending.pagination.total + active.pagination.total;
    },
  });

  const unreadNotificationsQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
  });

  const recentNotificationsQuery = useQuery({
    queryKey: ['notifications', 'vendor-dashboard', 'recent'],
    queryFn: () =>
      getNotifications({
        page: 1,
        limit: 5,
        sort: 'newest',
        status: 'all',
      }),
  });

  const handleLogout = () => {
    clearAuthTokens();

    navigate('/login', {
      replace: true,
    });
  };

  const queries = [
    currentUserQuery,
    onboardingQuery,
    portfolioQuery,
    availabilityQuery,
    recentQuotationRequestsQuery,
    pendingQuotationRequestsQuery,
    recentBookingsQuery,
    awaitingBookingsQuery,
    activeBookingsQuery,
    unreadNotificationsQuery,
    recentNotificationsQuery,
  ];

  const isLoading = queries.some((query) => query.isLoading);

  const queryError = queries.find((query) => query.error)?.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="state-surface">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Preparing your vendor workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading your profile, quotation requests, bookings, portfolio, and business activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    queryError ||
    !currentUserQuery.data ||
    !onboardingQuery.data ||
    !portfolioQuery.data ||
    !availabilityQuery.data ||
    !recentQuotationRequestsQuery.data ||
    pendingQuotationRequestsQuery.data === undefined ||
    !recentBookingsQuery.data ||
    awaitingBookingsQuery.data === undefined ||
    activeBookingsQuery.data === undefined ||
    !unreadNotificationsQuery.data ||
    !recentNotificationsQuery.data
  ) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="state-surface">
          <div className="max-w-lg">
            <div className="icon-tile">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Vendor dashboard unavailable
            </p>

            <p className="section-description">
              {getErrorMessage(queryError)}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="btn-primary text-sm font-bold"
                onClick={() => {
                  void Promise.all(queries.map((query) => query.refetch()));
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
  const onboarding = onboardingQuery.data;
  const portfolio = portfolioQuery.data;
  const availability = availabilityQuery.data;
  const quotationRequests = recentQuotationRequestsQuery.data.quotationRequests;
  const recentBookings = recentBookingsQuery.data.bookings;
  const notifications = recentNotificationsQuery.data.notifications;

  const pendingQuotationCount = pendingQuotationRequestsQuery.data;
  const awaitingBookingCount = awaitingBookingsQuery.data;
  const activeBookingCount = activeBookingsQuery.data;
  const unreadNotificationCount = unreadNotificationsQuery.data.unreadCount;

  const scheduledRangeCount = availability.blocks.length + availability.bookings.length;

  const stats = [
    {
      label: 'Profile completion',
      value: `${onboarding.completion.percentage}%`,
      helper:
        onboarding.profile.verificationStatus === 'APPROVED'
          ? 'Your vendor profile is verified'
          : `${onboarding.completion.completedFields} of ${onboarding.completion.totalFields} required fields complete`,
      icon: ShieldCheck,
      tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
    },
    {
      label: 'Pending requests',
      value: pendingQuotationCount,
      helper: `${awaitingBookingCount} ${
        awaitingBookingCount === 1 ? 'booking awaits' : 'bookings await'
      } your response`,
      icon: FileText,
      tone: 'bg-[rgba(142,92,103,0.18)] text-[var(--color-rosewood)]',
    },
    {
      label: 'Active bookings',
      value: activeBookingCount,
      helper: `${scheduledRangeCount} scheduled ${
        scheduledRangeCount === 1 ? 'range' : 'ranges'
      } in the next 30 days`,
      icon: BriefcaseBusiness,
      tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
    },
    {
      label: 'Portfolio images',
      value: portfolio.length,
      helper: `${portfolio.filter((item) => item.isFeatured).length} featured ${
        portfolio.filter((item) => item.isFeatured).length === 1 ? 'image' : 'images'
      }`,
      icon: Images,
      tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
    },
  ];

  return (
    <div className="workspace-shell">
  <div className="workspace-container">
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
                Vendor workspace
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/notifications"
              className="soft-chip text-sm font-bold transition hover:bg-[rgba(93,58,85,0.92)] hover:text-[#fffaf5]"
            >
              <Bell className="size-4" />
              {unreadNotificationCount} unread
            </Link>

            <Link to="/vendor/quotation-requests" className="btn-secondary text-sm font-bold">
              Quotation requests
            </Link>

            <Link to="/vendor/bookings" className="btn-primary text-sm font-bold">
              <BriefcaseBusiness className="size-4" />
              Bookings
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

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <main className="py-10">
          <section className="workspace-hero">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <LayoutDashboard className="size-4" />
                Vendor workspace
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                {getGreeting()}, {user.firstName}. Keep your business moving beautifully.
              </h1>

              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                Review incoming opportunities, respond to customers, manage confirmed work, and keep
                your vendor profile ready for the next event.
              </p>
            </div>

            <div className="glass-card p-5">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Business profile</p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                {onboarding.profile.businessName}
              </h2>

              <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                {onboarding.profile.baseLocation ?? 'Location not added'}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {onboarding.profile.categories.length > 0 ? (
                  onboarding.profile.categories.slice(0, 3).map((category) => (
                    <span key={category.id} className="soft-chip text-xs font-bold">
                      {category.name}
                    </span>
                  ))
                ) : (
                  <span className="soft-chip text-xs font-bold">Add service categories</span>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <span
                  className="status-chip"
                  data-tone={
                    onboarding.profile.verificationStatus === 'APPROVED'
                      ? 'success'
                      : onboarding.profile.verificationStatus === 'REJECTED'
                        ? 'danger'
                        : onboarding.profile.verificationStatus === 'PENDING'
                          ? 'warning'
                          : 'plum'
                  }
                >
                  {onboarding.profile.verificationStatus.replaceAll('_', ' ')}
                </span>

                <Link
                  to="/vendor/profile"
                  className="text-sm font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
                >
                  Manage profile
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <VendorStatCard key={stat.label} {...stat} />
            ))}
          </section>

          <section className="mt-5">
            <VendorOnboardingCard onboarding={onboarding} />
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="workspace-panel">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="section-eyebrow">
                    Incoming opportunities
                  </p>

                  <h2 className="section-title">
                    Recent quotation requests
                  </h2>

                  <p className="section-description">
                    Review customer requirements and respond before their requested deadlines.
                  </p>
                </div>

                <Link to="/vendor/quotation-requests" className="btn-secondary text-sm font-bold">
                  View all requests
                </Link>
              </div>

              {quotationRequests.length > 0 ? (
                <div className="mt-7 grid gap-4">
                  {quotationRequests.map((quotationRequest) => (
                    <VendorQuotationCard
                      key={quotationRequest.id}
                      quotationRequest={quotationRequest}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-surface">
                  <FileText className="mx-auto size-8 text-[var(--color-deep-plum)]/65" />

                  <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    No quotation requests yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                    New requests from customers will appear here when they choose one of your
                    service packages.
                  </p>
                </div>
              )}
            </article>

            <VendorQuickActions />
          </section>

          <section className="mt-5 workspace-panel">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="section-eyebrow">
                  Upcoming work
                </p>

                <h2 className="section-title">
                  Recent and scheduled bookings
                </h2>

                <p className="section-description">
                  Stay ahead of confirmation requests, deposits, service dates, and active customer
                  commitments.
                </p>
              </div>

              <Link to="/vendor/bookings" className="btn-secondary text-sm font-bold">
                View all bookings
              </Link>
            </div>

            {recentBookings.length > 0 ? (
              <div className="mt-7 grid gap-4 lg:grid-cols-2">
                {recentBookings.map((booking) => (
                  <VendorBookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <div className="empty-surface">
                <BriefcaseBusiness className="mx-auto size-8 text-[var(--color-deep-plum)]/65" />

                <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                  No bookings yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                  Accepted quotations will become booking requests that you can confirm and manage
                  here.
                </p>
              </div>
            )}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <article className="workspace-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-eyebrow">
                    Availability
                  </p>

                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Next 30 days
                  </h2>
                </div>

                <CalendarDays className="size-6 text-[var(--color-deep-plum)]" />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/26 p-4">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/56">
                    Scheduled bookings
                  </p>

                  <p className="section-title">
                    {availability.bookings.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/26 p-4">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/56">
                    Blocked periods
                  </p>

                  <p className="section-title">
                    {availability.blocks.length}
                  </p>
                </div>
              </div>

              <Link to="/vendor/availability" className="btn-secondary mt-6 text-sm font-bold">
                Manage availability
              </Link>
            </article>

            <article className="workspace-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-eyebrow">
                    Notifications
                  </p>

                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Latest business updates
                  </h2>
                </div>

                <Bell className="size-6 text-[var(--color-deep-plum)]" />
              </div>

              {notifications.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {notifications.slice(0, 4).map((notification) => (
                    <div key={notification.id} className="rounded-2xl bg-white/26 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            {notification.title}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/58">
                            {notification.message}
                          </p>
                        </div>

                        {!notification.isRead ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--color-muted-burgundy)]" />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-surface mt-6">
  <Bell className="mx-auto size-7 text-[var(--color-deep-plum)]/65" />

  <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/58">
    You do not have any notifications yet.
  </p>
</div>
              )}

              <Link to="/notifications" className="btn-secondary mt-6 text-sm font-bold">
                View notifications
              </Link>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
