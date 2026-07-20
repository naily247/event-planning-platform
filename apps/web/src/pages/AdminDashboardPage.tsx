import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CircleAlert,
  CreditCard,
  FileWarning,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MessageSquareWarning,
  ShieldCheck,
  Star,
  Store,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminWorkspaceNav } from '../features/admin/components/AdminWorkspaceNav';
import {
  getAdminDashboardSummary,
  type AdminAccountStatus,
  type AdminBookingStatus,
  type AdminComplaintPriority,
  type AdminComplaintStatus,
  type AdminPaymentStatus,
  type AdminUserRole,
} from '../features/admin/admin.api';
import { getCurrentUser } from '../features/auth/auth.api';
import { clearAuthTokens } from '../features/auth/auth.storage';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

const userRoleLabels: Record<AdminUserRole, string> = {
  CUSTOMER: 'Customer',
  VENDOR: 'Vendor',
  ADMIN: 'Administrator',
};

const accountStatusLabels: Record<AdminAccountStatus, string> = {
  ACTIVE: 'Active',
  PENDING_VERIFICATION: 'Pending verification',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
};

const bookingStatusLabels: Record<AdminBookingStatus, string> = {
  AWAITING_VENDOR_CONFIRMATION: 'Awaiting vendor',
  CONFIRMED: 'Confirmed',
  DEPOSIT_PENDING: 'Deposit pending',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  DISPUTED: 'Disputed',
};

const paymentStatusLabels: Record<AdminPaymentStatus, string> = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially refunded',
};

const complaintStatusLabels: Record<AdminComplaintStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under review',
  AWAITING_CUSTOMER_RESPONSE: 'Awaiting customer',
  AWAITING_VENDOR_RESPONSE: 'Awaiting vendor',
  UNDER_INVESTIGATION: 'Under investigation',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
  CLOSED: 'Closed',
};

const complaintPriorityLabels: Record<AdminComplaintPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

function getErrorMessage(error: unknown) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load the admin dashboard. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load the admin dashboard. Please try again.'
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCurrency(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `LKR ${value}`;
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusTone(
  status: AdminAccountStatus | AdminBookingStatus | AdminPaymentStatus | AdminComplaintStatus,
) {
  if (['ACTIVE', 'VERIFIED', 'COMPLETED', 'RESOLVED'].includes(status)) {
    return 'success';
  }

  if (
    [
      'PENDING_VERIFICATION',
      'PENDING',
      'DEPOSIT_PENDING',
      'AWAITING_VENDOR_CONFIRMATION',
      'AWAITING_CUSTOMER_RESPONSE',
      'AWAITING_VENDOR_RESPONSE',
      'UNDER_REVIEW',
      'UNDER_INVESTIGATION',
    ].includes(status)
  ) {
    return 'warning';
  }

  if (
    ['SUSPENDED', 'DEACTIVATED', 'REJECTED', 'CANCELLED', 'DISPUTED', 'DISMISSED'].includes(status)
  ) {
    return 'danger';
  }

  return 'plum';
}

function AdminStatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <article className="workspace-card p-5">
      <div className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
        <Icon className="size-5" aria-hidden="true" />
      </div>

      <p className="mt-6 text-sm font-bold text-[var(--color-charcoal)]/58">{label}</p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
        {value}
      </p>

      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/54">
        {helper}
      </p>
    </article>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-2xl border border-white/70 bg-white/48 p-4 transition hover:-translate-y-0.5 hover:bg-white/72"
    >
      <div className="icon-tile shrink-0">
        <Icon className="size-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-black text-[var(--color-near-black)]">{title}</p>

        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
          {description}
        </p>
      </div>

      <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--color-charcoal)]/34 transition group-hover:translate-x-1 group-hover:text-[var(--color-deep-plum)]" />
    </Link>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
  });

  const summaryQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'summary'],
    queryFn: () =>
      getAdminDashboardSummary({
        recentLimit: 5,
      }),
  });

  const isLoading = currentUserQuery.isLoading || summaryQuery.isLoading;
  const loadError = currentUserQuery.error ?? summaryQuery.error;

  function handleLogout() {
    clearAuthTokens();
    queryClient.clear();

    navigate('/login', {
      replace: true,
    });
  }

  if (isLoading) {
    return (
      <div className="workspace-shell grid place-items-center px-4 py-10">
        <div className="state-surface w-full max-w-3xl">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Preparing the admin workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading platform totals, financial activity, moderation queues, and recent records.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !currentUserQuery.data || !summaryQuery.data) {
    return (
      <div className="workspace-shell grid place-items-center px-4 py-10">
        <div className="state-surface w-full max-w-3xl">
          <div className="max-w-lg">
            <div className="icon-tile mx-auto">
              <CircleAlert className="size-6" />
            </div>

            <h1 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Admin dashboard unavailable
            </h1>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(loadError)}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => {
                  void Promise.all([currentUserQuery.refetch(), summaryQuery.refetch()]);
                }}
              >
                Try again
              </button>

              <button type="button" className="btn-secondary text-sm" onClick={handleLogout}>
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
  const summary = summaryQuery.data;

  const stats = [
    {
      label: 'Total users',
      value: summary.users.total,
      helper: `${summary.users.newThisMonth} joined this month`,
      icon: Users,
      tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
    },
    {
      label: 'Pending vendors',
      value: summary.vendors.pending,
      helper: `${summary.vendors.approved} approved vendor profiles`,
      icon: Store,
      tone: 'bg-[rgba(184,145,87,0.18)] text-[#6f5328]',
    },
    {
      label: 'Pending payments',
      value: summary.payments.pending,
      helper: `${summary.payments.verified} payments verified`,
      icon: CreditCard,
      tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
    },
    {
      label: 'Open complaints',
      value: summary.complaints.open,
      helper: `${summary.complaints.unassigned} active cases unassigned`,
      icon: MessageSquareWarning,
      tone: 'bg-[rgba(142,92,103,0.18)] text-[var(--color-rosewood)]',
    },
    {
      label: 'Active events',
      value: summary.events.active,
      helper: `${summary.events.total} events created overall`,
      icon: CalendarDays,
      tone: 'bg-[rgba(142,151,115,0.24)] text-[#3d452f]',
    },
    {
      label: 'Active bookings',
      value: summary.bookings.active,
      helper: `${summary.bookings.awaitingVendorConfirmation} awaiting vendor response`,
      icon: BriefcaseBusiness,
      tone: 'bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]',
    },
    {
      label: 'Verified revenue',
      value: formatCurrency(summary.payments.totalVerifiedAmount),
      helper: `${summary.payments.total} payment records`,
      icon: BarChart3,
      tone: 'bg-[rgba(142,151,115,0.22)] text-[#3d452f]',
    },
    {
      label: 'Average review',
      value:
        summary.reviews.averageRating === null ? '—' : summary.reviews.averageRating.toFixed(1),
      helper: `${summary.reviews.hidden} hidden of ${summary.reviews.total} reviews`,
      icon: Star,
      tone: 'bg-[rgba(244,211,152,0.28)] text-[#795116]',
    },
  ];

  return (
    <div className="workspace-shell">
      <div className="workspace-container">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl">
              <ShieldCheck className="size-5 text-[var(--color-deep-plum)]" />
            </span>

            <span className="flex flex-col leading-none">
              <span className="text-base font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                Eventure
              </span>

              <span className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Admin workspace
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/notifications" className="btn-secondary text-sm">
              <Bell className="size-4" />
              Notifications
            </Link>

            <Link to="/admin/reports" className="btn-primary text-sm">
              <BarChart3 className="size-4" />
              Reports
            </Link>

            <button type="button" className="btn-secondary text-sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </header>

        <div className="mt-5">
          <AdminWorkspaceNav />
        </div>

        <main className="py-10">
          <section className="workspace-hero grid gap-6 lg:grid-cols-[1fr_0.38fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <LayoutDashboard className="size-4" />
                Platform operations
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                Welcome back, {user.firstName}. Keep the platform healthy and moving.
              </h1>

              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                Review operational queues, monitor marketplace health, moderate activity, and
                understand what is happening across Eventure.
              </p>
            </div>

            <article className="glass-card p-5">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                Dashboard generated
              </p>

              <p className="mt-2 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                {formatDateTime(summary.generatedAt)}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl bg-white/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                    Active accounts
                  </p>

                  <p className="mt-2 text-2xl font-black text-[var(--color-near-black)]">
                    {summary.users.byStatus.active}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                    Urgent complaints
                  </p>

                  <p className="mt-2 text-2xl font-black text-[var(--color-near-black)]">
                    {summary.complaints.urgent}
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <AdminStatCard key={stat.label} {...stat} />
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
            <aside className="workspace-panel">
              <p className="section-eyebrow">Quick actions</p>

              <h2 className="section-title">Operational queues</h2>

              <p className="section-description">
                Jump directly into the areas most likely to require administrator attention.
              </p>

              <div className="mt-6 grid gap-3">
                <QuickAction
                  to="/admin/vendors"
                  icon={Store}
                  title="Review vendor applications"
                  description={`${summary.vendors.pending} applications are currently pending.`}
                />

                <QuickAction
                  to="/admin/payments"
                  icon={CreditCard}
                  title="Verify pending payments"
                  description={`${summary.payments.pending} payments are waiting for review.`}
                />

                <QuickAction
                  to="/admin/complaints"
                  icon={MessageSquareWarning}
                  title="Manage complaints"
                  description={`${summary.complaints.unassigned} unresolved cases are unassigned.`}
                />

                <QuickAction
                  to="/admin/reviews"
                  icon={Star}
                  title="Moderate reviews"
                  description={`${summary.reviews.hidden} reviews are currently hidden.`}
                />

                <QuickAction
                  to="/admin/users"
                  icon={Users}
                  title="Manage users"
                  description={`${summary.users.byStatus.suspended} accounts are suspended.`}
                />

                <QuickAction
                  to="/admin/reports"
                  icon={BarChart3}
                  title="Open reports"
                  description="Explore platform growth, activity, and revenue reporting."
                />
              </div>
            </aside>

            <section className="workspace-panel">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="section-eyebrow">Recent activity</p>

                  <h2 className="section-title">Newest platform users</h2>

                  <p className="section-description">
                    The most recently registered customer, vendor, and administrator accounts.
                  </p>
                </div>

                <Link to="/admin/users" className="btn-secondary text-sm">
                  View all users
                </Link>
              </div>

              {summary.activity.recentUsers.length > 0 ? (
                <div className="mt-7 overflow-hidden rounded-2xl border border-white/70 bg-white/46">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-soft)] text-left">
                          <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                            User
                          </th>

                          <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                            Role
                          </th>

                          <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                            Status
                          </th>

                          <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                            Joined
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {summary.activity.recentUsers.map((recentUser) => (
                          <tr
                            key={recentUser.id}
                            className="border-b border-[var(--border-soft)] last:border-b-0"
                          >
                            <td className="px-4 py-4">
                              <p className="text-sm font-black text-[var(--color-near-black)]">
                                {recentUser.firstName} {recentUser.lastName}
                              </p>

                              <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/52">
                                {recentUser.email}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-sm font-bold text-[var(--color-charcoal)]/68">
                              {userRoleLabels[recentUser.role]}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className="status-chip"
                                data-tone={getStatusTone(recentUser.status)}
                              >
                                {accountStatusLabels[recentUser.status]}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-[var(--color-charcoal)]/58">
                              {formatDate(recentUser.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-surface mt-7">
                  <Users className="mx-auto size-8 text-[var(--color-deep-plum)]/64" />

                  <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    No users yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                    Newly registered users will appear here.
                  </p>
                </div>
              )}
            </section>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <article className="workspace-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-eyebrow">Recent bookings</p>

                  <h2 className="section-title">Marketplace commitments</h2>
                </div>

                <BriefcaseBusiness className="size-6 text-[var(--color-deep-plum)]" />
              </div>

              {summary.activity.recentBookings.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {summary.activity.recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-white/70 bg-white/46 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-black text-[var(--color-near-black)]">
                            {booking.event.name}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
                            {booking.vendor.businessName}
                          </p>
                        </div>

                        <span className="status-chip" data-tone={getStatusTone(booking.status)}>
                          {bookingStatusLabels[booking.status]}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[var(--color-charcoal)]/52">
                        <span>{formatCurrency(booking.agreedCost)}</span>
                        <span>Service: {formatDate(booking.serviceStart)}</span>
                        <span>Created: {formatDate(booking.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-surface mt-6">
                  <BriefcaseBusiness className="mx-auto size-8 text-[var(--color-deep-plum)]/64" />

                  <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/56">
                    No booking activity is available yet.
                  </p>
                </div>
              )}
            </article>

            <article className="workspace-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-eyebrow">Recent payments</p>

                  <h2 className="section-title">Financial activity</h2>
                </div>

                <CreditCard className="size-6 text-[var(--color-deep-plum)]" />
              </div>

              {summary.activity.recentPayments.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {summary.activity.recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-2xl border border-white/70 bg-white/46 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-black text-[var(--color-near-black)]">
                            {formatCurrency(payment.amount)}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
                            {payment.booking.event.name} · {payment.booking.vendor.businessName}
                          </p>
                        </div>

                        <span className="status-chip" data-tone={getStatusTone(payment.status)}>
                          {paymentStatusLabels[payment.status]}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[var(--color-charcoal)]/52">
                        <span>{payment.method.replaceAll('_', ' ')}</span>
                        <span>Reference: {payment.referenceNumber}</span>
                        <span>{formatDate(payment.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-surface mt-6">
                  <CreditCard className="mx-auto size-8 text-[var(--color-deep-plum)]/64" />

                  <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/56">
                    No payment activity is available yet.
                  </p>
                </div>
              )}
            </article>
          </section>

          <section className="workspace-panel mt-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="section-eyebrow">Recent complaints</p>

                <h2 className="section-title">Latest support cases</h2>

                <p className="section-description">
                  Review newly created complaints and identify urgent or unassigned cases quickly.
                </p>
              </div>

              <Link to="/admin/complaints" className="btn-secondary text-sm">
                View all complaints
              </Link>
            </div>

            {summary.activity.recentComplaints.length > 0 ? (
              <div className="mt-7 grid gap-4 lg:grid-cols-2">
                {summary.activity.recentComplaints.map((complaint) => (
                  <article
                    key={complaint.id}
                    className="rounded-2xl border border-white/70 bg-white/46 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-[var(--color-near-black)]">
                          {complaint.subject}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
                          Submitted by {complaint.complainant.firstName}{' '}
                          {complaint.complainant.lastName}
                        </p>
                      </div>

                      <FileWarning className="size-5 shrink-0 text-[var(--color-rosewood)]" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="status-chip" data-tone={getStatusTone(complaint.status)}>
                        {complaintStatusLabels[complaint.status]}
                      </span>

                      <span
                        className="status-chip"
                        data-tone={
                          complaint.priority === 'URGENT'
                            ? 'danger'
                            : complaint.priority === 'HIGH'
                              ? 'warning'
                              : 'blue'
                        }
                      >
                        {complaintPriorityLabels[complaint.priority]}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[var(--color-charcoal)]/52">
                      <span>{complaint.type.replaceAll('_', ' ')}</span>
                      <span>{formatDate(complaint.createdAt)}</span>
                      <span>
                        {complaint.assignedAdmin
                          ? `Assigned to ${complaint.assignedAdmin.firstName}`
                          : 'Unassigned'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-surface mt-7">
                <MessageSquareWarning className="mx-auto size-8 text-[var(--color-deep-plum)]/64" />

                <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                  No complaints yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                  New complaint cases will appear here.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
