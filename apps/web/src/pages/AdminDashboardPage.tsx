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
  'rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-white/82 shadow-[0_18px_50px_rgba(64,42,51,0.07)] backdrop-blur-xl';

const secondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(91,61,82,0.12)] bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[rgba(91,61,82,0.20)] hover:bg-[rgba(183,167,200,0.10)] hover:text-[var(--color-deep-plum)] focus:outline-none focus:ring-2 focus:ring-[rgba(91,61,82,0.14)]';

const primaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-92 focus:outline-none focus:ring-2 focus:ring-[rgba(91,61,82,0.20)]';

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
      className={`${panelClassName} group relative overflow-hidden px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(64,42,51,0.10)]`}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-[rgba(183,167,200,0.10)] blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
            <Icon className="size-4" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500">{label}</p>

            <p className="mt-0.5 break-words text-2xl font-black tracking-[-0.04em] text-slate-950">
              {value}
            </p>
          </div>
        </div>

        <span className="rounded-full border border-[rgba(91,61,82,0.09)] bg-white/65 px-2 py-0.5 text-[0.56rem] font-extrabold uppercase tracking-[0.13em] text-slate-400">
          Live
        </span>
      </div>

      <p className="relative mt-2 text-xs font-medium leading-5 text-slate-500">{helper}</p>
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
  tone: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-[1.1rem] border border-[rgba(91,61,82,0.09)] bg-white/68 px-3.5 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(91,61,82,0.16)] hover:bg-[rgba(183,167,200,0.09)] hover:shadow-[0_12px_28px_rgba(64,42,51,0.07)]"
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)] transition group-hover:bg-[rgba(183,167,200,0.20)]">
        <Icon className="size-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold leading-5 text-slate-900">{title}</p>

        <p className="mt-0.5 line-clamp-2 text-[0.68rem] font-medium leading-4 text-slate-500">
          {description}
        </p>
      </div>

      <ArrowRight className="size-3.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[var(--color-deep-plum)]" />
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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#fbf9fa_0%,#f7f3f6_48%,#f5f3f8_100%)] text-slate-900">
      <div className="pointer-events-none absolute -left-40 top-48 size-[30rem] rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />
      <div className="pointer-events-none absolute -right-44 top-[38rem] size-[32rem] rounded-full bg-[rgba(214,190,177,0.12)] blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <AdminWorkspaceNav prominentBrand />

        <main className="py-4">
          <section className={`${panelClassName} overflow-hidden`}>
            <div className="grid xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#fbf8fa_0%,#f5eff5_54%,#f1edf5_100%)] px-6 py-5 text-slate-900 sm:px-7 sm:py-6">
                <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_16%,rgba(183,167,200,0.20),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(214,190,177,0.14),transparent_31%),linear-gradient(135deg,#fbf9fa_0%,#f6f0f5_52%,#f2eef5_100%)]" />

                <div className="pointer-events-none absolute -right-20 -top-28 -z-10 size-72 rounded-full border border-[rgba(91,61,82,0.08)]" />

                <div className="pointer-events-none absolute -right-5 -top-12 -z-10 size-48 rounded-full border border-[rgba(91,61,82,0.07)]" />

                <div className="flex w-fit items-center gap-2 rounded-full border border-[rgba(91,61,82,0.10)] bg-white/60 px-3 py-1.5 text-[0.64rem] font-extrabold uppercase tracking-[0.17em] text-[var(--color-deep-plum)] backdrop-blur">
                  <LayoutDashboard className="size-3.5" />
                  Platform operations
                </div>

                <h1 className="mt-4 max-w-4xl text-balance text-[2.25rem] font-black leading-[0.98] tracking-[-0.05em] sm:text-[2.7rem]">
                  Welcome back, {user.firstName}. Keep Eventure healthy and moving.
                </h1>

                <p className="mt-3 max-w-2xl text-pretty text-sm font-medium leading-6 text-slate-600">
                  Monitor marketplace activity, clear operational queues, moderate records, and
                  maintain visibility across the platform.
                </p>

                <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-[1.15rem] border border-[rgba(91,61,82,0.08)] bg-white/62 px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                          Users
                        </p>

                        <p className="mt-1 text-xl font-black">{summary.users.total}</p>
                      </div>

                      <Users className="size-4 text-[var(--color-rosewood)]" />
                    </div>

                    <p className="mt-1 text-[0.68rem] font-semibold text-slate-500">
                      Registered accounts
                    </p>
                  </div>

                  <div className="rounded-[1.15rem] border border-[rgba(91,61,82,0.08)] bg-white/62 px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                          Active events
                        </p>

                        <p className="mt-1 text-xl font-black">{summary.events.active}</p>
                      </div>

                      <CalendarDays className="size-4 text-[var(--color-rosewood)]" />
                    </div>

                    <p className="mt-1 text-[0.68rem] font-semibold text-slate-500">
                      Currently operating
                    </p>
                  </div>

                  <div className="rounded-[1.15rem] border border-[rgba(91,61,82,0.08)] bg-white/62 px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                          Open complaints
                        </p>

                        <p className="mt-1 text-xl font-black">{summary.complaints.open}</p>
                      </div>

                      <MessageSquareWarning className="size-4 text-[var(--color-rosewood)]" />
                    </div>

                    <p className="mt-1 text-[0.68rem] font-semibold text-slate-500">
                      Need attention
                    </p>
                  </div>
                </div>
              </div>

              <aside className="border-t border-[rgba(91,61,82,0.08)] bg-white/64 p-5 xl:border-l xl:border-t-0">
                <div className="flex items-start justify-between gap-3 xl:block">
                  <div>
                    <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                      Current snapshot
                    </p>

                    <h2 className="mt-1.5 text-lg font-black tracking-[-0.03em] text-slate-950">
                      Dashboard generated
                    </h2>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatDateTime(summary.generatedAt)}
                    </p>
                  </div>

                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)] xl:hidden">
                    <ShieldCheck className="size-4" />
                  </div>
                </div>

                <div className="mt-4 grid gap-2.5">
                  <div className="rounded-[1.15rem] border border-[rgba(91,61,82,0.10)] bg-[rgba(183,167,200,0.10)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[var(--color-deep-plum)]">
                        Active accounts
                      </p>

                      <Users className="size-4 text-[var(--color-rosewood)]" />
                    </div>

                    <p className="mt-1.5 text-2xl font-black tracking-[-0.04em] text-slate-950">
                      {summary.users.byStatus.active}
                    </p>
                  </div>

                  <div className="rounded-[1.15rem] border border-rose-200/70 bg-rose-50/55 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-rose-700">
                        Urgent complaints
                      </p>

                      <FileWarning className="size-4 text-rose-600" />
                    </div>

                    <p className="mt-1.5 text-2xl font-black tracking-[-0.04em] text-slate-950">
                      {summary.complaints.urgent}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 rounded-[1.15rem] border border-[rgba(91,61,82,0.08)] bg-white/62 px-4 py-3">
                  <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    Control centre
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                    Review priority queues first, then use reports for the wider platform picture.
                  </p>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <AdminStatCard key={stat.label} {...stat} />
            ))}
          </section>
          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <aside className={`${panelClassName} bg-white/72 p-4 sm:p-5`}>
              <div className="flex flex-col gap-1">
                <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                  Quick actions
                </p>

                <h2 className="text-xl font-black tracking-[-0.035em] text-slate-950">
                  Operational queues
                </h2>

                <p className="text-xs font-medium leading-5 text-slate-500">
                  Open the areas most likely to need administrator attention.
                </p>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
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

            <section className={`${panelClassName} min-w-0 bg-white/72 p-4 sm:p-5`}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                    Recent activity
                  </p>

                  <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-slate-950">
                    Newest platform users
                  </h2>

                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                    Recently registered customer, vendor, and administrator accounts.
                  </p>
                </div>

                <Link to="/admin/users" className={secondaryButtonClassName}>
                  View all users
                </Link>
              </div>

              {summary.activity.recentUsers.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-[1.1rem] border border-[rgba(91,61,82,0.09)]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse bg-white/72">
                      <thead className="bg-[rgba(183,167,200,0.09)]">
                        <tr className="border-b border-[rgba(91,61,82,0.08)] text-left">
                          <th className="px-3.5 py-2.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                            User
                          </th>

                          <th className="px-3.5 py-2.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                            Role
                          </th>

                          <th className="px-3.5 py-2.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                            Status
                          </th>

                          <th className="px-3.5 py-2.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                            Joined
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {summary.activity.recentUsers.map((recentUser) => (
                          <tr
                            key={recentUser.id}
                            className="border-b border-[rgba(91,61,82,0.06)] last:border-b-0 transition hover:bg-[rgba(183,167,200,0.07)]"
                          >
                            <td className="px-3.5 py-2.5">
                              <p className="text-xs font-extrabold text-slate-900">
                                {recentUser.firstName} {recentUser.lastName}
                              </p>

                              <p className="mt-0.5 text-[0.68rem] font-medium text-slate-500">
                                {recentUser.email}
                              </p>
                            </td>

                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                              {userRoleLabels[recentUser.role]}
                            </td>

                            <td className="px-3.5 py-2.5">
                              <span
                                className="status-chip"
                                data-tone={getStatusTone(recentUser.status)}
                              >
                                {accountStatusLabels[recentUser.status]}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-3.5 py-2.5 text-xs font-medium text-slate-500">
                              {formatDate(recentUser.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.1rem] border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(183,167,200,0.06)] px-5 py-7 text-center">
                  <Users className="mx-auto size-7 text-slate-400" />

                  <h3 className="mt-3 text-base font-black text-slate-900">No users yet</h3>

                  <p className="mx-auto mt-1 max-w-md text-xs font-medium leading-5 text-slate-500">
                    Newly registered users will appear here.
                  </p>
                </div>
              )}
            </section>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className={`${panelClassName} bg-white/72 p-4 sm:p-5`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                    Recent bookings
                  </p>

                  <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-slate-950">
                    Marketplace commitments
                  </h2>
                </div>

                <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                  <BriefcaseBusiness className="size-4" />
                </div>
              </div>

              {summary.activity.recentBookings.length > 0 ? (
                <div className="mt-4 space-y-2.5">
                  {summary.activity.recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-[1.05rem] border border-[rgba(91,61,82,0.08)] bg-white/58 px-3.5 py-3"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-900">
                            {booking.event.name}
                          </p>

                          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                            {booking.vendor.businessName}
                          </p>
                        </div>

                        <span
                          className="status-chip shrink-0"
                          data-tone={getStatusTone(booking.status)}
                        >
                          {bookingStatusLabels[booking.status]}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] font-semibold text-slate-500">
                        <span>{formatCurrency(booking.agreedCost)}</span>
                        <span>Service: {formatDate(booking.serviceStart)}</span>
                        <span>Created: {formatDate(booking.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.1rem] border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(183,167,200,0.06)] px-5 py-7 text-center">
                  <BriefcaseBusiness className="mx-auto size-7 text-slate-400" />

                  <p className="mt-3 text-xs font-medium text-slate-500">
                    No booking activity is available yet.
                  </p>
                </div>
              )}
            </article>

            <article className={`${panelClassName} bg-white/72 p-4 sm:p-5`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                    Recent payments
                  </p>

                  <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-slate-950">
                    Financial activity
                  </h2>
                </div>

                <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                  <CreditCard className="size-4" />
                </div>
              </div>

              {summary.activity.recentPayments.length > 0 ? (
                <div className="mt-4 space-y-2.5">
                  {summary.activity.recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-[1.05rem] border border-[rgba(91,61,82,0.08)] bg-white/58 px-3.5 py-3"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900">
                            {formatCurrency(payment.amount)}
                          </p>

                          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                            {payment.booking.event.name} · {payment.booking.vendor.businessName}
                          </p>
                        </div>

                        <span
                          className="status-chip shrink-0"
                          data-tone={getStatusTone(payment.status)}
                        >
                          {paymentStatusLabels[payment.status]}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] font-semibold text-slate-500">
                        <span>{payment.method.replaceAll('_', ' ')}</span>
                        <span className="min-w-0 max-w-full truncate">
                          Reference: {payment.referenceNumber}
                        </span>
                        <span>{formatDate(payment.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.1rem] border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(183,167,200,0.06)] px-5 py-7 text-center">
                  <CreditCard className="mx-auto size-7 text-slate-400" />

                  <p className="mt-3 text-xs font-medium text-slate-500">
                    No payment activity is available yet.
                  </p>
                </div>
              )}
            </article>
          </section>

          <section className={`${panelClassName} mt-4 bg-white/72 p-4`}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                  Recent complaints
                </p>

                <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-slate-950">
                  Latest support cases
                </h2>

                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                  Identify urgent, newly created, and unassigned complaint cases quickly.
                </p>
              </div>

              <Link to="/admin/complaints" className={secondaryButtonClassName}>
                View all complaints
              </Link>
            </div>

            {summary.activity.recentComplaints.length > 0 ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {summary.activity.recentComplaints.map((complaint) => (
                  <article
                    key={complaint.id}
                    className="rounded-[1.1rem] border border-[rgba(91,61,82,0.08)] bg-white/62 px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {complaint.subject}
                        </p>

                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          Submitted by {complaint.complainant.firstName}{' '}
                          {complaint.complainant.lastName}
                        </p>
                      </div>

                      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-100/80 text-rose-700">
                        <FileWarning className="size-4" />
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-2">
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

                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] font-semibold text-slate-500">
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
              <div className="mt-4 rounded-[1.1rem] border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(183,167,200,0.06)] px-5 py-7 text-center">
                <MessageSquareWarning className="mx-auto size-7 text-slate-400" />

                <h3 className="mt-3 text-base font-black text-slate-900">No complaints yet</h3>

                <p className="mx-auto mt-1 max-w-md text-xs font-medium leading-5 text-slate-500">
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
