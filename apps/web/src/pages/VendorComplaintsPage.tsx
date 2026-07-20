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
    <article className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-[0_14px_45px_rgba(64,42,51,0.06)] backdrop-blur-xl">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
        <MessageSquareWarning className="h-5 w-5" />
      </div>

      <p className="mt-6 text-sm font-semibold text-zinc-500">{label}</p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#34282e]">{value}</p>

      <p className="mt-2 text-sm leading-6 text-zinc-500">{helper}</p>
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
    <main className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-5" />
            </Link>

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

        <section className="glass-card mt-10 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <ShieldAlert className="size-4" />
                Complaints
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                Support cases and resolutions
              </h1>

              <p className="mt-4 max-w-2xl leading-7 text-[var(--color-charcoal)]/68">
                Track support cases, respond when administrators request additional information, and
                close complaints once issues are resolved.
              </p>
            </div>

            <div className="rounded-2xl border border-white/55 bg-white/28 px-5 py-4">
              <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {complaintsQuery.isLoading ? '—' : summary.total}
              </p>

              <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">
                Support cases
              </p>
            </div>
          </div>
        </section>

        {complaintsQuery.isLoading ? (
          <section className="mt-6 flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/80 bg-white/70">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-rose-700" />

              <p className="mt-4 text-sm font-medium text-zinc-500">Loading your support cases…</p>
            </div>
          </section>
        ) : complaintsQuery.isError ? (
          <section className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h2 className="mt-4 text-lg font-semibold text-red-900">
              Complaints could not be loaded
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
              {getErrorMessage(complaintsQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => complaintsQuery.refetch()}
              className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
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

            <section className="mt-6 rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    Complaint History
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#34282e]">
                    Support Case Timeline
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                    Review complaint status, administrator updates, and the complete message
                    timeline.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[34rem]">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as ComplaintStatus | 'ALL');
                      setPage(1);
                    }}
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
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
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
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
                  className="mt-4 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800"
                >
                  Clear filters
                </button>
              )}

              {complaints.length > 0 ? (
                <div className="mt-7 space-y-4">
                  {complaints.map((complaint) => (
                    <ComplaintCard
                      key={complaint.id}
                      complaint={complaint}
                      onView={openComplaintDetails}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-7 rounded-[24px] border border-dashed border-zinc-300 bg-white/60 p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                    <MessageSquareWarning className="h-6 w-6" />
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-[#34282e]">
                    {filtersAreActive
                      ? 'No complaints match these filters'
                      : 'No support cases yet'}
                  </h3>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
                    {filtersAreActive
                      ? 'Change the status or complaint type filter to see other cases.'
                      : 'Support cases involving your vendor account will appear here.'}
                  </p>

                  {filtersAreActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-5 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-sm sm:flex-row">
                  <div>
                    <p className="text-sm font-semibold text-zinc-700">
                      Showing {complaints.length} of {pagination.total} cases
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!pagination.hasPreviousPage || complaintsQuery.isFetching}
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={!pagination.hasNextPage || complaintsQuery.isFetching}
                      onClick={() => setPage((currentPage) => currentPage + 1)}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
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
          className="fixed inset-0 z-[70] grid place-items-center bg-black/45 px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Loading complaint details"
        >
          <div className="w-full max-w-2xl rounded-[28px] border border-white/80 bg-white p-8 text-center shadow-2xl">
            <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-rose-700" />

            <p className="mt-5 text-xl font-semibold text-[#34282e]">Opening complaint details</p>

            <p className="mt-2 text-sm text-zinc-500">
              Loading the conversation and case timeline.
            </p>
          </div>
        </div>
      )}

      {selectedComplaintId && complaintDetailQuery.isError && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/45 px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendor-complaint-error-title"
        >
          <div className="w-full max-w-2xl rounded-[28px] border border-white/80 bg-white p-8 text-center shadow-2xl">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h2
              id="vendor-complaint-error-title"
              className="mt-5 text-xl font-semibold text-red-900"
            >
              Complaint details unavailable
            </h2>

            <p className="mt-3 text-sm leading-6 text-red-700">
              {getErrorMessage(complaintDetailQuery.error)}
            </p>

            <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeComplaintDetails}
                className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => complaintDetailQuery.refetch()}
                className="rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white"
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
          className="fixed inset-0 z-[70] grid place-items-center bg-black/45 px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-[28px] border border-white/80 bg-white p-8 text-center shadow-2xl">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <p className="mt-5 text-xl font-semibold text-[#34282e]">
              Session information unavailable
            </p>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Log in again so the complaint conversation can identify your messages correctly.
            </p>

            <button
              type="button"
              onClick={closeComplaintDetails}
              className="mt-6 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
