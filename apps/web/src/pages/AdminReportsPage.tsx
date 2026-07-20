import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  LoaderCircle,
  MessageSquareWarning,
  RefreshCw,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  getAdminBookingReport,
  getAdminComplaintReport,
  getAdminEventReport,
  getAdminPaymentReport,
  getAdminRevenueReport,
  getAdminUserReport,
  getAdminVendorReport,
  type AdminReportGroupBy,
} from '../features/admin/adminReports.api';
import { AdminWorkspaceNav } from '../features/admin/components/AdminWorkspaceNav';

type ReportTab =
  | 'users'
  | 'vendors'
  | 'events'
  | 'bookings'
  | 'payments'
  | 'revenue'
  | 'complaints';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

type ReportMetric = {
  label: string;
  value: string | number;
  helper?: string;
};

const reportTabs: Array<{
  id: ReportTab;
  label: string;
  description: string;
  icon: typeof Users;
}> = [
  {
    id: 'users',
    label: 'Users',
    description: 'Registrations, roles, and account health',
    icon: Users,
  },
  {
    id: 'vendors',
    label: 'Vendors',
    description: 'Verification and marketplace supply',
    icon: Store,
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Planning activity, budgets, and guests',
    icon: CalendarDays,
  },
  {
    id: 'bookings',
    label: 'Bookings',
    description: 'Commitments, values, and lifecycle states',
    icon: BriefcaseBusiness,
  },
  {
    id: 'payments',
    label: 'Payments',
    description: 'Payment volume, status, and value',
    icon: CreditCard,
  },
  {
    id: 'revenue',
    label: 'Revenue',
    description: 'Verified income and financial performance',
    icon: CircleDollarSign,
  },
  {
    id: 'complaints',
    label: 'Complaints',
    description: 'Case volume, assignment, and resolution',
    icon: MessageSquareWarning,
  },
];

function getErrorMessage(error: unknown) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load this report. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load this report. Please try again.'
  );
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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

function formatDecimal(value: number | null) {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}

function MetricCard({ metric }: { metric: ReportMetric }) {
  return (
    <article className="workspace-card p-5">
      <p className="text-sm font-bold text-[var(--color-charcoal)]/56">{metric.label}</p>

      <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
        {metric.value}
      </p>

      {metric.helper ? (
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/50">
          {metric.helper}
        </p>
      ) : null}
    </article>
  );
}

function GrowthBars({
  title,
  points,
  valueKey = 'count',
  valueFormatter,
}: {
  title: string;
  points: Array<Record<string, string | number>>;
  valueKey?: string;
  valueFormatter?: (value: number) => string;
}) {
  const maximum = Math.max(1, ...points.map((point) => Number(point[valueKey] ?? 0)));

  return (
    <section className="workspace-panel">
      <p className="section-eyebrow">Trend</p>

      <h2 className="section-title">{title}</h2>

      {points.length > 0 ? (
        <div className="mt-7 space-y-4">
          {points.map((point) => {
            const value = Number(point[valueKey] ?? 0);
            const width = Math.max(4, (value / maximum) * 100);

            return (
              <div key={String(point.period)}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-[var(--color-charcoal)]/62">
                    {String(point.period)}
                  </span>

                  <span className="font-black text-[var(--color-near-black)]">
                    {valueFormatter ? valueFormatter(value) : value}
                  </span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/55">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy))]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-surface mt-7">
          <TrendingUp className="mx-auto size-8 text-[var(--color-deep-plum)]/60" />

          <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/54">
            No growth data is available for this range.
          </p>
        </div>
      )}
    </section>
  );
}

function RankedList({
  title,
  eyebrow,
  items,
}: {
  title: string;
  eyebrow: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    value: string | number;
  }>;
}) {
  return (
    <section className="workspace-panel">
      <p className="section-eyebrow">{eyebrow}</p>

      <h2 className="section-title">{title}</h2>

      {items.length > 0 ? (
        <div className="mt-6 space-y-3">
          {items.map((item, index) => (
            <article
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/52 p-4"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-sm font-black text-[var(--color-deep-plum)]">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-[var(--color-near-black)]">{item.title}</p>

                  {item.subtitle ? (
                    <p className="mt-1 truncate text-xs font-semibold text-[var(--color-charcoal)]/50">
                      {item.subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              <p className="shrink-0 text-sm font-black text-[var(--color-near-black)]">
                {item.value}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-surface mt-6">
          <BarChart3 className="mx-auto size-8 text-[var(--color-deep-plum)]/60" />

          <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/54">
            No ranking data is available.
          </p>
        </div>
      )}
    </section>
  );
}

export function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('users');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState<AdminReportGroupBy>('day');
  const [recentLimit, setRecentLimit] = useState(10);

  const commonParams = useMemo(
    () => ({
      ...(from && {
        from,
      }),
      ...(to && {
        to,
      }),
      groupBy,
      recentLimit,
    }),
    [from, to, groupBy, recentLimit],
  );

  const usersQuery = useQuery({
    queryKey: ['admin', 'reports', 'users', commonParams],
    queryFn: () => getAdminUserReport(commonParams),
    enabled: activeTab === 'users',
  });

  const vendorsQuery = useQuery({
    queryKey: ['admin', 'reports', 'vendors', commonParams],
    queryFn: () => getAdminVendorReport(commonParams),
    enabled: activeTab === 'vendors',
  });

  const eventsQuery = useQuery({
    queryKey: ['admin', 'reports', 'events', commonParams],
    queryFn: () => getAdminEventReport(commonParams),
    enabled: activeTab === 'events',
  });

  const bookingsQuery = useQuery({
    queryKey: ['admin', 'reports', 'bookings', commonParams],
    queryFn: () => getAdminBookingReport(commonParams),
    enabled: activeTab === 'bookings',
  });

  const paymentsQuery = useQuery({
    queryKey: ['admin', 'reports', 'payments', commonParams],
    queryFn: () => getAdminPaymentReport(commonParams),
    enabled: activeTab === 'payments',
  });

  const revenueQuery = useQuery({
    queryKey: ['admin', 'reports', 'revenue', commonParams],
    queryFn: () => getAdminRevenueReport(commonParams),
    enabled: activeTab === 'revenue',
  });

  const complaintsQuery = useQuery({
    queryKey: ['admin', 'reports', 'complaints', commonParams],
    queryFn: () => getAdminComplaintReport(commonParams),
    enabled: activeTab === 'complaints',
  });

  const activeQuery =
    activeTab === 'users'
      ? usersQuery
      : activeTab === 'vendors'
        ? vendorsQuery
        : activeTab === 'events'
          ? eventsQuery
          : activeTab === 'bookings'
            ? bookingsQuery
            : activeTab === 'payments'
              ? paymentsQuery
              : activeTab === 'revenue'
                ? revenueQuery
                : complaintsQuery;

  function resetFilters() {
    setFrom('');
    setTo('');
    setGroupBy('day');
    setRecentLimit(10);
  }

  return (
    <div className="workspace-shell">
      <div className="workspace-container">
        <AdminWorkspaceNav />

        <main className="py-8">
          <section className="workspace-hero">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <BarChart3 className="size-4" />
                  Platform intelligence
                </div>

                <h1 className="max-w-4xl text-balance text-4xl font-black leading-[1] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                  Understand how Eventure is growing and performing.
                </h1>

                <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--color-charcoal)]/68">
                  Explore account growth, marketplace activity, event planning, financial
                  performance, booking health, and complaint trends from one reporting workspace.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/72 px-5 py-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                  Active report
                </p>

                <p className="mt-2 text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  {reportTabs.find((tab) => tab.id === activeTab)?.label}
                </p>
              </div>
            </div>
          </section>

          <section className="workspace-panel mt-6">
            <p className="section-eyebrow">Report navigation</p>

            <h2 className="section-title">Choose a report</h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={
                      isActive
                        ? 'rounded-2xl border border-[rgba(93,58,85,0.28)] bg-[rgba(183,167,200,0.25)] p-4 text-left shadow-sm'
                        : 'rounded-2xl border border-white/70 bg-white/48 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/72'
                    }
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon
                      className={
                        isActive
                          ? 'size-5 text-[var(--color-deep-plum)]'
                          : 'size-5 text-[var(--color-charcoal)]/50'
                      }
                    />

                    <p className="mt-4 text-sm font-black text-[var(--color-near-black)]">
                      {tab.label}
                    </p>

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                      {tab.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="workspace-panel mt-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="section-eyebrow">Report controls</p>

                <h2 className="section-title">Date range and grouping</h2>

                <p className="section-description">
                  Date filters apply to when records were created. Leave both dates empty to include
                  all available history.
                </p>
              </div>

              <button type="button" className="btn-secondary text-sm" onClick={resetFilters}>
                <RefreshCw className="size-4" />
                Reset filters
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label>
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/68">
                  From
                </span>

                <input
                  type="date"
                  className="form-field"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/68">
                  To
                </span>

                <input
                  type="date"
                  className="form-field"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/68">
                  Group growth by
                </span>

                <select
                  className="form-field"
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value as AdminReportGroupBy)}
                >
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/68">
                  Recent records
                </span>

                <select
                  className="form-field"
                  value={recentLimit}
                  onChange={(event) => setRecentLimit(Number(event.target.value))}
                >
                  <option value={5}>5 records</option>
                  <option value={10}>10 records</option>
                  <option value={15}>15 records</option>
                  <option value={20}>20 records</option>
                </select>
              </label>
            </div>
          </section>

          {activeQuery.isLoading ? (
            <section className="state-surface mt-6">
              <div>
                <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

                <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                  Generating report
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                  Calculating totals, trends, rankings, and recent activity.
                </p>
              </div>
            </section>
          ) : activeQuery.isError ? (
            <section className="state-surface mt-6">
              <div className="max-w-lg">
                <div className="icon-tile mx-auto">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                  Report could not be generated
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                  {getErrorMessage(activeQuery.error)}
                </p>

                <button
                  type="button"
                  className="btn-primary mt-6 text-sm"
                  onClick={() => activeQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              {activeTab === 'users' && usersQuery.data ? (
                <>
                  <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: 'Matching users',
                        value: usersQuery.data.totals.users,
                      },
                      {
                        label: 'Customers',
                        value: usersQuery.data.totals.byRole.customers,
                      },
                      {
                        label: 'Vendors',
                        value: usersQuery.data.totals.byRole.vendors,
                      },
                      {
                        label: 'Active accounts',
                        value: usersQuery.data.totals.byStatus.active,
                      },
                    ].map((metric) => (
                      <MetricCard key={metric.label} metric={metric} />
                    ))}
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-2">
                    <GrowthBars title="User registrations" points={usersQuery.data.growth} />

                    <RankedList
                      eyebrow="Account health"
                      title="Users by status"
                      items={[
                        {
                          id: 'active',
                          title: 'Active',
                          value: usersQuery.data.totals.byStatus.active,
                        },
                        {
                          id: 'pending',
                          title: 'Pending verification',
                          value: usersQuery.data.totals.byStatus.pendingVerification,
                        },
                        {
                          id: 'suspended',
                          title: 'Suspended',
                          value: usersQuery.data.totals.byStatus.suspended,
                        },
                        {
                          id: 'deactivated',
                          title: 'Deactivated',
                          value: usersQuery.data.totals.byStatus.deactivated,
                        },
                      ]}
                    />
                  </section>

                  <section className="workspace-panel mt-6">
                    <p className="section-eyebrow">Recent activity</p>

                    <h2 className="section-title">Newest users</h2>

                    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {usersQuery.data.recentUsers.map((user) => (
                        <article
                          key={user.id}
                          className="rounded-2xl border border-white/70 bg-white/52 p-4"
                        >
                          <p className="font-black text-[var(--color-near-black)]">
                            {user.firstName} {user.lastName}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/54">
                            {user.email}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="status-chip" data-tone="blue">
                              {user.role}
                            </span>

                            <span
                              className="status-chip"
                              data-tone={
                                user.status === 'ACTIVE'
                                  ? 'success'
                                  : user.status === 'SUSPENDED'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {user.status.replaceAll('_', ' ')}
                            </span>
                          </div>

                          <p className="mt-4 text-xs font-semibold text-[var(--color-charcoal)]/46">
                            Joined {formatDate(user.createdAt)}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}

              {activeTab === 'vendors' && vendorsQuery.data ? (
                <>
                  <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: 'Matching vendors',
                        value: vendorsQuery.data.totals.vendors,
                      },
                      {
                        label: 'Approved',
                        value: vendorsQuery.data.totals.byVerificationStatus.approved,
                      },
                      {
                        label: 'Pending review',
                        value: vendorsQuery.data.totals.byVerificationStatus.pending,
                      },
                      {
                        label: 'Active accounts',
                        value: vendorsQuery.data.totals.byAccountStatus.active,
                      },
                    ].map((metric) => (
                      <MetricCard key={metric.label} metric={metric} />
                    ))}
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-2">
                    <GrowthBars title="Vendor registrations" points={vendorsQuery.data.growth} />

                    <RankedList
                      eyebrow="Marketplace supply"
                      title="Top service categories"
                      items={vendorsQuery.data.topCategories.map((entry, index) => ({
                        id: entry.category?.id ?? `category-${index}`,
                        title: entry.category?.name ?? 'Unknown category',
                        value: `${entry.vendorCount} vendors`,
                      }))}
                    />
                  </section>

                  <section className="workspace-panel mt-6">
                    <p className="section-eyebrow">Recent activity</p>

                    <h2 className="section-title">Newest vendors</h2>

                    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {vendorsQuery.data.recentVendors.map((vendor) => (
                        <article
                          key={vendor.id}
                          className="rounded-2xl border border-white/70 bg-white/52 p-4"
                        >
                          <p className="font-black text-[var(--color-near-black)]">
                            {vendor.businessName}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/54">
                            {vendor.baseLocation ?? 'Location not provided'}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span
                              className="status-chip"
                              data-tone={
                                vendor.verificationStatus === 'APPROVED'
                                  ? 'success'
                                  : vendor.verificationStatus === 'REJECTED'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {vendor.verificationStatus}
                            </span>

                            <span className="status-chip" data-tone="blue">
                              {vendor._count.bookings} bookings
                            </span>
                          </div>

                          <p className="mt-4 text-xs font-semibold text-[var(--color-charcoal)]/46">
                            Created {formatDate(vendor.createdAt)}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}

              {activeTab === 'events' && eventsQuery.data ? (
                <>
                  <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      metric={{
                        label: 'Matching events',
                        value: eventsQuery.data.totals.events,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Active events',
                        value: eventsQuery.data.totals.byStatus.active,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Planned budget',
                        value: formatCurrency(eventsQuery.data.planning.totalPlannedBudget),
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Average guests',
                        value: formatDecimal(eventsQuery.data.planning.averageGuestCount),
                        helper: `${eventsQuery.data.planning.totalGuestCount} total planned guests`,
                      }}
                    />
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-3">
                    <GrowthBars title="Event creation" points={eventsQuery.data.growth} />

                    <RankedList
                      eyebrow="Popular formats"
                      title="Top event types"
                      items={eventsQuery.data.topEventTypes.map((entry, index) => ({
                        id: `${entry.eventType}-${index}`,
                        title: entry.eventType,
                        value: entry.eventCount,
                      }))}
                    />

                    <RankedList
                      eyebrow="Geography"
                      title="Top locations"
                      items={eventsQuery.data.topLocations.map((entry, index) => ({
                        id: `${entry.location ?? 'unknown'}-${index}`,
                        title: entry.location ?? 'Location not provided',
                        value: entry.eventCount,
                      }))}
                    />
                  </section>

                  <RankedList
                    eyebrow="Customer activity"
                    title="Top event creators"
                    items={eventsQuery.data.topCustomers.map((entry, index) => ({
                      id: entry.customer?.id ?? `customer-${index}`,
                      title: entry.customer
                        ? `${entry.customer.firstName} ${entry.customer.lastName}`
                        : 'Unknown customer',
                      subtitle: `${entry.guestCount} planned guests`,
                      value: `${entry.eventCount} events`,
                    }))}
                  />
                </>
              ) : null}

              {activeTab === 'bookings' && bookingsQuery.data ? (
                <>
                  <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      metric={{
                        label: 'Matching bookings',
                        value: bookingsQuery.data.totals.bookings,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Completed',
                        value: bookingsQuery.data.totals.byStatus.completed,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Total agreed cost',
                        value: formatCurrency(bookingsQuery.data.financials.totalAgreedCost),
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Verified payments',
                        value: formatCurrency(bookingsQuery.data.financials.verifiedPaymentAmount),
                      }}
                    />
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-2">
                    <GrowthBars title="Booking creation" points={bookingsQuery.data.growth} />

                    <RankedList
                      eyebrow="Vendor performance"
                      title="Top booked vendors"
                      items={bookingsQuery.data.topVendors.map((entry, index) => ({
                        id: entry.vendor?.id ?? `vendor-${index}`,
                        title: entry.vendor?.businessName ?? 'Unknown vendor',
                        subtitle: formatCurrency(entry.agreedCost),
                        value: `${entry.bookingCount} bookings`,
                      }))}
                    />
                  </section>

                  <RankedList
                    eyebrow="Lifecycle"
                    title="Bookings by status"
                    items={Object.entries(bookingsQuery.data.totals.byStatus).map(
                      ([status, count]) => ({
                        id: status,
                        title: status
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (letter) => letter.toUpperCase()),
                        value: count,
                      }),
                    )}
                  />
                </>
              ) : null}

              {activeTab === 'payments' && paymentsQuery.data ? (
                <>
                  <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      metric={{
                        label: 'Matching payments',
                        value: paymentsQuery.data.totals.payments,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Verified',
                        value: paymentsQuery.data.totals.byStatus.verified,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Total amount',
                        value: formatCurrency(paymentsQuery.data.financials.totalAmount),
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Verified amount',
                        value: formatCurrency(paymentsQuery.data.financials.verifiedAmount),
                      }}
                    />
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-3">
                    <GrowthBars title="Payment submissions" points={paymentsQuery.data.growth} />

                    <RankedList
                      eyebrow="Vendor value"
                      title="Top vendors by verified payments"
                      items={paymentsQuery.data.topVendors.map((entry, index) => ({
                        id: entry.vendor?.id ?? `vendor-${index}`,
                        title: entry.vendor?.businessName ?? 'Unknown vendor',
                        subtitle: `${entry.paymentCount} payments`,
                        value: formatCurrency(entry.verifiedAmount),
                      }))}
                    />

                    <RankedList
                      eyebrow="Customer value"
                      title="Top paying customers"
                      items={paymentsQuery.data.topCustomers.map((entry, index) => ({
                        id: entry.customer?.id ?? `customer-${index}`,
                        title: entry.customer
                          ? `${entry.customer.firstName} ${entry.customer.lastName}`
                          : 'Unknown customer',
                        subtitle: `${entry.paymentCount} payments`,
                        value: formatCurrency(entry.totalAmount),
                      }))}
                    />
                  </section>
                </>
              ) : null}

              {activeTab === 'revenue' && revenueQuery.data ? (
                <>
                  <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      metric={{
                        label: 'Verified revenue',
                        value: formatCurrency(revenueQuery.data.revenue.totalVerifiedRevenue),
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Verified payments',
                        value: revenueQuery.data.totals.byStatus.verified,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Average payment',
                        value:
                          revenueQuery.data.revenue.averageVerifiedPayment === null
                            ? '—'
                            : formatCurrency(revenueQuery.data.revenue.averageVerifiedPayment),
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Pending amount',
                        value: formatCurrency(revenueQuery.data.revenue.pendingAmount),
                      }}
                    />
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-3">
                    <GrowthBars
                      title="Revenue growth"
                      points={revenueQuery.data.growth}
                      valueKey="revenue"
                      valueFormatter={(value) => formatCurrency(String(value))}
                    />

                    <RankedList
                      eyebrow="Payment methods"
                      title="Revenue by method"
                      items={revenueQuery.data.byMethod.map((entry, index) => ({
                        id: `${entry.method}-${index}`,
                        title: entry.method.replaceAll('_', ' '),
                        subtitle: `${entry.paymentCount} payments`,
                        value: formatCurrency(entry.revenue),
                      }))}
                    />

                    <RankedList
                      eyebrow="Marketplace value"
                      title="Top revenue vendors"
                      items={revenueQuery.data.topVendors.map((entry, index) => ({
                        id: entry.vendor?.id ?? `vendor-${index}`,
                        title: entry.vendor?.businessName ?? 'Unknown vendor',
                        subtitle: `${entry.paymentCount} verified payments`,
                        value: formatCurrency(entry.revenue),
                      }))}
                    />
                  </section>
                </>
              ) : null}

              {activeTab === 'complaints' && complaintsQuery.data ? (
                <>
                  <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      metric={{
                        label: 'Matching complaints',
                        value: complaintsQuery.data.totals.complaints,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Open',
                        value: complaintsQuery.data.totals.byStatus.open,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Resolved',
                        value: complaintsQuery.data.totals.byStatus.resolved,
                      }}
                    />

                    <MetricCard
                      metric={{
                        label: 'Unassigned',
                        value: complaintsQuery.data.totals.byAssignment.unassigned,
                      }}
                    />
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-3">
                    <GrowthBars
                      title="Complaint submissions"
                      points={complaintsQuery.data.growth}
                    />

                    <RankedList
                      eyebrow="Case categories"
                      title="Complaints by type"
                      items={complaintsQuery.data.byType.map((entry, index) => ({
                        id: `${entry.type}-${index}`,
                        title: entry.type.replaceAll('_', ' '),
                        value: entry.complaintCount,
                      }))}
                    />

                    <RankedList
                      eyebrow="Case severity"
                      title="Complaints by priority"
                      items={complaintsQuery.data.byPriority.map((entry, index) => ({
                        id: `${entry.priority}-${index}`,
                        title: entry.priority,
                        value: entry.complaintCount,
                      }))}
                    />
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-2">
                    <RankedList
                      eyebrow="Submission patterns"
                      title="Top complainants"
                      items={complaintsQuery.data.topComplainants.map((entry, index) => ({
                        id: entry.complainant?.id ?? `complainant-${index}`,
                        title: entry.complainant
                          ? `${entry.complainant.firstName} ${entry.complainant.lastName}`
                          : 'Unknown complainant',
                        subtitle: entry.complainant?.email,
                        value: entry.complaintCount,
                      }))}
                    />

                    <RankedList
                      eyebrow="Conduct patterns"
                      title="Top respondents"
                      items={complaintsQuery.data.topRespondents.map((entry, index) => ({
                        id: entry.respondent?.id ?? `respondent-${index}`,
                        title: entry.respondent
                          ? `${entry.respondent.firstName} ${entry.respondent.lastName}`
                          : 'No respondent',
                        subtitle: entry.respondent?.email,
                        value: entry.complaintCount,
                      }))}
                    />
                  </section>
                </>
              ) : null}

              <section className="workspace-panel mt-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="section-eyebrow">Report metadata</p>

                    <h2 className="section-title">Generation details</h2>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={activeQuery.isFetching}
                    onClick={() => activeQuery.refetch()}
                  >
                    {activeQuery.isFetching ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Refresh report
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/70 bg-white/52 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Generated
                    </p>

                    <p className="mt-2 text-sm font-bold text-[var(--color-near-black)]">
                      {activeQuery.data &&
                      typeof activeQuery.data === 'object' &&
                      'generatedAt' in activeQuery.data
                        ? formatDateTime(String(activeQuery.data.generatedAt))
                        : '—'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/52 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Grouped by
                    </p>

                    <p className="mt-2 text-sm font-bold capitalize text-[var(--color-near-black)]">
                      {groupBy}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/52 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Date range
                    </p>

                    <p className="mt-2 text-sm font-bold text-[var(--color-near-black)]">
                      {from || to
                        ? `${from || 'Beginning'} – ${to || 'Today'}`
                        : 'All available history'}
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
