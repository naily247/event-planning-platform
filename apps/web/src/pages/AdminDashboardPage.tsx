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
import {
  getAdminDashboardSummary,
  type AdminAccountStatus,
  type AdminBookingStatus,
  type AdminComplaintPriority,
  type AdminComplaintStatus,
  type AdminPaymentStatus,
  type AdminUserRole,
} from '../features/admin/admin.api';
import { AdminWorkspaceNav } from '../features/admin/components/AdminWorkspaceNav';
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

const panelClassName =
  'rounded-3xl border border-violet-100/90 bg-white/88 shadow-[0_18px_50px_rgba(109,94,245,0.09)] backdrop-blur-xl';

const secondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50/80 hover:text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-400/30';

const primaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-violet-600 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(109,94,245,0.24)] transition hover:-translate-y-0.5 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-400/40';

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
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
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

  return 'blue';
}

function AdminStatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  surface,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof Users;
  tone: string;
  surface: string;
}) {
  return (
    <article
      className={`${panelClassName} relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(30,41,59,0.11)]`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t ${surface}`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <span className="rounded-full border border-violet-100/80 bg-white/80 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
          Live
        </span>
      </div>

      <div className="relative">
        <p className="mt-4 text-sm font-bold text-slate-500">{label}</p>

        <p className="mt-1 break-words text-3xl font-black tracking-[-0.045em] text-slate-950">
          {value}
        </p>

        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{helper}</p>
      </div>
    </article>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
  tone,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  description: string;
  tone: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-2xl border border-violet-100/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl transition ${tone}`}>
        <Icon className="size-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-slate-900">{title}</p>

        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
      </div>

      <ArrowRight className="mt-1 size-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-violet-600" />
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
      <div className="min-h-screen bg-[linear-gradient(135deg,#fbfaff_0%,#f6f2ff_46%,#effbf6_100%)] px-4 py-10">
        <div className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center">
          <div className={`${panelClassName} w-full p-10 text-center`}>
            <LoaderCircle className="mx-auto size-10 animate-spin text-violet-600" />

            <p className="mt-5 text-xl font-black text-slate-950">Preparing the admin workspace</p>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Loading platform totals, financial activity, moderation queues, and recent records.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !currentUserQuery.data || !summaryQuery.data) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#fbfaff_0%,#f6f2ff_46%,#effbf6_100%)] px-4 py-10">
        <div className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center">
          <div className={`${panelClassName} w-full p-10 text-center`}>
            <div className="mx-auto grid size-12 place-items-center rounded-xl bg-rose-100 text-rose-700">
              <CircleAlert className="size-6" />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-950">Admin dashboard unavailable</h1>

            <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">
              {getErrorMessage(loadError)}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className={primaryButtonClassName}
                onClick={() => {
                  void Promise.all([currentUserQuery.refetch(), summaryQuery.refetch()]);
                }}
              >
                Try again
              </button>

              <button type="button" className={secondaryButtonClassName} onClick={handleLogout}>
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
      tone: 'bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700',
      surface: 'from-violet-100/90 via-violet-50/50 to-transparent',
    },
    {
      label: 'Pending vendors',
      value: summary.vendors.pending,
      helper: `${summary.vendors.approved} approved vendor profiles`,
      icon: Store,
      tone: 'bg-amber-100 text-amber-700',
      surface: 'from-amber-100/85 via-amber-50/45 to-transparent',
    },
    {
      label: 'Pending payments',
      value: summary.payments.pending,
      helper: `${summary.payments.verified} payments verified`,
      icon: CreditCard,
      tone: 'bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700',
      surface: 'from-sky-100/85 via-cyan-50/45 to-transparent',
    },
    {
      label: 'Open complaints',
      value: summary.complaints.open,
      helper: `${summary.complaints.unassigned} active cases unassigned`,
      icon: MessageSquareWarning,
      tone: 'bg-rose-100 text-rose-700',
      surface: 'from-rose-100/85 via-rose-50/45 to-transparent',
    },
    {
      label: 'Active events',
      value: summary.events.active,
      helper: `${summary.events.total} events created overall`,
      icon: CalendarDays,
      tone: 'bg-emerald-100 text-emerald-700',
      surface: 'from-emerald-100/90 via-emerald-50/45 to-transparent',
    },
    {
      label: 'Active bookings',
      value: summary.bookings.active,
      helper: `${summary.bookings.awaitingVendorConfirmation} awaiting vendor response`,
      icon: BriefcaseBusiness,
      tone: 'bg-violet-100 text-violet-700',
      surface: 'from-violet-100/90 via-fuchsia-50/45 to-transparent',
    },
    {
      label: 'Verified revenue',
      value: formatCurrency(summary.payments.totalVerifiedAmount),
      helper: `${summary.payments.total} payment records`,
      icon: BarChart3,
      tone: 'bg-teal-100 text-teal-700',
      surface: 'from-teal-100/90 via-emerald-50/45 to-transparent',
    },
    {
      label: 'Average review',
      value:
        summary.reviews.averageRating === null ? '—' : summary.reviews.averageRating.toFixed(1),
      helper: `${summary.reviews.hidden} hidden of ${summary.reviews.total} reviews`,
      icon: Star,
      tone: 'bg-orange-100 text-orange-700',
      surface: 'from-orange-100/85 via-amber-50/45 to-transparent',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#fbfaff_0%,#f5f0ff_44%,#eefaf5_100%)] text-slate-900">
      <div className="pointer-events-none absolute -left-32 top-56 size-[30rem] rounded-full bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-[44rem] size-[34rem] rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <header
          className={`${panelClassName} flex flex-col gap-5 bg-white/75 p-4 backdrop-blur-2xl sm:p-5 lg:flex-row lg:items-center lg:justify-between`}
        >
          <Link to="/" className="flex w-fit items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-emerald-400 text-white shadow-[0_10px_28px_rgba(109,94,245,0.28)]">
              <ShieldCheck className="size-5" />
            </span>

            <span className="flex flex-col leading-none">
              <span className="text-base font-black tracking-[-0.03em] text-slate-950">
                Eventure
              </span>

              <span className="mt-1 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-violet-600">
                Admin workspace
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" className={secondaryButtonClassName} onClick={handleLogout}>
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </header>

        <div className="mt-4">
          <AdminWorkspaceNav />
        </div>

        <main className="py-6">
          <section className={`${panelClassName} overflow-hidden`}>
            <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#faf7ff_0%,#f3edff_42%,#e8fbf3_100%)] px-6 py-8 text-slate-900 sm:px-8 sm:py-10">
                <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_20%,rgba(167,139,250,0.26),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(110,231,183,0.28),transparent_34%),radial-gradient(circle_at_64%_82%,rgba(196,181,253,0.34),transparent_38%),linear-gradient(135deg,#fbf9ff_0%,#f4efff_48%,#eafbf3_100%)]" />
                <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-80 rounded-full border border-violet-300/25" />
                <div className="pointer-events-none absolute -right-6 -top-10 -z-10 size-56 rounded-full border border-violet-300/25" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-violet-200/35 to-transparent" />

                <div className="flex w-fit items-center gap-2 rounded-full border border-violet-200/80 bg-white/65 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-violet-700 backdrop-blur">
                  <LayoutDashboard className="size-4" />
                  Platform operations
                </div>

                <h1 className="mt-6 max-w-4xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-5xl">
                  Welcome back, {user.firstName}. Keep Eventure healthy and moving.
                </h1>

                <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg">
                  Monitor marketplace activity, clear operational queues, moderate records, and
                  maintain visibility across the platform.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-violet-100 bg-white/75 px-4 py-4 backdrop-blur-sm">
                    <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Users
                    </p>
                    <p className="mt-2 text-2xl font-black">{summary.users.total}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Registered accounts</p>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-white/75 px-4 py-4 backdrop-blur-sm">
                    <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Active events
                    </p>
                    <p className="mt-2 text-2xl font-black">{summary.events.active}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Currently operating</p>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-white/75 px-4 py-4 backdrop-blur-sm">
                    <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Open complaints
                    </p>
                    <p className="mt-2 text-2xl font-black">{summary.complaints.open}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Need attention</p>
                  </div>
                </div>
              </div>

              <aside className="border-t border-violet-100/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8f9ff_100%)] p-5 sm:p-6 xl:border-l xl:border-t-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-violet-600">
                  Current snapshot
                </p>

                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">
                  Dashboard generated
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {formatDateTime(summary.generatedAt)}
                </p>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-indigo-700">
                        Active accounts
                      </p>
                      <Users className="size-4 text-violet-600" />
                    </div>

                    <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">
                      {summary.users.byStatus.active}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-rose-700">
                        Urgent complaints
                      </p>
                      <FileWarning className="size-4 text-rose-700" />
                    </div>

                    <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-rose-950">
                      {summary.complaints.urgent}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-violet-100/80 bg-white p-4 shadow-sm">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    Control centre
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Review priority queues first, then use reports for the wider platform picture.
                  </p>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <AdminStatCard key={stat.label} {...stat} />
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <aside className={`${panelClassName} bg-[#f8f9fd] p-5 sm:p-6`}>
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-violet-600">
                Quick actions
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
                Operational queues
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Open the areas most likely to need administrator attention.
              </p>

              <div className="mt-6 grid gap-3">
                <QuickAction
                  to="/admin/vendors"
                  icon={Store}
                  title="Review vendor applications"
                  tone="bg-amber-100 text-amber-700"
                  description={`${summary.vendors.pending} applications are currently pending.`}
                />

                <QuickAction
                  to="/admin/payments"
                  icon={CreditCard}
                  title="Verify pending payments"
                  tone="bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700"
                  description={`${summary.payments.pending} payments are waiting for review.`}
                />

                <QuickAction
                  to="/admin/complaints"
                  icon={MessageSquareWarning}
                  title="Manage complaints"
                  tone="bg-rose-100 text-rose-700"
                  description={`${summary.complaints.unassigned} unresolved cases are unassigned.`}
                />

                <QuickAction
                  to="/admin/reviews"
                  icon={Star}
                  title="Moderate reviews"
                  tone="bg-violet-100 text-violet-700"
                  description={`${summary.reviews.hidden} reviews are currently hidden.`}
                />

                <QuickAction
                  to="/admin/users"
                  icon={Users}
                  title="Manage users"
                  tone="bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700"
                  description={`${summary.users.byStatus.suspended} accounts are suspended.`}
                />

                <QuickAction
                  to="/admin/reports"
                  icon={BarChart3}
                  title="Open reports"
                  tone="bg-emerald-100 text-emerald-700"
                  description="Explore growth, marketplace activity, and revenue."
                />
              </div>
            </aside>

            <section
              className={`${panelClassName} min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,249,255,0.72))] p-5 sm:p-6`}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-violet-600">
                    Recent activity
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
                    Newest platform users
                  </h2>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    Recently registered customer, vendor, and administrator accounts.
                  </p>
                </div>

                <Link to="/admin/users" className={secondaryButtonClassName}>
                  View all users
                </Link>
              </div>

              {summary.activity.recentUsers.length > 0 ? (
                <div className="mt-6 overflow-hidden rounded-xl border border-violet-100">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse bg-white">
                      <thead className="bg-indigo-50/60">
                        <tr className="border-b border-violet-100 text-left">
                          <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                            User
                          </th>

                          <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                            Role
                          </th>

                          <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                            Status
                          </th>

                          <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                            Joined
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {summary.activity.recentUsers.map((recentUser) => (
                          <tr
                            key={recentUser.id}
                            className="border-b border-slate-100 last:border-b-0 transition hover:bg-indigo-50/45"
                          >
                            <td className="px-4 py-4">
                              <p className="text-sm font-extrabold text-slate-900">
                                {recentUser.firstName} {recentUser.lastName}
                              </p>

                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {recentUser.email}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-slate-600">
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

                            <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-500">
                              {formatDate(recentUser.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-violet-50/45 px-6 py-10 text-center">
                  <Users className="mx-auto size-8 text-slate-400" />

                  <h3 className="mt-4 text-lg font-black text-slate-900">No users yet</h3>

                  <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                    Newly registered users will appear here.
                  </p>
                </div>
              )}
            </section>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <article
              className={`${panelClassName} border-l-4 border-l-violet-400 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,243,255,0.72))] p-5 sm:p-6`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-violet-600">
                    Recent bookings
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
                    Marketplace commitments
                  </h2>
                </div>

                <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700">
                  <BriefcaseBusiness className="size-5" />
                </div>
              </div>

              {summary.activity.recentBookings.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {summary.activity.recentBookings.map((booking) => (
                    <div key={booking.id} className="rounded-xl border border-violet-100 p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-extrabold text-slate-900">{booking.event.name}</p>

                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {booking.vendor.businessName}
                          </p>
                        </div>

                        <span className="status-chip" data-tone={getStatusTone(booking.status)}>
                          {bookingStatusLabels[booking.status]}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                        <span>{formatCurrency(booking.agreedCost)}</span>
                        <span>Service: {formatDate(booking.serviceStart)}</span>
                        <span>Created: {formatDate(booking.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-violet-50/45 px-6 py-10 text-center">
                  <BriefcaseBusiness className="mx-auto size-8 text-slate-400" />

                  <p className="mt-4 text-sm font-medium text-slate-500">
                    No booking activity is available yet.
                  </p>
                </div>
              )}
            </article>

            <article
              className={`${panelClassName} border-l-4 border-l-sky-400 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,249,255,0.78))] p-5 sm:p-6`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-violet-600">
                    Recent payments
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
                    Financial activity
                  </h2>
                </div>

                <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700">
                  <CreditCard className="size-5" />
                </div>
              </div>

              {summary.activity.recentPayments.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {summary.activity.recentPayments.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-violet-100 p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-extrabold text-slate-900">
                            {formatCurrency(payment.amount)}
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {payment.booking.event.name} · {payment.booking.vendor.businessName}
                          </p>
                        </div>

                        <span className="status-chip" data-tone={getStatusTone(payment.status)}>
                          {paymentStatusLabels[payment.status]}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                        <span>{payment.method.replaceAll('_', ' ')}</span>
                        <span>Reference: {payment.referenceNumber}</span>
                        <span>{formatDate(payment.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-violet-50/45 px-6 py-10 text-center">
                  <CreditCard className="mx-auto size-8 text-slate-400" />

                  <p className="mt-4 text-sm font-medium text-slate-500">
                    No payment activity is available yet.
                  </p>
                </div>
              )}
            </article>
          </section>

          <section
            className={`${panelClassName} mt-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,241,242,0.68))] p-5 sm:p-6`}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-violet-600">
                  Recent complaints
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
                  Latest support cases
                </h2>

                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Identify urgent, newly created, and unassigned complaint cases quickly.
                </p>
              </div>

              <Link to="/admin/complaints" className={secondaryButtonClassName}>
                View all complaints
              </Link>
            </div>

            {summary.activity.recentComplaints.length > 0 ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {summary.activity.recentComplaints.map((complaint) => (
                  <article
                    key={complaint.id}
                    className="rounded-2xl border border-violet-100 border-l-4 border-l-rose-400 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-extrabold text-slate-900">{complaint.subject}</p>

                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Submitted by {complaint.complainant.firstName}{' '}
                          {complaint.complainant.lastName}
                        </p>
                      </div>

                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700">
                        <FileWarning className="size-5" />
                      </div>
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

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
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
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-violet-50/45 px-6 py-10 text-center">
                <MessageSquareWarning className="mx-auto size-8 text-slate-400" />

                <h3 className="mt-4 text-lg font-black text-slate-900">No complaints yet</h3>

                <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
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
