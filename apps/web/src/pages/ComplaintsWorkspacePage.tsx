import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, LoaderCircle, MessageSquareWarning, Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getCurrentUserId } from '../features/auth/auth.storage';

import {
  addComplaintMessage,
  closeComplaint,
  complaintStatuses,
  complaintTypes,
  createComplaint,
  getComplaintById,
  getMyComplaints,
  type ComplaintStatus,
  type ComplaintType,
  type CustomerComplaint,
} from '../features/complaints/complaint.api';

import { ComplaintCard } from '../features/complaints/ComplaintCard';

import { ComplaintDetailsDialog } from '../features/complaints/ComplaintDetailsDialog';

import {
  ComplaintFormDialog,
  type ComplaintResourceOption,
} from '../features/complaints/ComplaintFormDialog';

import { getCustomerBookings } from '../features/bookings/booking.api';
import { getCustomerBookingPayments } from '../features/payments/payment.api';
import { getCustomerReviews } from '../features/reviews/review.api';
import { getQuotationRequests } from '../features/quotationRequests/quotationRequest.api';
import { api } from '../lib/api';

type ComplaintWorkspaceEvent = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string;
};

export function ComplaintsWorkspacePage() {
  const { eventId = '' } = useParams();

  const queryClient = useQueryClient();

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'ALL'>('ALL');

  const [typeFilter, setTypeFilter] = useState<ComplaintType | 'ALL'>('ALL');

  const [page, setPage] = useState(1);

  const currentUserId = getCurrentUserId();

  const eventQuery = useQuery({
    queryKey: ['customer', 'events', eventId],
    enabled: Boolean(eventId),

    queryFn: async () => {
      const response = await api.get<{
        success: true;
        data: ComplaintWorkspaceEvent;
      }>(`/events/${eventId}`);

      return response.data.data;
    },
  });

  const bookingsQuery = useQuery({
    queryKey: ['customer', 'bookings', eventId, 'complaint-options'],
    enabled: Boolean(eventId),

    queryFn: () =>
      getCustomerBookings({
        eventId,
        page: 1,
        limit: 50,
        sort: 'newest',
      }),
  });

  const reviewsQuery = useQuery({
    queryKey: ['customer', 'reviews', eventId, 'complaint-options'],
    enabled: Boolean(eventId),

    queryFn: () =>
      getCustomerReviews({
        eventId,
        page: 1,
        limit: 100,
        sort: 'newest',
      }),
  });

  const quotationRequestsQuery = useQuery({
    queryKey: ['customer', 'quotation-requests', eventId, 'complaint-options'],
    enabled: Boolean(eventId),

    queryFn: () =>
      getQuotationRequests({
        eventId,
        page: 1,
        limit: 100,
        sort: 'newest',
      }),
  });

  const paymentsQuery = useQuery({
    queryKey: [
      'customer',
      'payments',
      eventId,
      'complaint-options',
      bookingsQuery.data?.bookings.map((booking) => booking.id) ?? [],
    ],

    enabled:
      Boolean(eventId) && bookingsQuery.isSuccess && (bookingsQuery.data?.bookings.length ?? 0) > 0,

    queryFn: async () => {
      const bookings = bookingsQuery.data?.bookings ?? [];

      const paymentResults = await Promise.all(
        bookings.map((booking) => getCustomerBookingPayments(booking.id)),
      );

      return paymentResults.flatMap((result) => result.payments);
    },
  });

  const complaintsQuery = useQuery({
    queryKey: [
      'complaints',
      eventId,
      {
        page,
        status: statusFilter,
        type: typeFilter,
      },
    ],

    enabled: Boolean(eventId),

    queryFn: () =>
      getMyComplaints({
        eventId,
        page,
        limit: 20,

        ...(statusFilter !== 'ALL' && {
          status: statusFilter,
        }),

        ...(typeFilter !== 'ALL' && {
          type: typeFilter,
        }),
      }),
  });

  const complaintDetailQuery = useQuery({
    enabled: !!selectedComplaintId,

    queryKey: ['complaint', selectedComplaintId],

    queryFn: () => getComplaintById(selectedComplaintId!),
  });

  const createComplaintMutation = useMutation({
    mutationFn: createComplaint,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['complaints'],
      });

      setIsCreateOpen(false);
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ complaintId, body }: { complaintId: string; body: string }) =>
      addComplaintMessage(complaintId, {
        body,
      }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['complaint', variables.complaintId],
      });

      queryClient.invalidateQueries({
        queryKey: ['complaints'],
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ complaintId, reason }: { complaintId: string; reason?: string }) =>
      closeComplaint(complaintId, {
        reason,
      }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['complaint', variables.complaintId],
      });

      queryClient.invalidateQueries({
        queryKey: ['complaints'],
      });
    },
  });

  const complaints = complaintsQuery.data?.complaints ?? [];

  const pagination = complaintsQuery.data?.pagination;

  const bookingOptions = useMemo<ComplaintResourceOption[]>(() => {
    return (bookingsQuery.data?.bookings ?? []).map((booking) => ({
      id: booking.id,
      label: booking.vendor.businessName,
      description: `${booking.status.replaceAll('_', ' ')} · ${new Intl.DateTimeFormat('en-LK', {
        dateStyle: 'medium',
      }).format(new Date(booking.serviceStart))}`,
    }));
  }, [bookingsQuery.data?.bookings]);

  const paymentOptions = useMemo<ComplaintResourceOption[]>(() => {
    return (paymentsQuery.data ?? []).map((payment) => ({
      id: payment.id,
      label: `${payment.referenceNumber} · ${payment.booking.vendor.businessName}`,
      description: `${payment.method.replaceAll('_', ' ')} · LKR ${Number(
        payment.amount,
      ).toLocaleString('en-LK')} · ${payment.status.replaceAll('_', ' ')}`,
    }));
  }, [paymentsQuery.data]);

  const reviewOptions = useMemo<ComplaintResourceOption[]>(() => {
    return (reviewsQuery.data?.reviews ?? []).map((review) => ({
      id: review.id,
      label: review.vendor.businessName,
      description: `${review.overallRating}/5${review.package ? ` · ${review.package.title}` : ''}`,
    }));
  }, [reviewsQuery.data?.reviews]);

  const quotationOptions = useMemo<ComplaintResourceOption[]>(() => {
    return (quotationRequestsQuery.data?.quotationRequests ?? []).map((quotationRequest) => ({
      id: quotationRequest.id,
      label: quotationRequest.vendor.businessName,
      description: `${
        quotationRequest.package?.title ?? 'Custom quotation'
      } · ${quotationRequest.status.replaceAll('_', ' ')}`,
    }));
  }, [quotationRequestsQuery.data?.quotationRequests]);

  const complaintSummary = useMemo(() => {
    const openStatuses: ComplaintStatus[] = [
      'OPEN',
      'UNDER_REVIEW',
      'UNDER_INVESTIGATION',
      'AWAITING_CUSTOMER_RESPONSE',
      'AWAITING_VENDOR_RESPONSE',
    ];

    return {
      total: pagination?.total ?? complaints.length,

      active: complaints.filter((complaint) => openStatuses.includes(complaint.status)).length,

      awaitingResponse: complaints.filter(
        (complaint) => complaint.status === 'AWAITING_CUSTOMER_RESPONSE',
      ).length,

      completed: complaints.filter((complaint) =>
        ['RESOLVED', 'DISMISSED', 'CLOSED'].includes(complaint.status),
      ).length,
    };
  }, [complaints, pagination?.total]);

  const selectedComplaint = complaintDetailQuery.data;

  const isLoading = complaintsQuery.isLoading;

  const isError = complaintsQuery.isError;

  const filtersAreActive = statusFilter !== 'ALL' || typeFilter !== 'ALL';

  const openComplaintDetails = (complaint: CustomerComplaint) => {
    replyMutation.reset();
    closeMutation.reset();
    setSelectedComplaintId(complaint.id);
  };

  const closeComplaintDetails = () => {
    if (replyMutation.isPending || closeMutation.isPending) {
      return;
    }

    replyMutation.reset();
    closeMutation.reset();
    setSelectedComplaintId(null);
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your support cases
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading complaints and their current review status.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !complaintsQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
              <AlertCircle className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Complaints workspace unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {eventId
                ? 'We could not load the complaints connected to this event.'
                : 'The event address is invalid.'}
            </p>

            {eventId ? (
              <button
                type="button"
                className="btn-primary mt-6 justify-center text-sm font-bold"
                onClick={() => {
                  void complaintsQuery.refetch();
                }}
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total cases',
      value: complaintSummary.total,
      helper: 'Complaints connected to this event',
    },
    {
      label: 'Active',
      value: complaintSummary.active,
      helper: 'Cases still requiring attention',
    },
    {
      label: 'Awaiting you',
      value: complaintSummary.awaitingResponse,
      helper: 'Cases waiting for your response',
    },
    {
      label: 'Completed',
      value: complaintSummary.completed,
      helper: 'Resolved, dismissed or closed cases',
    },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
              Customer support
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
              Complaints workspace
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
              Raise concerns, follow administrator updates and keep every support conversation in
              one place.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary w-fit justify-center text-sm font-bold"
            onClick={() => {
              createComplaintMutation.reset();
              setIsCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            New complaint
          </button>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[6%] top-5 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.26)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-12 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl" />

            <div className="relative max-w-4xl">
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <MessageSquareWarning className="size-4" />
                Support & resolution
              </div>

              <h2 className="text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                Keep every concern visible until it is resolved.
              </h2>

              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                Submit complaints against bookings, payments, reviews and quotations, then follow
                the full support conversation from one event workspace.
              </p>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label, value, helper }) => (
              <article key={label} className="luxe-card p-6">
                <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <MessageSquareWarning className="size-5" />
                </div>

                <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">{label}</p>

                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {value}
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                  {helper}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-5 glass-card p-6 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Support history
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Complaints linked to this event.
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[34rem]">
                <select
                  className="form-field min-h-12"
                  aria-label="Filter complaints by status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as ComplaintStatus | 'ALL');
                    setPage(1);
                  }}
                >
                  <option value="ALL">All statuses</option>

                  {complaintStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12"
                  aria-label="Filter complaints by type"
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value as ComplaintType | 'ALL');
                    setPage(1);
                  }}
                >
                  <option value="ALL">All complaint types</option>

                  {complaintTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filtersAreActive ? (
              <button
                type="button"
                className="btn-secondary mt-4 text-sm font-bold"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : null}

            {complaints.length > 0 ? (
              <div className="mt-8 space-y-4">
                {complaints.map((complaint) => (
                  <ComplaintCard
                    key={complaint.id}
                    complaint={complaint}
                    onView={openComplaintDetails}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                <MessageSquareWarning className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                  {filtersAreActive
                    ? 'No complaints match these filters'
                    : 'No complaints for this event'}
                </p>

                <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                  {filtersAreActive
                    ? 'Change the status or complaint type filter to see other cases.'
                    : 'Create a complaint when you need help with a booking, payment, review or quotation.'}
                </p>

                {filtersAreActive ? (
                  <button
                    type="button"
                    className="btn-secondary mt-5 text-sm font-bold"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary mt-5 justify-center text-sm font-bold"
                    onClick={() => {
                      createComplaintMutation.reset();
                      setIsCreateOpen(true);
                    }}
                  >
                    <Plus className="size-4" />
                    Submit first complaint
                  </button>
                )}
              </div>
            )}

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                  Page {pagination.page} of {pagination.totalPages}
                  <span className="ml-2 text-[var(--color-charcoal)]/44">
                    ({pagination.total} {pagination.total === 1 ? 'complaint' : 'complaints'})
                  </span>
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={!pagination.hasPreviousPage || complaintsQuery.isFetching}
                    onClick={() => {
                      setPage((currentPage) => Math.max(currentPage - 1, 1));
                    }}
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={!pagination.hasNextPage || complaintsQuery.isFetching}
                    onClick={() => {
                      setPage((currentPage) => currentPage + 1);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>
      {isCreateOpen ? (
        <ComplaintFormDialog
          eventName={eventQuery.data?.name ?? 'this event'}
          bookingOptions={bookingOptions}
          paymentOptions={paymentOptions}
          reviewOptions={reviewOptions}
          quotationOptions={quotationOptions}
          isPending={createComplaintMutation.isPending}
          errorMessage={
            eventQuery.isError ||
            bookingsQuery.isError ||
            reviewsQuery.isError ||
            quotationRequestsQuery.isError ||
            paymentsQuery.isError
              ? 'Some complaint resources could not be loaded. Close the form and try again.'
              : createComplaintMutation.isError
                ? 'The complaint could not be submitted. Check the selected record and try again.'
                : null
          }
          onClose={() => {
            if (createComplaintMutation.isPending) {
              return;
            }

            createComplaintMutation.reset();
            setIsCreateOpen(false);
          }}
          onSubmit={(input) => {
            createComplaintMutation.mutate(input);
          }}
        />
      ) : null}

      {selectedComplaintId && complaintDetailQuery.isLoading ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Loading complaint details"
        >
          <div className="glass-card grid min-h-72 w-full max-w-2xl place-items-center p-8 text-center">
            <div>
              <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

              <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                Opening complaint details
              </p>

              <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/58">
                Loading the conversation and case timeline.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {selectedComplaintId && complaintDetailQuery.isError ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complaint-detail-error-title"
        >
          <div className="glass-card w-full max-w-2xl p-8 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
              <AlertCircle className="size-7" />
            </div>

            <h2
              id="complaint-detail-error-title"
              className="mt-5 text-2xl font-black text-[var(--color-near-black)]"
            >
              Complaint details unavailable
            </h2>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/64">
              The complaint conversation could not be loaded.
            </p>

            <div className="mt-6 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                onClick={closeComplaintDetails}
              >
                Close
              </button>

              <button
                type="button"
                className="btn-primary justify-center text-sm font-bold"
                onClick={() => {
                  void complaintDetailQuery.refetch();
                }}
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
          isReplyPending={replyMutation.isPending}
          isClosePending={closeMutation.isPending}
          replyErrorMessage={
            replyMutation.isError ? 'The message could not be sent. Please try again.' : null
          }
          closeErrorMessage={
            closeMutation.isError ? 'The complaint could not be closed. Please try again.' : null
          }
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
          className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card w-full max-w-xl p-8 text-center">
            <AlertCircle className="mx-auto size-9 text-[var(--color-muted-burgundy)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Session information unavailable
            </p>

            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
              Log in again so the complaint conversation can identify your messages correctly.
            </p>

            <button
              type="button"
              className="btn-secondary mt-6 justify-center text-sm font-bold"
              onClick={closeComplaintDetails}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
