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
    <article className="group flex h-full flex-col rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/76 p-4 shadow-[0_14px_38px_rgba(64,42,51,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(91,61,82,0.16)] hover:shadow-[0_18px_42px_rgba(64,42,51,0.09)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
            {complaint.type.replaceAll('_', ' ')}
          </p>

          <h3 className="mt-2 line-clamp-2 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
            {complaint.subject}
          </h3>

          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/52">
            Submitted by {complaint.complainant.firstName} {complaint.complainant.lastName}
          </p>
        </div>

        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
          <ShieldAlert className="size-4" />
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--color-charcoal)]/64">
        {complaint.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="status-chip" data-tone={getStatusTone(complaint.status)}>
          {complaintStatusLabels[complaint.status]}
        </span>

        <span className="status-chip" data-tone={getPriorityTone(complaint.priority)}>
          {complaintPriorityLabels[complaint.priority]}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-[rgba(91,61,82,0.035)] px-3 py-2.5">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/40">
            Assignment
          </p>

          <p className="mt-1 truncate text-xs font-bold text-[var(--color-near-black)]">
            {complaint.assignedAdmin
              ? `${complaint.assignedAdmin.firstName} ${complaint.assignedAdmin.lastName}`
              : 'Unassigned'}
          </p>
        </div>

        <div className="rounded-xl bg-[rgba(91,61,82,0.035)] px-3 py-2.5">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/40">
            Created
          </p>

          <p className="mt-1 text-xs font-bold text-[var(--color-near-black)]">
            {formatDate(complaint.createdAt)}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-[rgba(91,61,82,0.12)] bg-[rgba(183,167,200,0.09)] px-4 text-xs font-black text-[var(--color-deep-plum)] transition hover:border-[rgba(91,61,82,0.20)] hover:bg-[rgba(183,167,200,0.16)]"
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(183,167,200,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(140,92,111,0.07),transparent_28%),linear-gradient(180deg,#fbf9fa_0%,#f7f3f6_48%,#f8f6f9_100%)]">
      <div className="workspace-container">
        <AdminWorkspaceNav />

        <main className="py-4">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(246,241,247,0.92),rgba(239,233,244,0.78))] px-6 py-5 shadow-[0_18px_50px_rgba(64,42,51,0.07)] sm:px-7 sm:py-6">
            <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border border-[rgba(91,61,82,0.05)]" />
            <div className="pointer-events-none absolute -right-7 -top-10 size-36 rounded-full border border-[rgba(91,61,82,0.04)]" />

            <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(91,61,82,0.10)] bg-white/72 px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)] shadow-sm">
                  <ShieldAlert className="size-3.5" />
                  Complaint operations
                </div>

                <h1 className="mt-4 max-w-3xl text-balance text-[2.25rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.7rem]">
                  Investigate and resolve platform complaints.
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-charcoal)]/62">
                  Review submitted cases, manage priority and assignment, guide response states, and
                  preserve a clear administrative history.
                </p>
              </div>

              <div className="flex w-full shrink-0 items-center justify-between gap-5 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-white/68 px-4 py-3.5 shadow-[0_10px_28px_rgba(64,42,51,0.05)] backdrop-blur lg:w-[250px]">
                <div>
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                    Matching complaints
                  </p>

                  <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    {complaintsQuery.isLoading ? '—' : summary.total}
                  </p>
                </div>

                <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                  <MessageSquareText className="size-4" />
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
              <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-[1.3rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_36px_rgba(64,42,51,0.055)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                      <MessageSquareText className="size-4" />
                    </div>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {summary.total}
                    </p>
                  </div>

                  <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                    Total matching
                  </p>
                </article>

                <article className="rounded-[1.3rem] border border-red-100/80 bg-white/78 px-4 py-3.5 shadow-[0_14px_36px_rgba(64,42,51,0.055)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-red-50 text-red-600">
                      <BadgeAlert className="size-4" />
                    </div>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {summary.urgent}
                    </p>
                  </div>

                  <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                    Urgent on this page
                  </p>
                </article>

                <article className="rounded-[1.3rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_36px_rgba(64,42,51,0.055)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.12)] text-[var(--color-deep-plum)]">
                      <UserMinus className="size-4" />
                    </div>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {summary.unassigned}
                    </p>
                  </div>

                  <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                    Unassigned on this page
                  </p>
                </article>

                <article className="rounded-[1.3rem] border border-amber-100/80 bg-white/78 px-4 py-3.5 shadow-[0_14px_36px_rgba(64,42,51,0.055)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                      <Clock3 className="size-4" />
                    </div>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {summary.awaitingResponse}
                    </p>
                  </div>

                  <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                    Awaiting response
                  </p>
                </article>
              </section>

              <section className="mt-4 rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-white/82 p-4 shadow-[0_18px_50px_rgba(64,42,51,0.07)] backdrop-blur-xl sm:p-5">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                  <div>
                    <p className="section-eyebrow">Complaint directory</p>

                    <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      Search and filter support cases
                    </h2>

                    <p className="mt-1 text-xs font-medium leading-5 text-[var(--color-charcoal)]/58">
                      Narrow complaint records by subject, type, status, priority, or creation
                      order.
                    </p>
                  </div>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary min-h-0 px-4 py-2 text-xs"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2.5 xl:grid-cols-[1.35fr_0.72fr_0.92fr_0.78fr_0.88fr]">
                  <form
                    className="relative min-w-0"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitSearch();
                    }}
                  >
                    <input
                      className="form-field !h-10 !min-h-0 !rounded-xl !py-2 !pl-4 !pr-4 !text-sm"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search complaints"
                    />
                  </form>

                  <select
                    className="form-field !h-10 !min-h-0 !rounded-xl !py-2 !text-sm"
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
                    className="form-field !h-10 !min-h-0 !rounded-xl !py-2 !text-sm"
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
                    className="form-field !h-10 !min-h-0 !rounded-xl !py-2 !text-sm"
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
                    className="form-field !h-10 !min-h-0 !rounded-xl !py-2 !text-sm"
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

                {complaints.length > 0 ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
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
                    <ShieldCheck className="mx-auto size-9 text-[var(--color-deep-plum)]/60" />

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
    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-5 backdrop-blur-md"
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
      className="max-h-[94vh] w-full max-w-[1120px] overflow-y-auto rounded-[1.75rem] border border-[rgba(91,61,82,0.12)] bg-[#fbf9fb] p-5 shadow-[0_28px_90px_rgba(48,31,43,0.18)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">Complaint case</p>

          <h2
            id="admin-complaint-detail-title"
            className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
          >
            Case management
          </h2>
        </div>

        <button
          type="button"
          className="grid size-9 place-items-center rounded-xl border border-[rgba(91,61,82,0.12)] bg-white/80 text-[var(--color-deep-plum)] shadow-sm transition hover:border-[rgba(91,61,82,0.22)] hover:bg-[rgba(183,167,200,0.12)]"
          onClick={closeComplaint}
          aria-label="Close complaint details"
        >
          <X className="size-4" />
        </button>
      </div>

      {complaintDetailQuery.isLoading ? (
        <div className="state-surface mt-4 min-h-52">
          <div>
            <LoaderCircle className="mx-auto size-8 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-3 font-black text-[var(--color-near-black)]">
              Loading complaint details
            </p>
          </div>
        </div>
      ) : complaintDetailQuery.isError ? (
        <div className="feedback-surface mt-4" data-tone="danger">
          {getErrorMessage(
            complaintDetailQuery.error,
            'We could not load this complaint case.',
          )}
        </div>
      ) : selectedComplaint ? (
        <>
          <div className="mt-4 flex flex-col justify-between gap-4 rounded-[1.35rem] border border-[rgba(91,61,82,0.10)] bg-white/76 px-4 py-3.5 shadow-[0_12px_32px_rgba(64,42,51,0.05)] sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                {selectedComplaint.type.replaceAll('_', ' ')}
              </p>

              <h3 className="mt-1.5 truncate text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                {selectedComplaint.subject}
              </h3>

              <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/54">
                Submitted by {selectedComplaint.complainant.firstName}{' '}
                {selectedComplaint.complainant.lastName}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
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

          <section className="mt-4 rounded-[1.35rem] border border-[rgba(91,61,82,0.10)] bg-white/72 p-4 shadow-[0_12px_32px_rgba(64,42,51,0.045)]">
            <div>
              <p className="section-eyebrow">Case description</p>

              <h3 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                Complaint details
              </h3>
            </div>

            <div className="mt-3 rounded-xl border border-[rgba(91,61,82,0.08)] bg-[rgba(91,61,82,0.025)] px-4 py-3">
              <p className="whitespace-pre-wrap text-xs leading-5 text-[var(--color-charcoal)]/68">
                {selectedComplaint.description}
              </p>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[rgba(91,61,82,0.08)] bg-white/74 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                    <CircleUserRound className="size-3.5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Complainant
                    </p>

                    <p className="mt-0.5 truncate text-xs font-bold text-[var(--color-near-black)]">
                      {selectedComplaint.complainant.firstName}{' '}
                      {selectedComplaint.complainant.lastName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(91,61,82,0.08)] bg-white/74 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                    <CircleUserRound className="size-3.5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Respondent
                    </p>

                    <p className="mt-0.5 truncate text-xs font-bold text-[var(--color-near-black)]">
                      {selectedComplaint.respondent
                        ? `${selectedComplaint.respondent.firstName} ${selectedComplaint.respondent.lastName}`
                        : 'No respondent'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(91,61,82,0.08)] bg-white/74 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                    <UserCheck className="size-3.5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Assigned administrator
                    </p>

                    <p className="mt-0.5 truncate text-xs font-bold text-[var(--color-near-black)]">
                      {selectedComplaint.assignedAdmin
                        ? `${selectedComplaint.assignedAdmin.firstName} ${selectedComplaint.assignedAdmin.lastName}`
                        : 'Unassigned'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(91,61,82,0.08)] bg-white/74 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                    <Clock3 className="size-3.5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                      Created
                    </p>

                    <p className="mt-0.5 text-xs font-bold text-[var(--color-near-black)]">
                      {formatDateTime(selectedComplaint.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {selectedComplaint.resolutionSummary ? (
            <div className="mt-4 rounded-[1.25rem] border border-emerald-200/80 bg-emerald-50/55 px-4 py-3 text-emerald-900">
              <p className="text-xs font-black">Resolution summary</p>

              <p className="mt-1 text-xs leading-5">
                {selectedComplaint.resolutionSummary}
              </p>
            </div>
          ) : null}

          <section className="mt-4 grid gap-3 lg:grid-cols-2">
            <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.10)] bg-white/72 p-4 shadow-[0_12px_32px_rgba(64,42,51,0.045)]">
              <p className="section-eyebrow">Case conversation</p>

              <h3 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                Messages
              </h3>

              {selectedComplaint.messages.length > 0 ? (
                <div className="mt-3 max-h-44 space-y-2.5 overflow-y-auto pr-1">
                  {selectedComplaint.messages.map((message) => (
                    <article
                      key={message.id}
                      className="rounded-xl border border-[rgba(91,61,82,0.08)] bg-white/80 p-3"
                    >
                      <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xs font-black text-[var(--color-near-black)]">
                            {message.author.firstName} {message.author.lastName}
                          </p>

                          <p className="mt-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[var(--color-charcoal)]/44">
                            {message.author.role}
                            {message.isInternal ? ' · Internal' : ''}
                          </p>
                        </div>

                        <p className="text-[0.62rem] font-semibold text-[var(--color-charcoal)]/46">
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[var(--color-charcoal)]/66">
                        {message.body}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(91,61,82,0.018)] px-4 py-4 text-center">
                  <div>
                    <MessageSquareText className="mx-auto size-5 text-[var(--color-deep-plum)]/48" />

                    <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/52">
                      No messages have been added to this case.
                    </p>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.10)] bg-white/72 p-4 shadow-[0_12px_32px_rgba(64,42,51,0.045)]">
              <p className="section-eyebrow">Audit history</p>

              <h3 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                Administrative actions
              </h3>

              {selectedComplaint.actions.length > 0 ? (
                <div className="mt-3 max-h-44 space-y-2.5 overflow-y-auto pr-1">
                  {selectedComplaint.actions.map((action) => (
                    <article
                      key={action.id}
                      className="rounded-xl border border-[rgba(91,61,82,0.08)] bg-white/80 p-3"
                    >
                      <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xs font-black text-[var(--color-near-black)]">
                            {action.action.replaceAll('_', ' ')}
                          </p>

                          <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/54">
                            {action.performedBy
                              ? `${action.performedBy.firstName} ${action.performedBy.lastName}`
                              : 'System action'}
                          </p>
                        </div>

                        <p className="text-[0.62rem] font-semibold text-[var(--color-charcoal)]/46">
                          {formatDateTime(action.createdAt)}
                        </p>
                      </div>

                      {action.reason ? (
                        <p className="mt-2 text-xs leading-5 text-[var(--color-charcoal)]/66">
                          {action.reason}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[rgba(91,61,82,0.14)] bg-[rgba(91,61,82,0.018)] px-4 py-4 text-center">
                  <div>
                    <History className="mx-auto size-5 text-[var(--color-deep-plum)]/48" />

                    <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/52">
                      No administrative actions have been recorded.
                    </p>
                  </div>
                </div>
              )}
            </article>
          </section>

          {mutationError ? (
            <div
              className="feedback-surface mt-4"
              data-tone="danger"
              role="alert"
            >
              {getErrorMessage(
                mutationError,
                'We could not update this complaint case.',
              )}
            </div>
          ) : null}

          <section className="mt-4 rounded-[1.35rem] border border-[rgba(91,61,82,0.10)] bg-white/72 px-4 py-3.5 shadow-[0_12px_32px_rgba(64,42,51,0.045)]">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <p className="section-eyebrow">Case controls</p>

                <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                  Administrative actions
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {!canReopen ? (
                  <>
                    <button
                      type="button"
                      className="btn-secondary min-h-0 px-4 py-2 text-xs"
                      disabled={isMutationPending}
                      onClick={() => openActionDialog('STATUS')}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Update status
                    </button>

                    <button
                      type="button"
                      className="btn-secondary min-h-0 px-4 py-2 text-xs"
                      disabled={isMutationPending}
                      onClick={() => openActionDialog('PRIORITY')}
                    >
                      <BadgeAlert className="size-3.5" />
                      Change priority
                    </button>

                    {selectedComplaint.assignedAdmin ? (
                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-4 py-2 text-xs"
                        disabled={isMutationPending}
                        onClick={() => openActionDialog('UNASSIGN')}
                      >
                        <UserMinus className="size-3.5" />
                        Unassign
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex min-h-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] px-4 py-2 text-xs font-black text-white shadow-[0_10px_24px_rgba(91,61,82,0.16)] transition hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isMutationPending || !currentUserQuery.data}
                        onClick={() => openActionDialog('ASSIGN')}
                      >
                        <UserCheck className="size-3.5" />
                        Assign to me
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-flex min-h-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] px-4 py-2 text-xs font-black text-white shadow-[0_10px_24px_rgba(91,61,82,0.16)] transition hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isMutationPending}
                    onClick={() => openActionDialog('REOPEN')}
                  >
                    <RotateCcw className="size-3.5" />
                    Reopen complaint
                  </button>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </section>
  </div>
) : null}

      {actionMode && selectedComplaint ? (
  <div
    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
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
      className="w-full max-w-[540px] rounded-[1.75rem] border border-[rgba(91,61,82,0.12)] bg-[#fbf9fb] p-5 shadow-[0_28px_90px_rgba(48,31,43,0.22)] sm:p-6"
    >
      <div className="grid size-10 place-items-center rounded-xl bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
        {actionMode === 'REOPEN' ? (
          <RotateCcw className="size-4" />
        ) : actionMode === 'PRIORITY' ? (
          <BadgeAlert className="size-4" />
        ) : actionMode === 'ASSIGN' ? (
          <UserCheck className="size-4" />
        ) : actionMode === 'UNASSIGN' ? (
          <UserMinus className="size-4" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
      </div>

      <h2
        id="admin-complaint-action-title"
        className="mt-4 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]"
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

      <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
        Record a clear reason so the case history explains why this administrative
        change was made.
      </p>

      {actionMode === 'STATUS' ? (
        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-black text-[var(--color-charcoal)]/68">
            New status
          </span>

          <select
            className="form-field !min-h-0 !h-10 !rounded-xl !py-2 !text-sm"
            value={nextStatus}
            onChange={(event) =>
              setNextStatus(event.target.value as typeof nextStatus)
            }
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
        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-black text-[var(--color-charcoal)]/68">
            New priority
          </span>

          <select
            className="form-field !min-h-0 !h-10 !rounded-xl !py-2 !text-sm"
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
        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-black text-[var(--color-charcoal)]/68">
            Resolution summary
          </span>

          <textarea
            className="form-field !min-h-24 !rounded-xl !py-3 !text-sm"
            value={resolutionSummary}
            onChange={(event) => setResolutionSummary(event.target.value)}
            placeholder="Summarize how the complaint was resolved."
            aria-invalid={
              resolutionSummary.length > 0 &&
              resolutionSummary.trim().length < 10
            }
            disabled={isMutationPending}
          />

          <span className="mt-1.5 block text-[0.68rem] font-semibold text-[var(--color-charcoal)]/44">
            Minimum 10 characters.
          </span>
        </label>
      ) : null}

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-black text-[var(--color-charcoal)]/68">
          Reason
        </span>

        <textarea
          className="form-field !min-h-24 !rounded-xl !py-3 !text-sm"
          value={actionReason}
          onChange={(event) => setActionReason(event.target.value)}
          placeholder="Explain why this change is appropriate."
          aria-invalid={
            actionReason.length > 0 && actionReason.trim().length < 10
          }
          disabled={isMutationPending}
        />

        <span className="mt-1.5 block text-[0.68rem] font-semibold text-[var(--color-charcoal)]/44">
          Minimum 10 characters.
        </span>
      </label>

      {mutationError ? (
        <div
          className="feedback-surface mt-4"
          data-tone="danger"
          role="alert"
        >
          {getErrorMessage(
            mutationError,
            'We could not update this complaint.',
          )}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="btn-secondary min-h-0 px-4 py-2.5 text-sm"
          disabled={isMutationPending}
          onClick={closeActionDialog}
        >
          Cancel
        </button>

        <button
          type="button"
          className="inline-flex min-h-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(91,61,82,0.16)] transition hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:border-[rgba(91,61,82,0.18)] disabled:bg-[rgba(91,61,82,0.20)] disabled:text-white disabled:shadow-none"
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
