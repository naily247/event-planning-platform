import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
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
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';
import { Link } from 'react-router-dom';
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
    <main className="workspace-shell">
      <div className="workspace-container w-full max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PageBackButton fallback="/vendor/dashboard" label="Dashboard" className="shrink-0" />

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <p className="mt-1 font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                Complaint management
              </p>
            </div>
          </div>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <section className="glass-card relative mt-10 overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/42 px-4 py-2 text-sm font-black text-[var(--color-rosewood)] shadow-sm backdrop-blur-xl">
                <ShieldAlert className="size-4" />
                Complaints
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl lg:text-5xl">
                Support cases and resolutions
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                Track every support case, respond when administrators request more information, and
                monitor resolutions from one organised workspace.
              </p>
            </div>

            <div className="relative min-w-[230px] overflow-hidden rounded-[1.6rem] border border-white/65 bg-white/42 p-5 shadow-[0_18px_46px_rgba(64,42,51,0.08)] backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[rgba(183,167,200,0.18)] blur-2xl" />

              <div className="relative flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
                  <MessageSquareWarning className="size-5" />
                </div>

                <div>
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {complaintsQuery.isLoading ? '—' : summary.total}
                  </p>

                  <p className="mt-1 text-xs font-bold leading-5 text-[var(--color-charcoal)]/52">
                    Support cases
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {complaintsQuery.isLoading ? (
          <section className="glass-card relative mt-6 flex min-h-[420px] items-center justify-center overflow-hidden">
            <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-[rgba(214,190,177,0.12)] blur-3xl" />

            <div className="relative text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_14px_34px_rgba(91,61,82,0.2)]">
                <LoaderCircle className="size-6 animate-spin" />
              </div>

              <p className="mt-5 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                Loading your support cases
              </p>

              <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/52">
                Preparing your complaint history and latest updates.
              </p>
            </div>
          </section>
        ) : complaintsQuery.isError ? (
          <section className="glass-card relative mt-6 overflow-hidden p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-red-100/70 blur-3xl" />

            <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="size-6" />
            </div>

            <h2 className="relative mt-5 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              Complaints could not be loaded
            </h2>

            <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--color-charcoal)]/62">
              {getErrorMessage(complaintsQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => complaintsQuery.refetch()}
              className="relative mt-6 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="All Cases"
                value={summary.total}
                helper="All complaints connected to your vendor account"
              />

              <SummaryCard
                label="Active Cases"
                value={summary.active}
                helper="Cases still under review or investigation"
              />

              <SummaryCard
                label="Awaiting Response"
                value={summary.awaitingVendor}
                helper="Cases currently waiting for your response"
              />

              <SummaryCard
                label="Resolved Cases"
                value={summary.completed}
                helper="Resolved, dismissed, or closed cases"
              />
            </section>

            <section className="glass-card relative mt-6 overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 size-52 rounded-full bg-[rgba(214,190,177,0.12)] blur-3xl" />

              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42">
                    Complaint history
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                    Support case timeline
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--color-charcoal)]/60">
                    Review case status, administrator updates, and the complete message timeline for
                    every complaint connected to your vendor account.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[34rem]">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as ComplaintStatus | 'ALL');
                      setPage(1);
                    }}
                    className="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm font-black text-[var(--color-near-black)] outline-none shadow-sm transition duration-300 focus:border-[rgba(183,167,200,0.75)] focus:bg-white focus:ring-4 focus:ring-[rgba(183,167,200,0.18)]"
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
                    className="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm font-black text-[var(--color-near-black)] outline-none shadow-sm transition duration-300 focus:border-[rgba(183,167,200,0.75)] focus:bg-white focus:ring-4 focus:ring-[rgba(183,167,200,0.18)]"
                  >
                    <option value="ALL">All complaint types</option>

                    {complaintTypes.map((type) => (
                      <option key={type} value={type}>
                        {complaintTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filtersAreActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="relative mt-4 rounded-2xl border border-white/70 bg-white/60 px-5 py-3 text-sm font-black text-[var(--color-near-black)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[var(--color-deep-plum)]"
                >
                  Clear filters
                </button>
              )}

              {complaints.length > 0 ? (
                <div className="relative mt-7 space-y-4">
                  {complaints.map((complaint) => (
                    <ComplaintCard
                      key={complaint.id}
                      complaint={complaint}
                      onView={openComplaintDetails}
                    />
                  ))}
                </div>
              ) : (
                <div className="relative mt-7 overflow-hidden rounded-[1.5rem] border border-dashed border-white/80 bg-white/42 p-10 text-center shadow-inner">
                  <div className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />

                  <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_14px_34px_rgba(91,61,82,0.2)]">
                    <MessageSquareWarning className="size-6" />
                  </div>

                  <h3 className="relative mt-5 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                    {filtersAreActive
                      ? 'No complaints match these filters'
                      : 'No support cases yet'}
                  </h3>

                  <p className="relative mx-auto mt-3 max-w-lg text-sm leading-7 text-[var(--color-charcoal)]/60">
                    {filtersAreActive
                      ? 'Change the status or complaint type filter to see other cases.'
                      : 'Support cases involving your vendor account will appear here.'}
                  </p>

                  {filtersAreActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="relative mt-5 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(91,61,82,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {pagination && pagination.totalPages > 1 && (
                <div className="relative mt-8 flex flex-col items-center justify-between gap-4 rounded-[1.35rem] border border-white/70 bg-white/48 px-5 py-4 shadow-inner sm:flex-row">
                  <div>
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Showing {complaints.length} of {pagination.total} cases
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!pagination.hasPreviousPage || complaintsQuery.isFetching}
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/65 px-4 py-2.5 text-sm font-black text-[var(--color-near-black)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={!pagination.hasNextPage || complaintsQuery.isFetching}
                      onClick={() => setPage((currentPage) => currentPage + 1)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-deep-plum)] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_28px_rgba(91,61,82,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {selectedComplaintId && complaintDetailQuery.isLoading && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Loading complaint details"
        >
          <div className="glass-card relative w-full max-w-2xl overflow-hidden p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />

            <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_14px_34px_rgba(91,61,82,0.2)]">
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
      )}

      {selectedComplaintId && complaintDetailQuery.isError && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendor-complaint-error-title"
        >
          <div className="glass-card relative w-full max-w-2xl overflow-hidden p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-red-100/75 blur-3xl" />

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
                className="rounded-2xl border border-white/70 bg-white/65 px-5 py-3 text-sm font-black text-[var(--color-near-black)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[var(--color-deep-plum)]"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => complaintDetailQuery.refetch()}
                className="rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(91,61,82,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedComplaint && currentUserId && (
        <ComplaintDetailsDialog
          complaint={selectedComplaint}
          currentUserId={currentUserId}
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
      )}

      {selectedComplaint && !currentUserId && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card relative w-full max-w-xl overflow-hidden p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-red-100/75 blur-3xl" />

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
              className="relative mt-6 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(91,61,82,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
