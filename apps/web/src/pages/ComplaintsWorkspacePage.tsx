import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, LoaderCircle, MessageSquareWarning, Plus, ShieldAlert } from 'lucide-react';
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
  type Complaint,
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
import { PageBackButton } from '../components/navigation/PageBackButton';

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

  const openComplaintDetails = (complaint: Complaint) => {
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
          <div className="flex items-start gap-4">
            <PageBackButton
              fallback={`/events/${eventId}`}
              label="Event workspace"
              className="shrink-0"
            />

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
          <section className="relative overflow-hidden rounded-[2.75rem] border border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.36),rgba(255,255,255,0.15))] px-7 py-10 shadow-[0_24px_80px_rgba(31,27,29,0.08)] backdrop-blur-3xl sm:px-10 lg:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 top-0 size-80 rounded-full bg-[rgba(183,167,200,0.26)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-[-5%] top-[-12%] size-[28rem] rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[-24%] left-[32%] size-72 rounded-full bg-[rgba(245,214,218,0.18)] blur-3xl"
            />

            <div className="relative grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <MessageSquareWarning aria-hidden="true" className="size-4" />
                  Support & resolution
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[var(--color-near-black)] sm:text-6xl">
                  Every concern,
                  <br />
                  clearly followed through.
                </h2>

                <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--color-charcoal)]/68">
                  Submit complaints against bookings, payments, reviews and quotations, then follow
                  every support update until the case is resolved.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-white/50 bg-white/30 px-5 py-4 backdrop-blur-xl">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/45">
                      Active cases
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {complaintSummary.active}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/50 bg-white/30 px-5 py-4 backdrop-blur-xl">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/45">
                      Awaiting you
                    </p>

                    <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {complaintSummary.awaitingResponse}
                    </p>
                  </div>
                </div>
              </div>

              <aside className="group/complaint-health relative overflow-hidden rounded-[2.2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-7 text-[#fffaf5] shadow-[0_28px_80px_rgba(93,58,85,0.30)] transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_34px_92px_rgba(93,58,85,0.35)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-white/10 blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl border border-white/14 bg-white/10 text-[var(--color-powder-blue)] shadow-[0_12px_28px_rgba(31,27,29,0.12)] backdrop-blur transition duration-300 group-hover/complaint-health:-translate-y-0.5 group-hover/complaint-health:scale-105">
                      <MessageSquareWarning aria-hidden="true" className="size-6" />
                    </div>

                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/74 backdrop-blur">
                      {complaintSummary.active > 0 ? 'Cases active' : 'All settled'}
                    </span>
                  </div>

                  <p className="mt-8 text-xs font-black uppercase tracking-[0.20em] text-white/48">
                    Support status
                  </p>

                  <p className="mt-3 text-5xl font-black tracking-[-0.055em]">
                    {complaintSummary.active}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white/58">
                    {complaintSummary.active === 1 ? 'Active complaint' : 'Active complaints'}
                  </p>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Total
                      </p>

                      <p className="mt-2 text-2xl font-black">{complaintSummary.total}</p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-[rgba(142,151,115,0.16)] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(142,151,115,0.22)]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Completed
                      </p>

                      <p className="mt-2 text-2xl font-black">{complaintSummary.completed}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="group/hero-new-complaint mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/16 bg-white/12 px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18 hover:shadow-[0_16px_34px_rgba(31,27,29,0.16)]"
                    onClick={() => {
                      createComplaintMutation.reset();
                      setIsCreateOpen(true);
                    }}
                  >
                    <Plus
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/hero-new-complaint:rotate-90"
                    />
                    New complaint
                  </button>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label, value, helper }) => (
              <article
                key={label}
                className={`group/complaint-summary luxe-card relative overflow-hidden border-white/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/92 hover:shadow-[0_28px_70px_rgba(31,27,29,0.12)] ${
                  label === 'Total cases'
                    ? 'bg-white/48 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(226,211,235,0.88))]'
                    : label === 'Active'
                      ? 'bg-white/48 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(239,215,223,0.86))]'
                      : label === 'Awaiting you'
                        ? 'bg-white/48 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(214,231,238,0.86))]'
                        : 'bg-white/48 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(216,226,194,0.86))]'
                }`}
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-14 -top-14 size-40 rounded-full opacity-60 blur-3xl transition duration-500 group-hover/complaint-summary:scale-125 group-hover/complaint-summary:opacity-100 ${
                    label === 'Total cases'
                      ? 'bg-[rgba(164,126,184,0.34)]'
                      : label === 'Active'
                        ? 'bg-[rgba(170,100,117,0.30)]'
                        : label === 'Awaiting you'
                          ? 'bg-[rgba(130,179,201,0.34)]'
                          : 'bg-[rgba(142,151,115,0.34)]'
                  }`}
                />

                <div className="relative">
                  <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.06)] transition duration-300 group-hover/complaint-summary:-translate-y-0.5 group-hover/complaint-summary:scale-110 group-hover/complaint-summary:bg-[rgba(183,167,200,0.34)]">
                    <MessageSquareWarning
                      aria-hidden="true"
                      className="size-5 transition duration-300 group-hover/complaint-summary:rotate-[4deg]"
                    />
                  </div>

                  <p className="mt-8 text-xs font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/48 transition duration-300 group-hover/complaint-summary:text-[var(--color-rosewood)]/76">
                    {label}
                  </p>

                  <p className="mt-3 text-3xl font-black tracking-[-0.055em] text-[var(--color-near-black)] transition duration-300 group-hover/complaint-summary:translate-x-0.5 group-hover/complaint-summary:text-[var(--color-deep-plum)] sm:text-[2.15rem]">
                    {value}
                  </p>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/55 transition duration-300 group-hover/complaint-summary:text-[var(--color-charcoal)]/68">
                    {helper}
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.52),rgba(255,255,255,0.22))] p-6 shadow-[0_22px_64px_rgba(31,27,29,0.07)] backdrop-blur-3xl sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 left-[18%] size-52 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl"
            />

            <div className="relative">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                      <MessageSquareWarning aria-hidden="true" className="size-5" />
                    </div>

                    <span className="status-chip" data-tone="plum">
                      {pagination?.total ?? complaints.length}{' '}
                      {(pagination?.total ?? complaints.length) === 1 ? 'case' : 'cases'}
                    </span>
                  </div>

                  <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Support history
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Complaints linked to this event.
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/58">
                    Filter by status or complaint type to focus on the support cases that matter
                    right now.
                  </p>
                </div>

                <button
                  type="button"
                  className="group/history-new-complaint btn-primary shrink-0 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                  onClick={() => {
                    createComplaintMutation.reset();
                    setIsCreateOpen(true);
                  }}
                >
                  <Plus
                    aria-hidden="true"
                    className="size-4 transition duration-300 group-hover/history-new-complaint:rotate-90"
                  />
                  New complaint
                </button>
              </div>

              <div className="mt-7 rounded-[1.6rem] border border-white/56 bg-white/28 p-5 backdrop-blur-xl">
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                      Case status
                    </span>

                    <select
                      className="form-field min-h-12 transition duration-300 focus:bg-white/52"
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
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                      Complaint type
                    </span>

                    <select
                      className="form-field min-h-12 transition duration-300 focus:bg-white/52"
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
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/52">
                    Showing {complaints.length}{' '}
                    {complaints.length === 1 ? 'complaint' : 'complaints'} on this page
                  </p>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>
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
                <div className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-dashed border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.48),rgba(255,255,255,0.22))] p-8 text-center shadow-[0_16px_42px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-10">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                  />

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-16 -left-12 size-40 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
                  />

                  <div className="relative">
                    <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.06)]">
                      <MessageSquareWarning aria-hidden="true" className="size-8" />
                    </div>

                    <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      {filtersAreActive
                        ? 'No complaints match these filters'
                        : 'No complaints for this event'}
                    </p>

                    <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                      {filtersAreActive
                        ? 'Try changing the case status or complaint type to view other support records.'
                        : 'Create a complaint when you need help with a booking, payment, review or quotation.'}
                    </p>

                    {filtersAreActive ? (
                      <button
                        type="button"
                        className="btn-secondary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="group/first-complaint btn-primary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                        onClick={() => {
                          createComplaintMutation.reset();
                          setIsCreateOpen(true);
                        }}
                      >
                        <Plus
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/first-complaint:rotate-90"
                        />
                        Submit first complaint
                      </button>
                    )}
                  </div>
                </div>
              )}

              {pagination && pagination.totalPages > 1 ? (
                <div className="relative mt-8 overflow-hidden rounded-[1.5rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(228,238,243,0.32))] p-4 shadow-[0_14px_38px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:p-5">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                  />

                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[var(--color-deep-plum)] shadow-[0_8px_20px_rgba(31,27,29,0.05)]">
                        <MessageSquareWarning aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Page {pagination.page} of {pagination.totalPages}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/50">
                          {pagination.total} {pagination.total === 1 ? 'complaint' : 'complaints'}{' '}
                          in total
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                        disabled={!pagination.hasPreviousPage || complaintsQuery.isFetching}
                        onClick={() => {
                          setPage((currentPage) => Math.max(currentPage - 1, 1));
                        }}
                      >
                        Previous
                      </button>

                      <button
                        type="button"
                        className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                        disabled={!pagination.hasNextPage || complaintsQuery.isFetching}
                        onClick={() => {
                          setPage((currentPage) => currentPage + 1);
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
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
          className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-label="Loading complaint details"
        >
          <div className="grid min-h-full place-items-center">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.15rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(240,231,246,0.84))] p-8 text-center shadow-[0_40px_110px_rgba(31,27,29,0.24)] backdrop-blur-3xl sm:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div className="relative">
                <div className="mx-auto grid size-16 place-items-center rounded-3xl border border-white/58 bg-white/34 text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.06)] backdrop-blur-xl">
                  <LoaderCircle className="size-8 animate-spin" />
                </div>

                <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Opening complaint details
                </p>

                <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                  Loading the conversation, connected records and complete case timeline.
                </p>

                <div className="mx-auto mt-7 max-w-sm space-y-3">
                  <div className="h-3 animate-pulse rounded-full bg-[rgba(183,167,200,0.22)]" />
                  <div className="mx-auto h-3 w-4/5 animate-pulse rounded-full bg-[rgba(175,201,216,0.22)]" />
                  <div className="mx-auto h-3 w-3/5 animate-pulse rounded-full bg-white/44" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedComplaintId && complaintDetailQuery.isError ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complaint-detail-error-title"
          onClick={closeComplaintDetails}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-2xl overflow-hidden rounded-[2.15rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(249,235,240,0.84))] p-8 text-center shadow-[0_40px_110px_rgba(31,27,29,0.24)] backdrop-blur-3xl sm:p-10"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="mx-auto grid size-16 place-items-center rounded-3xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.11)] text-[var(--color-muted-burgundy)] shadow-[0_14px_34px_rgba(124,74,90,0.08)]">
                  <AlertCircle aria-hidden="true" className="size-8" />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
                  Support case unavailable
                </p>

                <h2
                  id="complaint-detail-error-title"
                  className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
                >
                  Complaint details could not be opened.
                </h2>

                <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-7 text-[var(--color-charcoal)]/62">
                  The complaint conversation and case timeline could not be loaded. Try again or
                  return to the support history.
                </p>

                <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    onClick={closeComplaintDetails}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="group/retry-complaint-details btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                    onClick={() => {
                      void complaintDetailQuery.refetch();
                    }}
                  >
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/retry-complaint-details:rotate-12"
                    />
                    Try again
                  </button>
                </div>
              </div>
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
          className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complaint-session-error-title"
          onClick={closeComplaintDetails}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-xl overflow-hidden rounded-[2.15rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(249,235,240,0.84))] p-8 text-center shadow-[0_40px_110px_rgba(31,27,29,0.24)] backdrop-blur-3xl sm:p-10"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="mx-auto grid size-16 place-items-center rounded-3xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.11)] text-[var(--color-muted-burgundy)] shadow-[0_14px_34px_rgba(124,74,90,0.08)]">
                  <AlertCircle aria-hidden="true" className="size-8" />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
                  Session unavailable
                </p>

                <h2
                  id="complaint-session-error-title"
                  className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
                >
                  We could not identify your session.
                </h2>

                <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-7 text-[var(--color-charcoal)]/62">
                  Log in again so the complaint conversation can correctly identify your messages
                  and available case actions.
                </p>

                <div className="mt-7 rounded-[1.4rem] border border-white/54 bg-white/32 p-4">
                  <div className="flex items-start gap-3 text-left">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <ShieldAlert aria-hidden="true" className="size-4" />
                    </span>

                    <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                      Your complaint data has not been changed. Close this window and sign in again
                      before continuing.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary mt-7 w-full justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)] sm:w-auto"
                  onClick={closeComplaintDetails}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
