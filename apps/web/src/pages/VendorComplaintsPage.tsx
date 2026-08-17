import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MessageSquareWarning,
  ShieldAlert,
} from 'lucide-react';
import { getCurrentUserId } from '../features/auth/auth.storage';
import {
  addComplaintMessage,
  closeComplaint,
  complaintStatuses,
  complaintTypes,
  getComplaintById,
  getMyComplaints,
  type Complaint,
  type ComplaintStatus,
  type ComplaintType,
} from '../features/complaints/complaint.api';
import { ComplaintCard } from '../features/complaints/ComplaintCard';
import { ComplaintDetailsDialog } from '../features/complaints/ComplaintDetailsDialog';
import { PageBackButton } from '../components/navigation/PageBackButton';

const PAGE_LIMIT = 12;

const complaintStatusLabels: Record<ComplaintStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under review',
  AWAITING_CUSTOMER_RESPONSE: 'Awaiting customer',
  AWAITING_VENDOR_RESPONSE: 'Awaiting your response',
  UNDER_INVESTIGATION: 'Under investigation',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
  CLOSED: 'Closed',
};

const complaintTypeLabels: Record<ComplaintType, string> = {
  BOOKING: 'Booking',
  PAYMENT: 'Payment',
  REVIEW: 'Review',
  QUOTATION: 'Quotation',
  USER_CONDUCT: 'User conduct',
  PLATFORM: 'Platform',
  OTHER: 'Other',
};

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const responseData = error.response.data;

    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'message' in responseData &&
      typeof responseData.message === 'string'
    ) {
      return responseData.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to load vendor complaints right now.';
}

function SummaryCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <article className="glass-card group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(64,42,51,0.1)]">
      <div className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl transition duration-300 group-hover:bg-[rgba(183,167,200,0.2)]" />

      <div className="relative">
        <div className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
          <MessageSquareWarning className="size-5" />
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
          {label}
        </p>

        <p className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
          {value}
        </p>

        <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/58">{helper}</p>
      </div>
    </article>
  );
}

export function VendorComplaintsPage() {
  const queryClient = useQueryClient();
  const currentUserId = getCurrentUserId();

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [replySuccessCount, setReplySuccessCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ComplaintType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const complaintsQuery = useQuery({
    queryKey: [
      'vendor-complaints',
      {
        page,
        status: statusFilter,
        type: typeFilter,
      },
    ],
    queryFn: () =>
      getMyComplaints({
        page,
        limit: PAGE_LIMIT,
        sort: 'newest',
        ...(statusFilter !== 'ALL' && {
          status: statusFilter,
        }),
        ...(typeFilter !== 'ALL' && {
          type: typeFilter,
        }),
      }),
  });

  const complaintDetailQuery = useQuery({
    queryKey: ['complaint', selectedComplaintId],
    queryFn: () => getComplaintById(selectedComplaintId as string),
    enabled: Boolean(selectedComplaintId),
  });

  const replyMutation = useMutation({
    mutationFn: ({ complaintId, body }: { complaintId: string; body: string }) =>
      addComplaintMessage(complaintId, {
        body,
      }),

    onSuccess: (_, variables) => {
      setReplySuccessCount((current) => current + 1);

      void queryClient.invalidateQueries({
        queryKey: ['complaint', variables.complaintId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['vendor-complaints'],
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ complaintId, reason }: { complaintId: string; reason?: string }) =>
      closeComplaint(complaintId, {
        reason,
      }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['complaint', variables.complaintId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['vendor-complaints'],
      });
    },
  });

  const complaints = complaintsQuery.data?.complaints ?? [];
  const pagination = complaintsQuery.data?.pagination;

  const summary = useMemo(() => {
    const activeStatuses: ComplaintStatus[] = [
      'OPEN',
      'UNDER_REVIEW',
      'AWAITING_CUSTOMER_RESPONSE',
      'AWAITING_VENDOR_RESPONSE',
      'UNDER_INVESTIGATION',
    ];

    return {
      total: pagination?.total ?? complaints.length,
      active: complaints.filter((complaint) => activeStatuses.includes(complaint.status)).length,
      awaitingVendor: complaints.filter(
        (complaint) => complaint.status === 'AWAITING_VENDOR_RESPONSE',
      ).length,
      completed: complaints.filter((complaint) =>
        ['RESOLVED', 'DISMISSED', 'CLOSED'].includes(complaint.status),
      ).length,
    };
  }, [complaints, pagination?.total]);

  const filtersAreActive = statusFilter !== 'ALL' || typeFilter !== 'ALL';

  const selectedComplaint = complaintDetailQuery.data;

  function openComplaintDetails(complaint: Complaint) {
    replyMutation.reset();
    closeMutation.reset();
    setSelectedComplaintId(complaint.id);
  }

  function closeComplaintDetails() {
    if (replyMutation.isPending || closeMutation.isPending) {
      return;
    }

    replyMutation.reset();
    closeMutation.reset();
    setSelectedComplaintId(null);
  }

  function clearFilters() {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setPage(1);
  }

  return (
    <main className="workspace-shell relative">
      <div className="workspace-container w-full max-w-7xl">
        <header className="relative overflow-visible rounded-[1.75rem] border border-white/55 bg-white/34 p-4 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative flex items-center gap-4">
            <PageBackButton fallback="/vendor/dashboard" label="Dashboard" className="shrink-0" />

            <div className="min-w-0 border-l border-[rgba(93,58,85,0.12)] pl-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <h1 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-2xl">
                Complaint management
              </h1>
            </div>
          </div>
        </header>

        <div className="pb-10 pt-6">
          <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_24px_70px_rgba(64,42,51,0.10)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-[rgba(183,167,200,0.23)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 left-[30%] size-72 rounded-full bg-[rgba(214,190,177,0.12)] blur-3xl"
            />

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-10 lg:p-10">
              <div>
                <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <ShieldAlert className="size-4" />
                  Support cases
                </div>

                <h2 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                  Keep every customer concern clear, documented and moving.
                </h2>

                <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66">
                  Review complaint status, respond when more information is requested, and follow
                  each case through investigation and resolution.
                </p>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  <span className="soft-chip text-xs font-black">
                    <MessageSquareWarning className="size-4" />
                    {complaintsQuery.isLoading ? '—' : summary.total} total
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <ShieldAlert className="size-4" />
                    {complaintsQuery.isLoading ? '—' : summary.active} active
                  </span>

                  <span className="soft-chip text-xs font-black">
                    Awaiting your response{' '}
                    {complaintsQuery.isLoading ? '—' : summary.awaitingVendor}
                  </span>
                </div>
              </div>

              <article className="relative overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/52 p-5 shadow-[0_18px_52px_rgba(31,27,29,0.08)] backdrop-blur-2xl sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.17)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Case overview
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Support workload
                      </h3>
                    </div>

                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <MessageSquareWarning className="size-5" />
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                    Keep an eye on unresolved cases and anything currently waiting for your
                    response.
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                      <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                        Active
                      </p>

                      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {complaintsQuery.isLoading ? '—' : summary.active}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/46">
                        Still in progress
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                      <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                        Awaiting you
                      </p>

                      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {complaintsQuery.isLoading ? '—' : summary.awaitingVendor}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/46">
                        Need your response
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                          Resolved / closed
                        </p>

                        <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          {complaintsQuery.isLoading ? '—' : summary.completed}
                        </p>
                      </div>

                      <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                        <ShieldAlert className="size-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          {complaintsQuery.isLoading ? (
            <section className="mt-6 grid min-h-[360px] place-items-center rounded-[2rem] border border-white/58 bg-white/42 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl">
              <div className="text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                  <LoaderCircle className="size-6 animate-spin" />
                </div>

                <p className="mt-5 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                  Loading your support cases
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/52">
                  Preparing complaint history and the latest updates.
                </p>
              </div>
            </section>
          ) : complaintsQuery.isError ? (
            <section className="mt-6 grid min-h-72 place-items-center rounded-[2rem] border border-red-200/70 bg-red-50/55 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.06)]">
              <div className="max-w-lg">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-red-900">
                  Complaints could not be loaded
                </h2>

                <p className="mt-3 text-sm leading-7 text-red-700">
                  {getErrorMessage(complaintsQuery.error)}
                </p>

                <button
                  type="button"
                  onClick={() => complaintsQuery.refetch()}
                  className="mt-6 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white transition hover:bg-red-800"
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <section className="mt-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="section-eyebrow">Complaint history</p>

                  <h2 className="section-title">Support case timeline</h2>

                  <p className="section-description max-w-2xl">
                    Review current status, administrator updates, and the full conversation for
                    every complaint connected to your vendor account.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="soft-chip text-xs font-black">
                    <MessageSquareWarning className="size-4" />
                    {summary.total} total
                  </span>

                  {pagination ? (
                    <span className="soft-chip text-xs font-black">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.85rem] border border-white/58 bg-white/42 p-4 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl"
                />

                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <select
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value as ComplaintStatus | 'ALL');
                        setPage(1);
                      }}
                      className="rounded-full border border-white/60 bg-white/36 px-4 py-3 text-sm font-black text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(91,61,82,0.28)] focus:bg-white/56 focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
                    >
                      <option value="ALL">All statuses</option>

                      {complaintStatuses.map((status) => (
                        <option key={status} value={status}>
                          {complaintStatusLabels[status]}
                        </option>
                      ))}
                    </select>

                    <select
                      value={typeFilter}
                      onChange={(event) => {
                        setTypeFilter(event.target.value as ComplaintType | 'ALL');
                        setPage(1);
                      }}
                      className="rounded-full border border-white/60 bg-white/36 px-4 py-3 text-sm font-black text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(91,61,82,0.28)] focus:bg-white/56 focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
                    >
                      <option value="ALL">All complaint types</option>

                      {complaintTypes.map((type) => (
                        <option key={type} value={type}>
                          {complaintTypeLabels[type]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="btn-secondary w-fit text-sm font-black"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>

              {complaints.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {complaints.map((complaint) => (
                    <ComplaintCard
                      key={complaint.id}
                      complaint={complaint}
                      onView={openComplaintDetails}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-5 grid min-h-72 place-items-center rounded-[2rem] border border-white/60 bg-white/44 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl">
                  <div className="max-w-lg">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <MessageSquareWarning className="size-6" />
                    </div>

                    <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {filtersAreActive
                        ? 'No complaints match these filters'
                        : 'No support cases yet'}
                    </h3>

                    <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--color-charcoal)]/58">
                      {filtersAreActive
                        ? 'Change the current status or complaint type to see other cases.'
                        : 'Support cases involving your vendor account will appear here.'}
                    </p>

                    {filtersAreActive ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="btn-primary mt-6 text-sm font-black"
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {pagination && pagination.totalPages > 1 ? (
                <div className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-white/58 bg-white/42 p-4 shadow-[0_16px_42px_rgba(35,24,30,0.06)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Showing {complaints.length} of {pagination.total} cases
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/46">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!pagination.hasPreviousPage || complaintsQuery.isFetching}
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/36 px-4 py-2.5 text-sm font-black text-[var(--color-charcoal)] transition hover:bg-white/56 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </button>

                    <span className="grid min-w-10 place-items-center rounded-full bg-[var(--color-deep-plum)] px-3 py-2.5 text-sm font-black text-white">
                      {pagination.page}
                    </span>

                    <button
                      type="button"
                      disabled={!pagination.hasNextPage || complaintsQuery.isFetching}
                      onClick={() => setPage((currentPage) => currentPage + 1)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/36 px-4 py-2.5 text-sm font-black text-[var(--color-charcoal)] transition hover:bg-white/56 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          )}
        </div>

        {selectedComplaintId && complaintDetailQuery.isLoading ? (
          <div
            className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label="Loading complaint details"
          >
            <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/75 bg-white/90 p-8 text-center shadow-[0_32px_90px_rgba(38,24,31,0.24)] backdrop-blur-2xl sm:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
              />

              <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                <LoaderCircle className="size-6 animate-spin" />
              </div>

              <p className="relative mt-5 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                Opening complaint details
              </p>

              <p className="relative mt-3 text-sm leading-7 text-[var(--color-charcoal)]/58">
                Loading the conversation and complete case timeline.
              </p>
            </div>
          </div>
        ) : null}

        {selectedComplaintId && complaintDetailQuery.isError ? (
          <div
            className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-complaint-error-title"
          >
            <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/75 bg-white/90 p-8 text-center shadow-[0_32px_90px_rgba(38,24,31,0.24)] backdrop-blur-2xl sm:p-10">
              <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
                <AlertCircle className="size-6" />
              </div>

              <h2
                id="vendor-complaint-error-title"
                className="relative mt-5 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]"
              >
                Complaint details unavailable
              </h2>

              <p className="relative mt-3 text-sm leading-7 text-[var(--color-charcoal)]/62">
                {getErrorMessage(complaintDetailQuery.error)}
              </p>

              <div className="relative mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeComplaintDetails}
                  className="btn-secondary justify-center text-sm font-black"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => complaintDetailQuery.refetch()}
                  className="rounded-full bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.2)] transition hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {selectedComplaint && currentUserId ? (
          <ComplaintDetailsDialog
            complaint={selectedComplaint}
            currentUserId={currentUserId}
            replySuccessCount={replySuccessCount}
            isReplyPending={replyMutation.isPending}
            isClosePending={closeMutation.isPending}
            replyErrorMessage={replyMutation.isError ? getErrorMessage(replyMutation.error) : null}
            closeErrorMessage={closeMutation.isError ? getErrorMessage(closeMutation.error) : null}
            onClose={closeComplaintDetails}
            onReply={(body) => {
              replyMutation.mutate({
                complaintId: selectedComplaint.id,
                body,
              });
            }}
            onCloseComplaint={(reason) => {
              closeMutation.mutate({
                complaintId: selectedComplaint.id,
                reason,
              });
            }}
          />
        ) : null}

        {selectedComplaint && !currentUserId ? (
          <div
            className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/75 bg-white/90 p-8 text-center shadow-[0_32px_90px_rgba(38,24,31,0.24)] backdrop-blur-2xl sm:p-10">
              <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
                <AlertCircle className="size-6" />
              </div>

              <p className="relative mt-5 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                Session information unavailable
              </p>

              <p className="relative mt-3 text-sm leading-7 text-[var(--color-charcoal)]/62">
                Log in again so the complaint conversation can identify your messages correctly.
              </p>

              <button
                type="button"
                onClick={closeComplaintDetails}
                className="relative mt-6 rounded-full bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.2)] transition hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
