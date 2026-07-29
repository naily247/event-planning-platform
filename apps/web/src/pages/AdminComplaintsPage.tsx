import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  BadgeAlert,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  History,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserMinus,
  X,
} from 'lucide-react';
import {
  adminComplaintPriorityOptions,
  adminComplaintSortOptions,
  adminComplaintStatusOptions,
  getAdminComplaintById,
  getAdminComplaints,
  reopenAdminComplaint,
  updateAdminComplaintAssignment,
  updateAdminComplaintPriority,
  updateAdminComplaintStatus,
  type AdminComplaint,
  type AdminComplaintPriority,
  type AdminComplaintSort,
  type AdminComplaintStatus,
  type AdminComplaintType,
} from '../features/admin/admin.api';
import { AdminWorkspaceNav } from '../features/admin/components/AdminWorkspaceNav';
import { getCurrentUser } from '../features/auth/auth.api';

const PAGE_LIMIT = 20;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

type ComplaintActionMode = 'STATUS' | 'PRIORITY' | 'ASSIGN' | 'UNASSIGN' | 'REOPEN' | null;

const complaintTypes: AdminComplaintType[] = [
  'BOOKING',
  'PAYMENT',
  'REVIEW',
  'QUOTATION',
  'USER_CONDUCT',
  'PLATFORM',
  'OTHER',
];

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

const complaintSortLabels: Record<AdminComplaintSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  priority_highest: 'Highest priority',
  priority_lowest: 'Lowest priority',
};

const mutableComplaintStatuses: Array<
  Extract<
    AdminComplaintStatus,
    | 'UNDER_REVIEW'
    | 'UNDER_INVESTIGATION'
    | 'AWAITING_CUSTOMER_RESPONSE'
    | 'AWAITING_VENDOR_RESPONSE'
    | 'RESOLVED'
    | 'DISMISSED'
  >
> = [
  'UNDER_REVIEW',
  'UNDER_INVESTIGATION',
  'AWAITING_CUSTOMER_RESPONSE',
  'AWAITING_VENDOR_RESPONSE',
  'RESOLVED',
  'DISMISSED',
];

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getStatusTone(status: AdminComplaintStatus) {
  switch (status) {
    case 'RESOLVED':
    case 'CLOSED':
      return 'success';

    case 'DISMISSED':
      return 'danger';

    case 'OPEN':
    case 'UNDER_REVIEW':
    case 'UNDER_INVESTIGATION':
    case 'AWAITING_CUSTOMER_RESPONSE':
    case 'AWAITING_VENDOR_RESPONSE':
      return 'warning';

    default:
      return 'plum';
  }
}

function getPriorityTone(priority: AdminComplaintPriority) {
  switch (priority) {
    case 'URGENT':
      return 'danger';

    case 'HIGH':
      return 'warning';

    case 'MEDIUM':
      return 'blue';

    case 'LOW':
    default:
      return 'olive';
  }
}

function ComplaintCard({
  complaint,
  onView,
}: {
  complaint: AdminComplaint;
  onView: (complaintId: string) => void;
}) {
  return (
    <article className="rounded-[1.6rem] border border-rose-100/90 bg-gradient-to-br from-rose-50/85 via-white to-orange-50/35 p-5 shadow-[0_18px_45px_rgba(244,63,94,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-[0_22px_55px_rgba(244,63,94,0.11)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-rosewood)]">
            {complaint.type.replaceAll('_', ' ')}
          </p>

          <h3 className="mt-3 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
            {complaint.subject}
          </h3>

          <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/56">
            Submitted by {complaint.complainant.firstName} {complaint.complainant.lastName}
          </p>
        </div>

        <ShieldAlert className="size-5 shrink-0 text-[var(--color-rosewood)]" />
      </div>

      <p className="mt-5 line-clamp-4 text-sm leading-7 text-[var(--color-charcoal)]/68">
        {complaint.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="status-chip" data-tone={getStatusTone(complaint.status)}>
          {complaintStatusLabels[complaint.status]}
        </span>

        <span className="status-chip" data-tone={getPriorityTone(complaint.priority)}>
          {complaintPriorityLabels[complaint.priority]}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-rose-100/80 bg-white/68 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
            Assignment
          </p>

          <p className="mt-2 text-sm font-bold text-[var(--color-near-black)]">
            {complaint.assignedAdmin
              ? `${complaint.assignedAdmin.firstName} ${complaint.assignedAdmin.lastName}`
              : 'Unassigned'}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-100/80 bg-white/68 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
            Created
          </p>

          <p className="mt-2 text-sm font-bold text-[var(--color-near-black)]">
            {formatDate(complaint.createdAt)}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-800 transition hover:border-rose-300 hover:bg-rose-100"
        onClick={() => onView(complaint.id)}
      >
        Open complaint
      </button>
    </article>
  );
}

function DetailCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Clock3;
}) {
  return (
    <div className="rounded-2xl border border-rose-100/90 bg-white/74 p-4 shadow-[0_10px_28px_rgba(244,63,94,0.05)]">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700">
          <Icon className="size-4" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-bold leading-6 text-[var(--color-near-black)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminComplaintsPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AdminComplaintType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AdminComplaintStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<AdminComplaintPriority | 'ALL'>('ALL');
  const [sort, setSort] = useState<AdminComplaintSort>('newest');
  const [page, setPage] = useState(1);

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const [actionMode, setActionMode] = useState<ComplaintActionMode>(null);
  const [actionReason, setActionReason] = useState('');
  const [nextStatus, setNextStatus] =
    useState<
      Extract<
        AdminComplaintStatus,
        | 'UNDER_REVIEW'
        | 'UNDER_INVESTIGATION'
        | 'AWAITING_CUSTOMER_RESPONSE'
        | 'AWAITING_VENDOR_RESPONSE'
        | 'RESOLVED'
        | 'DISMISSED'
      >
    >('UNDER_REVIEW');
  const [nextPriority, setNextPriority] = useState<AdminComplaintPriority>('MEDIUM');
  const [resolutionSummary, setResolutionSummary] = useState('');

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
  });

  const complaintsQuery = useQuery({
    queryKey: [
      'admin',
      'complaints',
      {
        page,
        search,
        typeFilter,
        statusFilter,
        priorityFilter,
        sort,
      },
    ],
    queryFn: () =>
      getAdminComplaints({
        page,
        limit: PAGE_LIMIT,
        search: search || undefined,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
        sort,
      }),
  });

  const complaintDetailQuery = useQuery({
    queryKey: ['admin', 'complaints', selectedComplaintId],
    queryFn: () => getAdminComplaintById(selectedComplaintId as string),
    enabled: Boolean(selectedComplaintId),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      complaintId,
      status,
      reason,
      summary,
    }: {
      complaintId: string;
      status: typeof nextStatus;
      reason: string;
      summary?: string;
    }) =>
      updateAdminComplaintStatus(complaintId, {
        status,
        reason,
        ...(summary && {
          resolutionSummary: summary,
        }),
      }),

    onSuccess: (_, variables) => {
      invalidateComplaintQueries(variables.complaintId);
      closeActionDialog();
    },
  });

  const priorityMutation = useMutation({
    mutationFn: ({
      complaintId,
      priority,
      reason,
    }: {
      complaintId: string;
      priority: AdminComplaintPriority;
      reason: string;
    }) =>
      updateAdminComplaintPriority(complaintId, {
        priority,
        reason,
      }),

    onSuccess: (_, variables) => {
      invalidateComplaintQueries(variables.complaintId);
      closeActionDialog();
    },
  });

  const assignmentMutation = useMutation({
    mutationFn: ({
      complaintId,
      assignedAdminId,
      reason,
    }: {
      complaintId: string;
      assignedAdminId: string | null;
      reason: string;
    }) =>
      updateAdminComplaintAssignment(complaintId, {
        assignedAdminId,
        reason,
      }),

    onSuccess: (_, variables) => {
      invalidateComplaintQueries(variables.complaintId);
      closeActionDialog();
    },
  });

  const reopenMutation = useMutation({
    mutationFn: ({ complaintId, reason }: { complaintId: string; reason: string }) =>
      reopenAdminComplaint(complaintId, {
        reason,
      }),

    onSuccess: (_, variables) => {
      invalidateComplaintQueries(variables.complaintId);
      closeActionDialog();
    },
  });

  const complaints = complaintsQuery.data?.complaints ?? [];
  const pagination = complaintsQuery.data?.pagination;
  const selectedComplaint = complaintDetailQuery.data;

  const mutationError =
    statusMutation.error ??
    priorityMutation.error ??
    assignmentMutation.error ??
    reopenMutation.error;

  const isMutationPending =
    statusMutation.isPending ||
    priorityMutation.isPending ||
    assignmentMutation.isPending ||
    reopenMutation.isPending;

  const summary = useMemo(
    () => ({
      total: pagination?.total ?? complaints.length,
      urgent: complaints.filter((complaint) => complaint.priority === 'URGENT').length,
      unassigned: complaints.filter((complaint) => !complaint.assignedAdmin).length,
      awaitingResponse: complaints.filter((complaint) =>
        ['AWAITING_CUSTOMER_RESPONSE', 'AWAITING_VENDOR_RESPONSE'].includes(complaint.status),
      ).length,
    }),
    [complaints, pagination?.total],
  );

  const filtersAreActive =
    Boolean(search) ||
    typeFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    sort !== 'newest';

  function invalidateComplaintQueries(complaintId: string) {
    void queryClient.invalidateQueries({
      queryKey: ['admin', 'complaints'],
    });

    void queryClient.invalidateQueries({
      queryKey: ['admin', 'complaints', complaintId],
    });

    void queryClient.invalidateQueries({
      queryKey: ['admin', 'dashboard', 'summary'],
    });
  }

  function resetMutations() {
    statusMutation.reset();
    priorityMutation.reset();
    assignmentMutation.reset();
    reopenMutation.reset();
  }

  function openComplaint(complaintId: string) {
    resetMutations();
    setSelectedComplaintId(complaintId);
  }

  function closeComplaint() {
    if (isMutationPending) {
      return;
    }

    resetMutations();
    setSelectedComplaintId(null);
    closeActionDialog();
  }

  function openActionDialog(mode: Exclude<ComplaintActionMode, null>) {
    if (!selectedComplaint) {
      return;
    }

    resetMutations();
    setActionMode(mode);
    setActionReason('');
    setResolutionSummary('');
    setNextStatus('UNDER_REVIEW');
    setNextPriority(selectedComplaint.priority);
  }

  function closeActionDialog() {
    if (isMutationPending) {
      return;
    }

    setActionMode(null);
    setActionReason('');
    setResolutionSummary('');
  }

  function submitSearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setSort('newest');
    setPage(1);
  }

  function submitAction() {
    if (!selectedComplaint || actionReason.trim().length < 10) {
      return;
    }

    const reason = actionReason.trim();

    switch (actionMode) {
      case 'STATUS':
        if (nextStatus === 'RESOLVED' && resolutionSummary.trim().length < 10) {
          return;
        }

        statusMutation.mutate({
          complaintId: selectedComplaint.id,
          status: nextStatus,
          reason,
          ...(nextStatus === 'RESOLVED' && {
            summary: resolutionSummary.trim(),
          }),
        });
        return;

      case 'PRIORITY':
        priorityMutation.mutate({
          complaintId: selectedComplaint.id,
          priority: nextPriority,
          reason,
        });
        return;

      case 'ASSIGN':
        if (!currentUserQuery.data) {
          return;
        }

        assignmentMutation.mutate({
          complaintId: selectedComplaint.id,
          assignedAdminId: currentUserQuery.data.id,
          reason,
        });
        return;

      case 'UNASSIGN':
        assignmentMutation.mutate({
          complaintId: selectedComplaint.id,
          assignedAdminId: null,
          reason,
        });
        return;

      case 'REOPEN':
        reopenMutation.mutate({
          complaintId: selectedComplaint.id,
          reason,
        });
        return;

      default:
        return;
    }
  }

  const canReopen =
    selectedComplaint && ['RESOLVED', 'DISMISSED', 'CLOSED'].includes(selectedComplaint.status);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(254,205,211,0.28),transparent_34%),radial-gradient(circle_at_top_right,rgba(254,215,170,0.18),transparent_30%),linear-gradient(180deg,#fffafa_0%,#fffdfb_48%,#ffffff_100%)]">
      <div className="workspace-container">
        <AdminWorkspaceNav />

        <main className="py-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-rose-200/80 bg-gradient-to-br from-rose-100 via-orange-50 to-white p-6 shadow-[0_24px_70px_rgba(244,63,94,0.10)] sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-rose-300/24 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-orange-300/18 blur-3xl" />
            <div className="relative">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div>
                  <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-rose-200/80 bg-white/76 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-rose-700 shadow-sm">
                    <ShieldAlert className="size-4" />
                    Complaint operations
                  </div>

                  <h1 className="max-w-4xl text-balance text-4xl font-black leading-[1] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                    Investigate and resolve platform complaints.
                  </h1>

                  <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--color-charcoal)]/68">
                    Review submitted cases, manage priority and assignment, guide response states,
                    and preserve a clear administrative history.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-200/70 bg-white/74 px-5 py-4 shadow-[0_12px_30px_rgba(244,63,94,0.09)] backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                    Matching complaints
                  </p>

                  <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {complaintsQuery.isLoading ? '—' : summary.total}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {complaintsQuery.isLoading ? (
            <section className="state-surface mt-6">
              <div>
                <LoaderCircle className="mx-auto size-10 animate-spin text-rose-700" />

                <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                  Loading complaint cases
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                  Preparing statuses, priorities, assignments, and case details.
                </p>
              </div>
            </section>
          ) : complaintsQuery.isError ? (
            <section className="state-surface mt-6">
              <div className="max-w-lg">
                <div className="icon-tile mx-auto">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                  Complaints could not be loaded
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                  {getErrorMessage(
                    complaintsQuery.error,
                    'We could not load the complaint directory.',
                  )}
                </p>

                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-600 bg-gradient-to-r from-rose-500 to-orange-400 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(244,63,94,0.20)] transition hover:-translate-y-0.5 mt-6"
                  onClick={() => complaintsQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-[1.6rem] border border-rose-100/90 bg-gradient-to-br from-rose-50/90 via-white to-white p-5 shadow-[0_18px_45px_rgba(244,63,94,0.08)]">
                  <div className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                    <MessageSquareText className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Total matching
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {summary.total}
                  </p>
                </article>

                <article className="rounded-[1.6rem] border border-red-100/90 bg-gradient-to-br from-red-50/90 via-white to-white p-5 shadow-[0_18px_45px_rgba(239,68,68,0.08)]">
                  <div className="grid size-11 place-items-center rounded-2xl bg-red-100 text-red-700">
                    <BadgeAlert className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Urgent on this page
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {summary.urgent}
                  </p>
                </article>

                <article className="rounded-[1.6rem] border border-orange-100/90 bg-gradient-to-br from-orange-50/90 via-white to-white p-5 shadow-[0_18px_45px_rgba(249,115,22,0.08)]">
                  <div className="grid size-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
                    <UserMinus className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Unassigned on this page
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {summary.unassigned}
                  </p>
                </article>

                <article className="rounded-[1.6rem] border border-amber-100/90 bg-gradient-to-br from-amber-50/90 via-white to-white p-5 shadow-[0_18px_45px_rgba(245,158,11,0.08)]">
                  <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                    <Clock3 className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Awaiting response
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {summary.awaitingResponse}
                  </p>
                </article>
              </section>

              <section className="mt-6 rounded-[2rem] border border-rose-100/90 bg-white/84 p-6 shadow-[0_24px_60px_rgba(244,63,94,0.08)] backdrop-blur sm:p-7">
                <div>
                  <p className="section-eyebrow">Complaint directory</p>

                  <h2 className="section-title">Search and filter support cases</h2>

                  <p className="section-description">
                    Narrow complaint records by subject, type, status, priority, or creation order.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 xl:grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.9fr]">
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitSearch();
                    }}
                  >
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !pl-11"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search complaints"
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-rose-600 bg-gradient-to-r from-rose-500 to-orange-400 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(244,63,94,0.20)] transition hover:-translate-y-0.5"
                    >
                      Search
                    </button>
                  </form>

                  <select
                    className="form-field"
                    value={typeFilter}
                    onChange={(event) => {
                      setTypeFilter(event.target.value as AdminComplaintType | 'ALL');
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All types</option>

                    {complaintTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-field"
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as AdminComplaintStatus | 'ALL');
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All statuses</option>

                    {adminComplaintStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {complaintStatusLabels[status]}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-field"
                    value={priorityFilter}
                    onChange={(event) => {
                      setPriorityFilter(event.target.value as AdminComplaintPriority | 'ALL');
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All priorities</option>

                    {adminComplaintPriorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {complaintPriorityLabels[priority]}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-field"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as AdminComplaintSort);
                      setPage(1);
                    }}
                  >
                    {adminComplaintSortOptions.map((sortOption) => (
                      <option key={sortOption} value={sortOption}>
                        {complaintSortLabels[sortOption]}
                      </option>
                    ))}
                  </select>
                </div>

                {filtersAreActive ? (
                  <button
                    type="button"
                    className="btn-secondary mt-4 text-sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : null}

                {complaints.length > 0 ? (
                  <div className="mt-7 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {complaints.map((complaint) => (
                      <ComplaintCard
                        key={complaint.id}
                        complaint={complaint}
                        onView={openComplaint}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-surface mt-7">
                    <ShieldCheck className="mx-auto size-9 text-rose-700/64" />

                    <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                      No complaints match these filters
                    </h3>

                    <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                      Change the search term, case type, status, priority, or sort order.
                    </p>

                    {filtersAreActive ? (
                      <button
                        type="button"
                        className="btn-secondary mt-5 text-sm"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                )}

                {pagination && pagination.totalPages > 1 ? (
                  <div className="mt-7 flex flex-col items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/70 to-orange-50/60 px-5 py-4 sm:flex-row">
                    <p className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                      Page{' '}
                      <span className="font-black text-[var(--color-near-black)]">
                        {pagination.page}
                      </span>{' '}
                      of{' '}
                      <span className="font-black text-[var(--color-near-black)]">
                        {pagination.totalPages}
                      </span>
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-4 py-2.5 text-sm"
                        disabled={!pagination.hasPreviousPage || complaintsQuery.isFetching}
                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </button>

                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-4 py-2.5 text-sm"
                        disabled={!pagination.hasNextPage || complaintsQuery.isFetching}
                        onClick={() => setPage((currentPage) => currentPage + 1)}
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </main>
      </div>

      {selectedComplaintId ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeComplaint();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-complaint-detail-title"
            className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-rose-100 bg-[#fffafa] p-6 shadow-[0_28px_90px_rgba(136,19,55,0.18)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Complaint case</p>

                <h2 id="admin-complaint-detail-title" className="section-title">
                  Case management
                </h2>
              </div>

              <button
                type="button"
                className="grid size-10 place-items-center rounded-xl border border-rose-100 bg-white text-rose-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50"
                onClick={closeComplaint}
                aria-label="Close complaint details"
              >
                <X className="size-5" />
              </button>
            </div>

            {complaintDetailQuery.isLoading ? (
              <div className="state-surface mt-6 min-h-72">
                <div>
                  <LoaderCircle className="mx-auto size-9 animate-spin text-rose-700" />

                  <p className="mt-4 font-black text-[var(--color-near-black)]">
                    Loading complaint details
                  </p>
                </div>
              </div>
            ) : complaintDetailQuery.isError ? (
              <div className="feedback-surface mt-6" data-tone="danger">
                {getErrorMessage(
                  complaintDetailQuery.error,
                  'We could not load this complaint case.',
                )}
              </div>
            ) : selectedComplaint ? (
              <>
                <div className="mt-6 flex flex-col justify-between gap-5 rounded-[1.6rem] border border-rose-100 bg-gradient-to-br from-rose-50/75 via-white to-orange-50/35 p-5 shadow-[0_18px_42px_rgba(244,63,94,0.08)] sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-rosewood)]">
                      {selectedComplaint.type.replaceAll('_', ' ')}
                    </p>

                    <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {selectedComplaint.subject}
                    </h3>

                    <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/56">
                      Submitted by {selectedComplaint.complainant.firstName}{' '}
                      {selectedComplaint.complainant.lastName}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className="status-chip"
                      data-tone={getStatusTone(selectedComplaint.status)}
                    >
                      {complaintStatusLabels[selectedComplaint.status]}
                    </span>

                    <span
                      className="status-chip"
                      data-tone={getPriorityTone(selectedComplaint.priority)}
                    >
                      {complaintPriorityLabels[selectedComplaint.priority]}
                    </span>
                  </div>
                </div>

                <section className="mt-6 rounded-[1.6rem] border border-rose-100 bg-gradient-to-br from-rose-50/55 via-white to-orange-50/25 p-6 shadow-[0_18px_42px_rgba(244,63,94,0.07)]">
                  <p className="section-eyebrow">Case description</p>

                  <h3 className="section-title">Complaint details</h3>

                  <div className="mt-6 rounded-[1.4rem] border border-rose-100 bg-white/76 p-5 shadow-[0_14px_34px_rgba(244,63,94,0.05)]">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--color-charcoal)]/70">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailCard
                      icon={CircleUserRound}
                      label="Complainant"
                      value={`${selectedComplaint.complainant.firstName} ${selectedComplaint.complainant.lastName}`}
                    />

                    <DetailCard
                      icon={CircleUserRound}
                      label="Respondent"
                      value={
                        selectedComplaint.respondent
                          ? `${selectedComplaint.respondent.firstName} ${selectedComplaint.respondent.lastName}`
                          : 'No respondent'
                      }
                    />

                    <DetailCard
                      icon={UserCheck}
                      label="Assigned administrator"
                      value={
                        selectedComplaint.assignedAdmin
                          ? `${selectedComplaint.assignedAdmin.firstName} ${selectedComplaint.assignedAdmin.lastName}`
                          : 'Unassigned'
                      }
                    />

                    <DetailCard
                      icon={Clock3}
                      label="Created"
                      value={formatDateTime(selectedComplaint.createdAt)}
                    />
                  </div>
                </section>

                {selectedComplaint.resolutionSummary ? (
                  <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/45 p-5 text-emerald-900 shadow-[0_14px_34px_rgba(16,185,129,0.08)]">
                    <div>
                      <p className="font-black">Resolution summary</p>

                      <p className="mt-2 leading-7">{selectedComplaint.resolutionSummary}</p>
                    </div>
                  </div>
                ) : null}

                <section className="mt-6 grid gap-6 lg:grid-cols-2">
                  <article className="rounded-[1.6rem] border border-rose-100 bg-gradient-to-br from-rose-50/55 via-white to-orange-50/25 p-6 shadow-[0_18px_42px_rgba(244,63,94,0.07)]">
                    <p className="section-eyebrow">Case conversation</p>

                    <h3 className="section-title">Messages</h3>

                    {selectedComplaint.messages.length > 0 ? (
                      <div className="mt-6 space-y-3">
                        {selectedComplaint.messages.map((message) => (
                          <article
                            key={message.id}
                            className="rounded-[1.35rem] border border-rose-100 bg-white/76 p-5 shadow-[0_12px_30px_rgba(244,63,94,0.05)]"
                          >
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                              <div>
                                <p className="font-black text-[var(--color-near-black)]">
                                  {message.author.firstName} {message.author.lastName}
                                </p>

                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-charcoal)]/46">
                                  {message.author.role}
                                  {message.isInternal ? ' · Internal' : ''}
                                </p>
                              </div>

                              <p className="text-xs font-semibold text-[var(--color-charcoal)]/48">
                                {formatDateTime(message.createdAt)}
                              </p>
                            </div>

                            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--color-charcoal)]/68">
                              {message.body}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-surface mt-6">
                        <MessageSquareText className="mx-auto size-8 text-rose-700/64" />

                        <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/56">
                          No messages have been added to this case.
                        </p>
                      </div>
                    )}
                  </article>

                  <article className="rounded-[1.6rem] border border-rose-100 bg-gradient-to-br from-rose-50/55 via-white to-orange-50/25 p-6 shadow-[0_18px_42px_rgba(244,63,94,0.07)]">
                    <p className="section-eyebrow">Audit history</p>

                    <h3 className="section-title">Administrative actions</h3>

                    {selectedComplaint.actions.length > 0 ? (
                      <div className="mt-6 space-y-3">
                        {selectedComplaint.actions.map((action) => (
                          <article
                            key={action.id}
                            className="rounded-[1.35rem] border border-rose-100 bg-white/76 p-5 shadow-[0_12px_30px_rgba(244,63,94,0.05)]"
                          >
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                              <div>
                                <p className="font-black text-[var(--color-near-black)]">
                                  {action.action.replaceAll('_', ' ')}
                                </p>

                                <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
                                  {action.performedBy
                                    ? `${action.performedBy.firstName} ${action.performedBy.lastName}`
                                    : 'System action'}
                                </p>
                              </div>

                              <p className="text-xs font-semibold text-[var(--color-charcoal)]/48">
                                {formatDateTime(action.createdAt)}
                              </p>
                            </div>

                            {action.reason ? (
                              <p className="mt-4 text-sm leading-7 text-[var(--color-charcoal)]/68">
                                {action.reason}
                              </p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-surface mt-6">
                        <History className="mx-auto size-8 text-rose-700/64" />

                        <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/56">
                          No administrative actions have been recorded.
                        </p>
                      </div>
                    )}
                  </article>
                </section>

                {mutationError ? (
                  <div className="feedback-surface mt-6" data-tone="danger" role="alert">
                    {getErrorMessage(mutationError, 'We could not update this complaint case.')}
                  </div>
                ) : null}

                <section className="mt-6 rounded-[1.6rem] border border-rose-200/80 bg-gradient-to-br from-rose-100/70 via-white to-orange-50/55 p-6 shadow-[0_18px_42px_rgba(244,63,94,0.09)]">
                  <p className="section-eyebrow">Case controls</p>

                  <h3 className="section-title">Administrative actions</h3>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {!canReopen ? (
                      <>
                        <button
                          type="button"
                          className="btn-secondary text-sm"
                          disabled={isMutationPending}
                          onClick={() => openActionDialog('STATUS')}
                        >
                          <CheckCircle2 className="size-4" />
                          Update status
                        </button>

                        <button
                          type="button"
                          className="btn-secondary text-sm"
                          disabled={isMutationPending}
                          onClick={() => openActionDialog('PRIORITY')}
                        >
                          <BadgeAlert className="size-4" />
                          Change priority
                        </button>

                        {selectedComplaint.assignedAdmin ? (
                          <button
                            type="button"
                            className="btn-secondary text-sm"
                            disabled={isMutationPending}
                            onClick={() => openActionDialog('UNASSIGN')}
                          >
                            <UserMinus className="size-4" />
                            Unassign
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-600 bg-gradient-to-r from-rose-500 to-orange-400 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(244,63,94,0.20)] transition hover:-translate-y-0.5"
                            disabled={isMutationPending || !currentUserQuery.data}
                            onClick={() => openActionDialog('ASSIGN')}
                          >
                            <UserCheck className="size-4" />
                            Assign to me
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-600 bg-gradient-to-r from-rose-500 to-orange-400 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(244,63,94,0.20)] transition hover:-translate-y-0.5"
                        disabled={isMutationPending}
                        onClick={() => openActionDialog('REOPEN')}
                      >
                        <RotateCcw className="size-4" />
                        Reopen complaint
                      </button>
                    )}
                  </div>
                </section>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {actionMode && selectedComplaint ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isMutationPending) {
              closeActionDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-complaint-action-title"
            className="w-full max-w-xl rounded-[2rem] border border-rose-100 bg-[#fffafa] p-6 shadow-[0_28px_90px_rgba(136,19,55,0.18)]"
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 text-rose-700 shadow-[0_10px_26px_rgba(244,63,94,0.10)]">
              {actionMode === 'REOPEN' ? (
                <RotateCcw className="size-5" />
              ) : actionMode === 'PRIORITY' ? (
                <BadgeAlert className="size-5" />
              ) : actionMode === 'ASSIGN' ? (
                <UserCheck className="size-5" />
              ) : actionMode === 'UNASSIGN' ? (
                <UserMinus className="size-5" />
              ) : (
                <CheckCircle2 className="size-5" />
              )}
            </div>

            <h2
              id="admin-complaint-action-title"
              className="mt-5 text-2xl font-black text-[var(--color-near-black)]"
            >
              {actionMode === 'STATUS'
                ? 'Update complaint status'
                : actionMode === 'PRIORITY'
                  ? 'Change complaint priority'
                  : actionMode === 'ASSIGN'
                    ? 'Assign this complaint to yourself'
                    : actionMode === 'UNASSIGN'
                      ? 'Unassign this complaint'
                      : 'Reopen this complaint'}
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/64">
              Record a clear reason so the case history explains why this administrative change was
              made.
            </p>

            {actionMode === 'STATUS' ? (
              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                  New status
                </span>

                <select
                  className="form-field"
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value as typeof nextStatus)}
                  disabled={isMutationPending}
                >
                  {mutableComplaintStatuses.map((status) => (
                    <option key={status} value={status}>
                      {complaintStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {actionMode === 'PRIORITY' ? (
              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                  New priority
                </span>

                <select
                  className="form-field"
                  value={nextPriority}
                  onChange={(event) =>
                    setNextPriority(event.target.value as AdminComplaintPriority)
                  }
                  disabled={isMutationPending}
                >
                  {adminComplaintPriorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {complaintPriorityLabels[priority]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {actionMode === 'STATUS' && nextStatus === 'RESOLVED' ? (
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                  Resolution summary
                </span>

                <textarea
                  className="form-field min-h-28"
                  value={resolutionSummary}
                  onChange={(event) => setResolutionSummary(event.target.value)}
                  placeholder="Summarize how the complaint was resolved."
                  aria-invalid={
                    resolutionSummary.length > 0 && resolutionSummary.trim().length < 10
                  }
                  disabled={isMutationPending}
                />

                <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/48">
                  Minimum 10 characters.
                </span>
              </label>
            ) : null}

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Reason
              </span>

              <textarea
                className="form-field min-h-32"
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                placeholder="Explain why this change is appropriate."
                aria-invalid={actionReason.length > 0 && actionReason.trim().length < 10}
                disabled={isMutationPending}
              />

              <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/48">
                Minimum 10 characters.
              </span>
            </label>

            {mutationError ? (
              <div className="feedback-surface mt-5" data-tone="danger" role="alert">
                {getErrorMessage(mutationError, 'We could not update this complaint.')}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={isMutationPending}
                onClick={closeActionDialog}
              >
                Cancel
              </button>

              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-600 bg-gradient-to-r from-rose-500 to-orange-400 px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(244,63,94,0.20)] transition hover:-translate-y-0.5"
                disabled={
                  isMutationPending ||
                  actionReason.trim().length < 10 ||
                  (actionMode === 'STATUS' &&
                    nextStatus === 'RESOLVED' &&
                    resolutionSummary.trim().length < 10)
                }
                onClick={submitAction}
              >
                {isMutationPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : actionMode === 'REOPEN' ? (
                  <RotateCcw className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}

                {isMutationPending ? 'Updating...' : 'Confirm action'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
