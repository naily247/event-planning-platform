import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import axios from 'axios';
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Download,
  LoaderCircle,
  MessageSquareWarning,
  RefreshCw,
  Store,
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
import {
  downloadAdminReportPdf,
  type AdminReportPdfConfig,
} from '../features/admin/reports/adminReportPdf';

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

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatEnumLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function MetricCard({ metric }: { metric: ReportMetric }) {
  return (
    <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/76 p-4 shadow-[0_14px_38px_rgba(64,42,51,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(91,61,82,0.15)] hover:shadow-[0_18px_42px_rgba(64,42,51,0.08)]">
      <p className="text-xs font-bold text-[var(--color-charcoal)]/54">{metric.label}</p>

      <p className="mt-2 text-[1.7rem] font-black tracking-[-0.045em] text-[var(--color-near-black)]">
        {metric.value}
      </p>

      {metric.helper ? (
        <p className="mt-1.5 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
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
  valueFormatter = (value) => String(value),
}: {
  title: string;
  points: Array<Record<string, string | number>>;
  valueKey?: string;
  valueFormatter?: (value: number) => string;
}) {
  const normalizedPoints = points.map((point) => ({
    ...point,
    label: String(point.period),
    [valueKey]: Number(point[valueKey] ?? 0),
  }));

  const values = normalizedPoints.map((point) => Number(point[valueKey] ?? 0));

  const total = values.reduce((sum, value) => sum + value, 0);
  const latestValue = values.at(-1) ?? 0;
  const previousValue = values.at(-2);

  const difference = previousValue === undefined ? null : latestValue - previousValue;

  const differenceLabel =
    difference === null
      ? null
      : difference === 0
        ? 'No change'
        : `${difference > 0 ? '+' : ''}${valueFormatter(difference)}`;

  const trendId = `reportTrendFill-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <article className="rounded-[1.5rem] border border-[rgba(91,61,82,0.09)] bg-white/76 p-4 shadow-[0_14px_38px_rgba(64,42,51,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
            Trend
          </p>

          <h3 className="mt-1.5 text-[1.65rem] font-black tracking-[-0.04em] text-[var(--color-near-black)]">
            {title}
          </h3>
        </div>

        <span className="shrink-0 rounded-full border border-[rgba(91,61,82,0.10)] bg-[rgba(183,167,200,0.12)] px-3 py-1.5 text-[0.66rem] font-black text-[var(--color-deep-plum)]">
          {points.length} {points.length === 1 ? 'period' : 'periods'}
        </span>
      </div>

      {normalizedPoints.length === 0 ? (
        <div className="mt-4 flex min-h-44 items-center justify-center rounded-[1.15rem] border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(91,61,82,0.018)] px-4 text-center">
          <div>
            <p className="text-sm font-black text-[var(--color-near-black)]">No trend data</p>

            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
              No activity was recorded for the selected reporting range.
            </p>
          </div>
        </div>
      ) : normalizedPoints.length === 1 ? (
        <div className="mt-4">
          <div className="rounded-[1.15rem] border border-[rgba(91,61,82,0.08)] bg-[linear-gradient(135deg,rgba(183,167,200,0.11),rgba(255,255,255,0.82))] px-5 py-5">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/44">
              Recorded for this period
            </p>

            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[2.35rem] font-black leading-none tracking-[-0.055em] text-[var(--color-near-black)]">
                  {valueFormatter(latestValue)}
                </p>

                <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                  {String(normalizedPoints[0].label)}
                </p>
              </div>

              <div className="grid size-12 place-items-center rounded-2xl border border-[rgba(91,61,82,0.10)] bg-white/76 text-[var(--color-deep-plum)] shadow-sm">
                <BarChart3 className="size-5" />
              </div>
            </div>

            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[rgba(91,61,82,0.07)]">
              <div className="h-full w-full rounded-full bg-[var(--color-deep-plum)]" />
            </div>
          </div>

          <p className="mt-3 text-[0.68rem] font-semibold leading-5 text-[var(--color-charcoal)]/48">
            Only one reporting period is available, so a trend comparison would not yet be
            meaningful.
          </p>
        </div>
      ) : normalizedPoints.length === 2 ? (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {normalizedPoints.map((point, index) => (
              <div
                key={`${String(point.label)}-${index}`}
                className="rounded-[1.05rem] border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.018)] px-4 py-4"
              >
                <p className="truncate text-[0.66rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/44">
                  {String(point.label)}
                </p>

                <p className="mt-2 text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  {valueFormatter(Number(point[valueKey] ?? 0))}
                </p>
              </div>
            ))}

            <div className="rounded-[1.05rem] border border-[rgba(91,61,82,0.10)] bg-[rgba(183,167,200,0.12)] px-4 py-4">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/44">
                Change
              </p>

              <p className="mt-2 text-xl font-black tracking-[-0.04em] text-[var(--color-deep-plum)]">
                {differenceLabel}
              </p>
            </div>
          </div>

          <div className="mt-4 h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={normalizedPoints}
                margin={{
                  top: 8,
                  right: 6,
                  left: -16,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(91,61,82,0.09)"
                  strokeDasharray="4 6"
                />

                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: 'rgba(54,46,51,0.50)',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                  dy={6}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={valueKey !== 'count'}
                  tick={{
                    fill: 'rgba(54,46,51,0.46)',
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                />

                <Tooltip
                  cursor={{
                    fill: 'rgba(183,167,200,0.07)',
                  }}
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid rgba(91,61,82,0.10)',
                    background: 'rgba(255,255,255,0.97)',
                    boxShadow: '0 12px 32px rgba(64,42,51,0.10)',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [valueFormatter(Number(value)), title]}
                />

                <Bar dataKey={valueKey} radius={[8, 8, 3, 3]} maxBarSize={72}>
                  {normalizedPoints.map((point, index) => (
                    <Cell
                      key={`${String(point.label)}-${index}`}
                      fill={
                        index === normalizedPoints.length - 1
                          ? 'rgb(91,61,82)'
                          : 'rgba(183,167,200,0.72)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.018)] px-3.5 py-2.5">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/42">
                Total
              </p>

              <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                {valueFormatter(total)}
              </p>
            </div>

            <div className="rounded-xl border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.018)] px-3.5 py-2.5">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/42">
                Latest period
              </p>

              <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                {valueFormatter(latestValue)}
              </p>
            </div>

            <div className="rounded-xl border border-[rgba(91,61,82,0.08)] bg-[rgba(183,167,200,0.10)] px-3.5 py-2.5">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/42">
                Latest change
              </p>

              <p className="mt-1 text-sm font-black text-[var(--color-deep-plum)]">
                {differenceLabel}
              </p>
            </div>
          </div>

          <div className="mt-3 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={normalizedPoints}
                margin={{
                  top: 10,
                  right: 8,
                  left: -16,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id={trendId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(91,61,82)" stopOpacity={0.18} />

                    <stop offset="100%" stopColor="rgb(91,61,82)" stopOpacity={0.015} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  vertical={false}
                  stroke="rgba(91,61,82,0.10)"
                  strokeDasharray="4 6"
                />

                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: 'rgba(54,46,51,0.50)',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                  dy={8}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={valueKey !== 'count'}
                  tick={{
                    fill: 'rgba(54,46,51,0.50)',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />

                <Tooltip
                  cursor={{
                    stroke: 'rgba(91,61,82,0.12)',
                    strokeWidth: 1,
                  }}
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid rgba(91,61,82,0.10)',
                    background: 'rgba(255,255,255,0.97)',
                    boxShadow: '0 12px 32px rgba(64,42,51,0.10)',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [valueFormatter(Number(value)), title]}
                />

                <Area
                  type="monotone"
                  dataKey={valueKey}
                  stroke="rgb(91,61,82)"
                  strokeWidth={2.5}
                  fill={`url(#${trendId})`}
                  activeDot={{
                    r: 5,
                    fill: 'white',
                    stroke: 'rgb(91,61,82)',
                    strokeWidth: 2.5,
                  }}
                  dot={{
                    r: 3.5,
                    fill: 'white',
                    stroke: 'rgb(91,61,82)',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </article>
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
    <article className="rounded-[1.5rem] border border-[rgba(91,61,82,0.09)] bg-white/76 p-4 shadow-[0_14px_38px_rgba(64,42,51,0.06)] sm:p-5">
      <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
        {eyebrow}
      </p>

      <h3 className="mt-1.5 text-[1.65rem] font-black tracking-[-0.04em] text-[var(--color-near-black)]">
        {title}
      </h3>

      {items.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-[1.05rem] border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.018)] px-3.5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-xs font-black text-[var(--color-deep-plum)]">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                    {item.title}
                  </p>

                  {item.subtitle ? (
                    <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-[var(--color-charcoal)]/46">
                      {item.subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              <p className="shrink-0 text-sm font-black text-[var(--color-near-black)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex min-h-28 items-center justify-center rounded-[1.05rem] border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(91,61,82,0.018)] px-4 text-center">
          <p className="text-xs font-semibold text-[var(--color-charcoal)]/52">
            No data is available for the selected range.
          </p>
        </div>
      )}
    </article>
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

  function getGeneratedAt(data: object) {
    return 'generatedAt' in data ? String(data.generatedAt) : undefined;
  }

  function toTrendPoints(points: Array<Record<string, string | number>>, valueKey = 'count') {
    return points.map((point) => ({
      label: String(point.period),
      value: Number(point[valueKey] ?? 0),
    }));
  }

  async function downloadActiveReport() {
    let config: AdminReportPdfConfig | null = null;

    if (activeTab === 'users' && usersQuery.data) {
      const data = usersQuery.data;

      config = {
        kind: 'users',
        reportTitle: 'User Activity Report',
        reportDescription:
          'Account registrations, user roles, account health, and recent platform users.',
        generatedAt: getGeneratedAt(data),
        from,
        to,
        groupBy,
        metrics: [
          {
            label: 'Matching users',
            value: data.totals.users,
          },
          {
            label: 'Customers',
            value: data.totals.byRole.customers,
          },
          {
            label: 'Vendors',
            value: data.totals.byRole.vendors,
          },
          {
            label: 'Active accounts',
            value: data.totals.byStatus.active,
          },
        ],
        trend: {
          title: 'User registrations',
          valueLabel: 'Registrations',
          points: toTrendPoints(data.growth),
        },
        rankedSections: [
          {
            eyebrow: 'Account health',
            title: 'Users by status',
            items: [
              {
                label: 'Active',
                value: data.totals.byStatus.active,
              },
              {
                label: 'Pending verification',
                value: data.totals.byStatus.pendingVerification,
              },
              {
                label: 'Suspended',
                value: data.totals.byStatus.suspended,
              },
              {
                label: 'Deactivated',
                value: data.totals.byStatus.deactivated,
              },
            ],
          },
        ],
        tables: [
          {
            title: 'Newest users',
            columns: ['Name', 'Email', 'Role', 'Status', 'Joined'],
            rows: data.recentUsers.map((user) => [
              `${user.firstName} ${user.lastName}`,
              user.email,
              user.role,
              user.status.replaceAll('_', ' '),
              formatDate(user.createdAt),
            ]),
          },
        ],
      };
    }

    if (activeTab === 'vendors' && vendorsQuery.data) {
      const data = vendorsQuery.data;

      config = {
        kind: 'vendors',
        reportTitle: 'Vendor Marketplace Report',
        reportDescription:
          'Vendor registrations, verification health, marketplace supply, and recent vendor activity.',
        generatedAt: getGeneratedAt(data),
        from,
        to,
        groupBy,
        metrics: [
          {
            label: 'Matching vendors',
            value: data.totals.vendors,
          },
          {
            label: 'Approved',
            value: data.totals.byVerificationStatus.approved,
          },
          {
            label: 'Pending review',
            value: data.totals.byVerificationStatus.pending,
          },
          {
            label: 'Active accounts',
            value: data.totals.byAccountStatus.active,
          },
        ],
        trend: {
          title: 'Vendor registrations',
          valueLabel: 'Registrations',
          points: toTrendPoints(data.growth),
        },
        rankedSections: [
          {
            eyebrow: 'Marketplace supply',
            title: 'Top service categories',
            items: data.topCategories.map((entry) => ({
              label: entry.category?.name ?? 'Unknown category',
              value: formatCountLabel(entry.vendorCount, 'vendor'),
            })),
          },
        ],
        tables: [
          {
            title: 'Newest vendors',
            columns: ['Business', 'Location', 'Verification', 'Bookings', 'Created'],
            rows: data.recentVendors.map((vendor) => [
              vendor.businessName,
              vendor.baseLocation ?? 'Location not provided',
              vendor.verificationStatus,
              vendor._count.bookings,
              formatDate(vendor.createdAt),
            ]),
          },
        ],
      };
    }

    if (activeTab === 'events' && eventsQuery.data) {
      const data = eventsQuery.data;

      config = {
        kind: 'events',
        reportTitle: 'Event Planning Report',
        reportDescription:
          'Event creation, active planning activity, planned budgets, guests, formats, and locations.',
        generatedAt: getGeneratedAt(data),
        from,
        to,
        groupBy,
        metrics: [
          {
            label: 'Matching events',
            value: data.totals.events,
          },
          {
            label: 'Active events',
            value: data.totals.byStatus.active,
          },
          {
            label: 'Planned budget',
            value: formatCurrency(data.planning.totalPlannedBudget),
          },
          {
            label: 'Average guests',
            value: formatDecimal(data.planning.averageGuestCount),
            helper: `${data.planning.totalGuestCount} total planned guests`,
          },
        ],
        trend: {
          title: 'Event creation',
          valueLabel: 'Events',
          points: toTrendPoints(data.growth),
        },
        rankedSections: [
          {
            eyebrow: 'Popular formats',
            title: 'Top event types',
            items: data.topEventTypes.map((entry) => ({
              label: formatEnumLabel(entry.eventType),
              value: entry.eventCount,
            })),
          },
          {
            eyebrow: 'Geography',
            title: 'Top locations',
            items: data.topLocations.map((entry) => ({
              label: entry.location ?? 'Location not provided',
              value: entry.eventCount,
            })),
          },
          {
            eyebrow: 'Customer activity',
            title: 'Top event creators',
            items: data.topCustomers.map((entry) => ({
              label: entry.customer
                ? `${entry.customer.firstName} ${entry.customer.lastName}`
                : 'Unknown customer',
              secondary: formatCountLabel(entry.guestCount, 'planned guest'),
              value: formatCountLabel(entry.eventCount, 'event'),
            })),
          },
        ],
      };
    }

    if (activeTab === 'bookings' && bookingsQuery.data) {
      const data = bookingsQuery.data;

      config = {
        kind: 'bookings',
        reportTitle: 'Booking Performance Report',
        reportDescription:
          'Booking creation, lifecycle health, agreed service value, verified payments, and vendor performance.',
        generatedAt: getGeneratedAt(data),
        from,
        to,
        groupBy,
        metrics: [
          {
            label: 'Matching bookings',
            value: data.totals.bookings,
          },
          {
            label: 'Completed',
            value: data.totals.byStatus.completed,
          },
          {
            label: 'Total agreed cost',
            value: formatCurrency(data.financials.totalAgreedCost),
          },
          {
            label: 'Verified payments',
            value: formatCurrency(data.financials.verifiedPaymentAmount),
          },
        ],
        trend: {
          title: 'Booking creation',
          valueLabel: 'Bookings',
          points: toTrendPoints(data.growth),
        },
        rankedSections: [
          {
            eyebrow: 'Vendor performance',
            title: 'Top booked vendors',
            items: data.topVendors.map((entry) => ({
              label: entry.vendor?.businessName ?? 'Unknown vendor',
              secondary: formatCurrency(entry.agreedCost),
              value: formatCountLabel(entry.bookingCount, 'booking'),
            })),
          },
          {
            eyebrow: 'Lifecycle',
            title: 'Bookings by status',
            items: Object.entries(data.totals.byStatus).map(([status, count]) => ({
              label: status
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (letter) => letter.toUpperCase()),
              value: count,
            })),
          },
        ],
      };
    }

    if (activeTab === 'payments' && paymentsQuery.data) {
      const data = paymentsQuery.data;

      config = {
        kind: 'payments',
        reportTitle: 'Payment Activity Report',
        reportDescription:
          'Payment submissions, verification health, payment value, vendor receipts, and customer payment activity.',
        generatedAt: getGeneratedAt(data),
        from,
        to,
        groupBy,
        metrics: [
          {
            label: 'Matching payments',
            value: data.totals.payments,
          },
          {
            label: 'Verified',
            value: data.totals.byStatus.verified,
          },
          {
            label: 'Total amount',
            value: formatCurrency(data.financials.totalAmount),
          },
          {
            label: 'Verified amount',
            value: formatCurrency(data.financials.verifiedAmount),
          },
        ],
        trend: {
          title: 'Payment submissions',
          valueLabel: 'Payments',
          points: toTrendPoints(data.growth),
        },
        rankedSections: [
          {
            eyebrow: 'Vendor value',
            title: 'Top vendors by verified payments',
            items: data.topVendors.map((entry) => ({
              label: entry.vendor?.businessName ?? 'Unknown vendor',
              secondary: formatCountLabel(entry.paymentCount, 'payment'),
              value: formatCurrency(entry.verifiedAmount),
            })),
          },
          {
            eyebrow: 'Customer value',
            title: 'Top paying customers',
            items: data.topCustomers.map((entry) => ({
              label: entry.customer
                ? `${entry.customer.firstName} ${entry.customer.lastName}`
                : 'Unknown customer',
              secondary: formatCountLabel(entry.paymentCount, 'payment'),
              value: formatCurrency(entry.totalAmount),
            })),
          },
        ],
      };
    }

    if (activeTab === 'revenue' && revenueQuery.data) {
      const data = revenueQuery.data;

      config = {
        kind: 'revenue',
        reportTitle: 'Revenue Performance Report',
        reportDescription:
          'Verified platform revenue, payment performance, payment methods, and marketplace revenue contribution.',
        generatedAt: getGeneratedAt(data),
        from,
        to,
        groupBy,
        metrics: [
          {
            label: 'Verified revenue',
            value: formatCurrency(data.revenue.totalVerifiedRevenue),
          },
          {
            label: 'Verified payments',
            value: data.totals.byStatus.verified,
          },
          {
            label: 'Average payment',
            value:
              data.revenue.averageVerifiedPayment === null
                ? '—'
                : formatCurrency(data.revenue.averageVerifiedPayment),
          },
          {
            label: 'Pending amount',
            value: formatCurrency(data.revenue.pendingAmount),
          },
        ],
        trend: {
          title: 'Revenue growth',
          valueLabel: 'Verified revenue',
          points: toTrendPoints(data.growth, 'revenue'),
          valueFormatter: (value) => formatCurrency(String(value)),
        },
        rankedSections: [
          {
            eyebrow: 'Payment methods',
            title: 'Revenue by method',
            items: data.byMethod.map((entry) => ({
              label: entry.method.replaceAll('_', ' '),
              secondary: `${entry.paymentCount} payments`,
              value: formatCurrency(entry.revenue),
            })),
          },
          {
            eyebrow: 'Marketplace value',
            title: 'Top revenue vendors',
            items: data.topVendors.map((entry) => ({
              label: entry.vendor?.businessName ?? 'Unknown vendor',
              secondary: formatCountLabel(entry.paymentCount, 'verified payment'),
              value: formatCurrency(entry.revenue),
            })),
          },
        ],
      };
    }

    if (activeTab === 'complaints' && complaintsQuery.data) {
      const data = complaintsQuery.data;

      config = {
        kind: 'complaints',
        reportTitle: 'Complaint Management Report',
        reportDescription:
          'Complaint submissions, resolution health, assignment status, case categories, severity, and conduct patterns.',
        generatedAt: getGeneratedAt(data),
        from,
        to,
        groupBy,
        metrics: [
          {
            label: 'Matching complaints',
            value: data.totals.complaints,
          },
          {
            label: 'Open',
            value: data.totals.byStatus.open,
          },
          {
            label: 'Resolved',
            value: data.totals.byStatus.resolved,
          },
          {
            label: 'Unassigned',
            value: data.totals.byAssignment.unassigned,
          },
        ],
        trend: {
          title: 'Complaint submissions',
          valueLabel: 'Complaints',
          points: toTrendPoints(data.growth),
        },
        rankedSections: [
          {
            eyebrow: 'Case categories',
            title: 'Complaints by type',
            items: data.byType.map((entry) => ({
              label: entry.type.replaceAll('_', ' '),
              value: entry.complaintCount,
            })),
          },
          {
            eyebrow: 'Case severity',
            title: 'Complaints by priority',
            items: data.byPriority.map((entry) => ({
              label: entry.priority,
              value: entry.complaintCount,
            })),
          },
          {
            eyebrow: 'Submission patterns',
            title: 'Top complainants',
            items: data.topComplainants.map((entry) => ({
              label: entry.complainant
                ? `${entry.complainant.firstName} ${entry.complainant.lastName}`
                : 'Unknown complainant',
              secondary: entry.complainant?.email,
              value: entry.complaintCount,
            })),
          },
          {
            eyebrow: 'Conduct patterns',
            title: 'Top respondents',
            items: data.topRespondents.map((entry) => ({
              label: entry.respondent
                ? `${entry.respondent.firstName} ${entry.respondent.lastName}`
                : 'No respondent',
              secondary: entry.respondent?.email,
              value: entry.complaintCount,
            })),
          },
        ],
      };
    }

    if (!config) {
      return;
    }

    await downloadAdminReportPdf(config);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(183,167,200,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(140,92,111,0.07),transparent_28%),linear-gradient(180deg,#fbf9fa_0%,#f7f3f6_48%,#f8f6f9_100%)]">
      <div className="workspace-container">
        <AdminWorkspaceNav />

        <main className="py-4">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(246,241,247,0.92),rgba(239,233,244,0.78))] px-6 py-5 shadow-[0_18px_50px_rgba(64,42,51,0.07)] sm:px-7 sm:py-6">
            <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border border-[rgba(91,61,82,0.06)]" />
            <div className="pointer-events-none absolute -right-5 -top-14 size-44 rounded-full border border-[rgba(91,61,82,0.05)]" />

            <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(91,61,82,0.10)] bg-white/72 px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)] shadow-sm">
                  <BarChart3 className="size-3.5" />
                  Platform intelligence
                </div>

                <h1 className="mt-3 max-w-3xl text-balance text-[2.25rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.7rem]">
                  Understand how Eventure is growing and performing.
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-charcoal)]/62">
                  Explore account growth, marketplace activity, event planning, financial
                  performance, booking health, and complaint trends from one reporting workspace.
                </p>
              </div>

              <div className="w-full shrink-0 rounded-2xl border border-[rgba(91,61,82,0.09)] bg-white/72 px-4 py-3 shadow-[0_10px_28px_rgba(64,42,51,0.06)] backdrop-blur sm:w-auto sm:min-w-[190px]">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                  Active report
                </p>

                <p className="mt-1 text-lg font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {reportTabs.find((tab) => tab.id === activeTab)?.label}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-[1.75rem] border border-[rgba(91,61,82,0.09)] bg-white/82 p-4 shadow-[0_18px_48px_rgba(64,42,51,0.06)] backdrop-blur sm:p-5">
            <div>
              <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                Report navigation
              </p>

              <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                Choose a report
              </h2>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={
                      isActive
                        ? 'rounded-[1.15rem] border border-[rgba(91,61,82,0.18)] bg-[rgba(183,167,200,0.16)] p-3.5 text-left shadow-[0_10px_26px_rgba(64,42,51,0.07)]'
                        : 'rounded-[1.15rem] border border-[rgba(91,61,82,0.08)] bg-white/64 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[rgba(91,61,82,0.14)] hover:bg-[rgba(183,167,200,0.07)]'
                    }
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <div
                      className={
                        isActive
                          ? 'grid size-8 place-items-center rounded-xl bg-white/72 text-[var(--color-deep-plum)]'
                          : 'grid size-8 place-items-center rounded-xl bg-[rgba(91,61,82,0.045)] text-[var(--color-charcoal)]/52'
                      }
                    >
                      <Icon className="size-4" />
                    </div>

                    <p className="mt-2.5 text-sm font-black text-[var(--color-near-black)]">
                      {tab.label}
                    </p>

                    <p className="mt-1 line-clamp-2 text-[0.68rem] font-semibold leading-[1.15rem] text-[var(--color-charcoal)]/48">
                      {tab.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-4 rounded-[1.75rem] border border-[rgba(91,61,82,0.09)] bg-white/82 p-4 shadow-[0_18px_48px_rgba(64,42,51,0.06)] backdrop-blur sm:p-5">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  Report controls
                </p>

                <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Date range and grouping
                </h2>

                <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/54">
                  Filter the active report, control trend grouping, and export the exact report
                  currently being viewed.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary min-h-9 shrink-0 px-3.5 text-xs"
                  onClick={resetFilters}
                >
                  <RefreshCw className="size-3.5" />
                  Reset filters
                </button>

                <button
                  type="button"
                  className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-[rgba(91,61,82,0.16)] bg-[var(--color-deep-plum)] px-4 text-xs font-black text-white shadow-[0_10px_24px_rgba(91,61,82,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(91,61,82,0.20)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  disabled={
                    activeQuery.isLoading ||
                    activeQuery.isFetching ||
                    activeQuery.isError ||
                    !activeQuery.data
                  }
                  onClick={downloadActiveReport}
                >
                  {activeQuery.isFetching ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Download PDF
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <label>
                <span className="mb-1.5 block text-[0.68rem] font-black text-[var(--color-charcoal)]/62">
                  From
                </span>

                <input
                  type="date"
                  className="form-field !h-10 !min-h-0 !rounded-xl !py-2 !text-sm"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[0.68rem] font-black text-[var(--color-charcoal)]/62">
                  To
                </span>

                <input
                  type="date"
                  className="form-field !h-10 !min-h-0 !rounded-xl !py-2 !text-sm"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[0.68rem] font-black text-[var(--color-charcoal)]/62">
                  Group growth by
                </span>

                <select
                  className="form-field !h-10 !min-h-0 !rounded-xl !py-2 !text-sm"
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value as AdminReportGroupBy)}
                >
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-[0.68rem] font-black text-[var(--color-charcoal)]/62">
                  Recent records
                </span>

                <select
                  className="form-field !h-10 !min-h-0 !rounded-xl !py-2 !text-sm"
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
            <section className="mt-5 flex min-h-52 items-center justify-center rounded-[1.75rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-6 py-8 shadow-[0_18px_48px_rgba(64,42,51,0.06)] backdrop-blur">
              <div className="text-center">
                <div className="mx-auto grid size-11 place-items-center rounded-2xl border border-[rgba(91,61,82,0.10)] bg-[rgba(183,167,200,0.12)]">
                  <LoaderCircle className="size-5 animate-spin text-[var(--color-deep-plum)]" />
                </div>

                <p className="mt-4 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                  Generating report
                </p>

                <p className="mt-1.5 text-xs leading-5 text-[var(--color-charcoal)]/54">
                  Calculating totals, trends, rankings, and recent activity.
                </p>
              </div>
            </section>
          ) : activeQuery.isError ? (
            <section className="mt-5 flex min-h-56 items-center justify-center rounded-[1.75rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-6 py-8 shadow-[0_18px_48px_rgba(64,42,51,0.06)] backdrop-blur">
              <div className="max-w-md text-center">
                <div className="mx-auto grid size-11 place-items-center rounded-2xl border border-red-200/60 bg-red-50/70 text-red-600">
                  <AlertCircle className="size-5" />
                </div>

                <h2 className="mt-4 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                  Report could not be generated
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                  {getErrorMessage(activeQuery.error)}
                </p>

                <button
                  type="button"
                  className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[rgba(91,61,82,0.16)] bg-[var(--color-deep-plum)] px-4 text-xs font-black text-white shadow-[0_10px_24px_rgba(91,61,82,0.16)] transition hover:-translate-y-0.5"
                  onClick={() => activeQuery.refetch()}
                >
                  <RefreshCw className="size-3.5" />
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

                  <section className="mt-5 rounded-[1.5rem] border border-[rgba(91,61,82,0.09)] bg-white/78 p-4 shadow-[0_14px_38px_rgba(64,42,51,0.06)] backdrop-blur sm:p-5">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                      <div>
                        <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Recent activity
                        </p>

                        <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          Newest users
                        </h2>
                      </div>

                      <p className="text-[0.68rem] font-bold text-[var(--color-charcoal)]/42">
                        {usersQuery.data.recentUsers.length}{' '}
                        {usersQuery.data.recentUsers.length === 1 ? 'record' : 'records'}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                      {usersQuery.data.recentUsers.map((user) => (
                        <article
                          key={user.id}
                          className="rounded-[1.05rem] border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.018)] px-3.5 py-3.5 transition duration-200 hover:border-[rgba(91,61,82,0.14)] hover:bg-[rgba(183,167,200,0.055)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                                {user.firstName} {user.lastName}
                              </p>

                              <p className="mt-0.5 truncate text-[0.7rem] font-semibold text-[var(--color-charcoal)]/48">
                                {user.email}
                              </p>
                            </div>

                            <span
                              className="status-chip shrink-0"
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

                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(91,61,82,0.07)] pt-2.5">
                            <span className="rounded-full border border-[rgba(91,61,82,0.09)] bg-white/68 px-2.5 py-1 text-[0.62rem] font-black text-[var(--color-deep-plum)]">
                              {user.role}
                            </span>

                            <p className="text-[0.64rem] font-semibold text-[var(--color-charcoal)]/42">
                              Joined {formatDate(user.createdAt)}
                            </p>
                          </div>
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
                        value: formatCountLabel(entry.vendorCount, 'vendor'),
                      }))}
                    />
                  </section>

                  <section className="mt-5 rounded-[1.5rem] border border-[rgba(91,61,82,0.09)] bg-white/78 p-4 shadow-[0_14px_38px_rgba(64,42,51,0.06)] backdrop-blur sm:p-5">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                      <div>
                        <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Recent activity
                        </p>

                        <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          Newest vendors
                        </h2>
                      </div>

                      <p className="text-[0.68rem] font-bold text-[var(--color-charcoal)]/42">
                        {vendorsQuery.data.recentVendors.length}{' '}
                        {vendorsQuery.data.recentVendors.length === 1 ? 'record' : 'records'}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                      {vendorsQuery.data.recentVendors.map((vendor) => (
                        <article
                          key={vendor.id}
                          className="rounded-[1.05rem] border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.018)] px-3.5 py-3.5 transition duration-200 hover:border-[rgba(91,61,82,0.14)] hover:bg-[rgba(183,167,200,0.055)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                                {vendor.businessName}
                              </p>

                              <p className="mt-0.5 truncate text-[0.7rem] font-semibold text-[var(--color-charcoal)]/48">
                                {vendor.baseLocation ?? 'Location not provided'}
                              </p>
                            </div>

                            <span
                              className="status-chip shrink-0"
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
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(91,61,82,0.07)] pt-2.5">
                            <span className="rounded-full border border-[rgba(91,61,82,0.09)] bg-white/68 px-2.5 py-1 text-[0.62rem] font-black text-[var(--color-deep-plum)]">
                              {formatCountLabel(vendor._count.bookings, 'booking')}
                            </span>

                            <p className="text-[0.64rem] font-semibold text-[var(--color-charcoal)]/42">
                              Created {formatDate(vendor.createdAt)}
                            </p>
                          </div>
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
                        title: formatEnumLabel(entry.eventType),
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
                      subtitle: formatCountLabel(entry.guestCount, 'planned guest'),
                      value: formatCountLabel(entry.eventCount, 'event'),
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
                        value: formatCountLabel(entry.bookingCount, 'booking'),
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
                        subtitle: formatCountLabel(entry.paymentCount, 'payment'),
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
                        subtitle: formatCountLabel(entry.paymentCount, 'payment'),
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
                        subtitle: formatCountLabel(entry.paymentCount, 'verified payment'),
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

              <section className="mt-5 rounded-[1.5rem] border border-[rgba(91,61,82,0.09)] bg-white/78 p-4 shadow-[0_14px_38px_rgba(64,42,51,0.06)] backdrop-blur sm:p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Report metadata
                    </p>

                    <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      Generation details
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/50">
                      Context used to generate the report currently displayed above.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary min-h-9 shrink-0 px-3.5 text-xs"
                    disabled={activeQuery.isFetching}
                    onClick={() => activeQuery.refetch()}
                  >
                    {activeQuery.isFetching ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    Refresh report
                  </button>
                </div>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-[1.05rem] border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.018)] px-3.5 py-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Generated
                    </p>

                    <p className="mt-1.5 text-sm font-black text-[var(--color-near-black)]">
                      {activeQuery.data &&
                      typeof activeQuery.data === 'object' &&
                      'generatedAt' in activeQuery.data
                        ? formatDateTime(String(activeQuery.data.generatedAt))
                        : '—'}
                    </p>
                  </div>

                  <div className="rounded-[1.05rem] border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.018)] px-3.5 py-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Grouped by
                    </p>

                    <p className="mt-1.5 text-sm font-black capitalize text-[var(--color-near-black)]">
                      {groupBy}
                    </p>
                  </div>

                  <div className="rounded-[1.05rem] border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.018)] px-3.5 py-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Date range
                    </p>

                    <p className="mt-1.5 text-sm font-black text-[var(--color-near-black)]">
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
