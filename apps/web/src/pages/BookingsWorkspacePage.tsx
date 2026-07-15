import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  Sparkles,
  Store,
  Tags,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  bookingStatuses,
  cancelCustomerBooking,
  getCustomerBookingById,
  getCustomerBookings,
  type BookingSort,
  type BookingStatus,
  type CustomerBooking,
} from '../features/bookings/booking.api';
import { api } from '../lib/api';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type EventSummary = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string;
  status: 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
};

type StatusFilter = BookingStatus | '';

const cancellableStatuses: BookingStatus[] = [
  'AWAITING_VENDOR_CONFIRMATION',
  'CONFIRMED',
  'DEPOSIT_PENDING',
  'ACTIVE',
];

const bookingStatusLabels: Record<BookingStatus, string> = {
  AWAITING_VENDOR_CONFIRMATION: 'Awaiting vendor confirmation',
  CONFIRMED: 'Confirmed',
  DEPOSIT_PENDING: 'Deposit pending',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  DISPUTED: 'Disputed',
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error ? error.message : 'Something went wrong while loading bookings.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'Something went wrong while loading bookings.'
  );
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatLongDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const formatCurrency = (value: string | null) => {
  if (!value) {
    return 'Not specified';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Not specified';
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const getBookingTone = (status: BookingStatus): 'gray' | 'blue' | 'green' | 'plum' | 'rose' => {
  switch (status) {
    case 'COMPLETED':
      return 'green';

    case 'CONFIRMED':
    case 'ACTIVE':
      return 'blue';

    case 'DEPOSIT_PENDING':
    case 'AWAITING_VENDOR_CONFIRMATION':
    case 'DISPUTED':
      return 'plum';

    case 'CANCELLED':
    case 'REJECTED':
      return 'rose';

    default:
      return 'gray';
  }
};

const isCustomerCancellable = (status: BookingStatus) => cancellableStatuses.includes(status);

const getCancellationReason = (booking: CustomerBooking) => {
  if (booking.customerCancellationReason) {
    return {
      label: 'Cancelled by customer',
      reason: booking.customerCancellationReason,
      cancelledAt: booking.customerCancelledAt,
    };
  }

  if (booking.vendorCancellationReason) {
    return {
      label: 'Cancelled by vendor',
      reason: booking.vendorCancellationReason,
      cancelledAt: booking.vendorCancelledAt,
    };
  }

  return null;
};

export function BookingsWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sort, setSort] = useState<BookingSort>('newest');
  const [page, setPage] = useState(1);

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<CustomerBooking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const eventQuery = useQuery({
    queryKey: ['customer', 'events', eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const response = await api.get<ApiSuccessResponse<EventSummary>>(`/events/${eventId}`);

      return response.data.data;
    },
  });

  const bookingsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'bookings',
      {
        page,
        status: statusFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getCustomerBookings({
        eventId: eventId!,
        page,
        limit: 20,
        status: statusFilter || undefined,
        sort,
      }),
  });

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'bookings', 'summary-counts'],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const results = await Promise.all(
        bookingStatuses.map(async (status) => {
          const result = await getCustomerBookings({
            eventId: eventId!,
            status,
            page: 1,
            limit: 1,
            sort: 'newest',
          });

          return [status, result.pagination.total] as const;
        }),
      );

      return Object.fromEntries(results) as Record<BookingStatus, number>;
    },
  });

  const selectedBookingQuery = useQuery({
    queryKey: ['customer', 'bookings', selectedBookingId],
    enabled: Boolean(selectedBookingId),
    queryFn: () => getCustomerBookingById(selectedBookingId!),
  });

  const invalidateBookingQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'bookings'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['customer', 'bookings'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['dashboard', 'customer'],
      }),
    ]);
  };

  const cancelBookingMutation = useMutation({
    mutationFn: async () => {
      if (!bookingToCancel) {
        throw new Error('Booking details are missing.');
      }

      const normalizedReason = cancellationReason.trim();

      if (normalizedReason.length < 10) {
        throw new Error('Cancellation reason must contain at least 10 characters.');
      }

      if (normalizedReason.length > 2000) {
        throw new Error('Cancellation reason cannot exceed 2000 characters.');
      }

      return cancelCustomerBooking(bookingToCancel.id, {
        reason: normalizedReason,
      });
    },

    onSuccess: async (updatedBooking) => {
      queryClient.setQueryData(['customer', 'bookings', updatedBooking.id], updatedBooking);

      setBookingToCancel(null);
      setCancellationReason('');

      await invalidateBookingQueries();
    },
  });

  const closeBookingDetails = () => {
    if (cancelBookingMutation.isPending) {
      return;
    }

    setSelectedBookingId(null);
  };

  const openCancelDialog = (booking: CustomerBooking) => {
    cancelBookingMutation.reset();
    setCancellationReason('');
    setBookingToCancel(booking);
  };

  const closeCancelDialog = () => {
    if (cancelBookingMutation.isPending) {
      return;
    }

    cancelBookingMutation.reset();
    setBookingToCancel(null);
    setCancellationReason('');
  };

  const filtersAreActive = Boolean(statusFilter) || sort !== 'newest';

  const clearFilters = () => {
    setStatusFilter('');
    setSort('newest');
    setPage(1);
  };

  const isLoading = eventQuery.isLoading || bookingsQuery.isLoading || summaryQuery.isLoading;

  const isError = eventQuery.isError || bookingsQuery.isError || summaryQuery.isError;

  const firstError = eventQuery.error ?? bookingsQuery.error ?? summaryQuery.error;

  const bookingCounts = summaryQuery.data;

  const totalBookings = useMemo(() => {
    if (!bookingCounts) {
      return 0;
    }

    return Object.values(bookingCounts).reduce((sum, count) => sum + count, 0);
  }, [bookingCounts]);

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your bookings
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading vendors, service schedules and booking activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !eventQuery.data || !bookingsQuery.data || !bookingCounts) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Booking workspace unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {eventId ? getApiErrorMessage(firstError) : 'The event address is invalid.'}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {eventId ? (
                <button
                  type="button"
                  className="btn-primary text-sm font-bold"
                  onClick={() => {
                    void Promise.all([
                      eventQuery.refetch(),
                      bookingsQuery.refetch(),
                      summaryQuery.refetch(),
                    ]);
                  }}
                >
                  Try again
                </button>
              ) : null}

              <Link to="/events" className="btn-secondary text-sm font-bold">
                <ArrowLeft className="size-4" />
                Back to events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const eventDetails = eventQuery.data;
  const bookings = bookingsQuery.data.bookings;
  const pagination = bookingsQuery.data.pagination;

  const committedCount =
    bookingCounts.CONFIRMED + bookingCounts.DEPOSIT_PENDING + bookingCounts.ACTIVE;

  const summaryCards = [
    {
      label: 'Total bookings',
      value: totalBookings,
      helper: `${bookingCounts.AWAITING_VENDOR_CONFIRMATION} awaiting vendor response`,
      icon: PackageCheck,
    },
    {
      label: 'Committed services',
      value: committedCount,
      helper: 'Confirmed, deposit pending or active',
      icon: CheckCircle2,
    },
    {
      label: 'Deposit pending',
      value: bookingCounts.DEPOSIT_PENDING,
      helper: 'Bookings waiting for deposit progress',
      icon: WalletCards,
    },
    {
      label: 'Completed',
      value: bookingCounts.COMPLETED,
      helper: `${bookingCounts.CANCELLED + bookingCounts.REJECTED} cancelled or rejected`,
      icon: Sparkles,
    },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/events/${eventId}`}
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to event workspace"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Customer bookings
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {eventDetails.name}
              </h1>
            </div>
          </div>

          <span className="status-chip w-fit" data-tone="plum">
            <PackageCheck className="size-4" />
            {totalBookings} bookings
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[7%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  Vendor commitments
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Coordinate every confirmed vendor service.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Track booking confirmations, service schedules, agreed costs and vendor responses
                  from one event-specific workspace.
                </p>
              </div>

              <div className="glass-card p-5">
                <CalendarClock className="size-6 text-[var(--color-deep-plum)]" />

                <p className="mt-6 text-sm font-bold text-[var(--color-charcoal)]/58">Event date</p>

                <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {formatLongDate(eventDetails.eventDate)}
                </p>

                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-rosewood)]">
                  <MapPin className="size-4" />
                  {eventDetails.location}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label, value, helper, icon: Icon }) => (
              <article key={label} className="luxe-card p-6">
                <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <Icon className="size-5" />
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

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.28fr]">
            <article className="glass-card p-6 sm:p-7">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Booking history
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Vendor services for this event.
                </h2>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <select
                  className="form-field min-h-12"
                  aria-label="Filter bookings by status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>

                  {bookingStatuses.map((status) => (
                    <option key={status} value={status}>
                      {bookingStatusLabels[status]}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12"
                  aria-label="Sort bookings"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as BookingSort);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="service_soonest">Service soonest</option>
                  <option value="service_latest">Service latest</option>
                </select>
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

              {bookings.length > 0 ? (
                <div className="mt-8 space-y-4">
                  {bookings.map((booking) => {
                    const servicePackage = booking.acceptedQuotation.quotationRequest.package;

                    return (
                      <article
                        key={booking.id}
                        className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl sm:p-6"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="status-chip"
                                data-tone={getBookingTone(booking.status)}
                              >
                                {bookingStatusLabels[booking.status]}
                              </span>

                              {servicePackage?.category ? (
                                <span className="status-chip" data-tone="gray">
                                  <Tags className="size-3.5" />
                                  {servicePackage.category.name}
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                              {servicePackage?.title ?? 'Custom vendor service'}
                            </h3>

                            <Link
                              to={`/vendors/${booking.vendor.slug}`}
                              className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)]"
                            >
                              <Store className="size-4" />
                              {booking.vendor.businessName}
                            </Link>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-2xl bg-white/28 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                  Agreed cost
                                </p>

                                <p className="mt-2 font-black text-[var(--color-near-black)]">
                                  {formatCurrency(booking.agreedCost)}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-white/28 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                  Deposit
                                </p>

                                <p className="mt-2 font-black text-[var(--color-near-black)]">
                                  {booking.acceptedQuotation.depositAmount
                                    ? formatCurrency(booking.acceptedQuotation.depositAmount)
                                    : 'No deposit'}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-white/28 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                  Service starts
                                </p>

                                <p className="mt-2 font-black text-[var(--color-near-black)]">
                                  {formatDateTime(booking.serviceStart)}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-white/28 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                  Created
                                </p>

                                <p className="mt-2 font-black text-[var(--color-near-black)]">
                                  {formatDateTime(booking.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:flex-col">
                            <button
                              type="button"
                              className="btn-secondary justify-center text-sm font-bold"
                              onClick={() => {
                                setSelectedBookingId(booking.id);
                              }}
                            >
                              <FileText className="size-4" />
                              View details
                            </button>

                            {isCustomerCancellable(booking.status) ? (
                              <button
                                type="button"
                                className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(124,74,90,0.26)] bg-[rgba(124,74,90,0.10)] px-5 py-3 text-sm font-black text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
                                onClick={() => {
                                  openCancelDialog(booking);
                                }}
                              >
                                <Ban className="size-4" />
                                Cancel booking
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <PackageCheck className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    {filtersAreActive ? 'No bookings match this filter' : 'No bookings created yet'}
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    {filtersAreActive
                      ? 'Try changing the booking status or sorting option.'
                      : 'Accept a vendor quotation and create a booking request from the quotation workflow.'}
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
                    <Link
                      to={`/events/${eventId}/quotations`}
                      className="btn-primary mt-5 text-sm font-bold"
                    >
                      <ReceiptText className="size-4" />
                      Open quotations
                    </Link>
                  )}
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} bookings)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || bookingsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || bookingsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => currentPage + 1);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </article>

            <aside className="space-y-5">
              <article className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <PackageCheck className="size-6 text-[var(--color-powder-blue)]" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Booking progress</h2>

                <p className="mt-3 leading-7 text-white/68">
                  Follow each vendor commitment from confirmation through payment readiness and
                  service completion.
                </p>

                <div className="mt-8 space-y-3">
                  {[
                    {
                      label: 'Awaiting response',
                      value: bookingCounts.AWAITING_VENDOR_CONFIRMATION,
                    },
                    {
                      label: 'Deposit pending',
                      value: bookingCounts.DEPOSIT_PENDING,
                    },
                    {
                      label: 'Active',
                      value: bookingCounts.ACTIVE,
                    },
                    {
                      label: 'Completed',
                      value: bookingCounts.COMPLETED,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl bg-white/14 px-4 py-3 backdrop-blur"
                    >
                      <span className="text-sm font-bold text-white/72">{label}</span>

                      <span className="text-lg font-black">{value}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card p-6">
                <Clock3 className="size-6 text-[var(--color-deep-plum)]" />

                <h2 className="mt-6 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Booking lifecycle
                </h2>

                <div className="mt-4 space-y-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  <p>The vendor first confirms or rejects the request.</p>
                  <p>A required deposit may move the booking into deposit pending.</p>
                  <p>Active bookings represent committed vendor services.</p>
                  <p>The vendor marks the booking completed after delivery.</p>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>

      {selectedBookingId ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-details-title"
        >
          <div className="mx-auto max-w-5xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <PackageCheck className="size-4" />
                    Booking overview
                  </div>

                  <h2
                    id="booking-details-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    Booking details
                  </h2>

                  <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                    Review the vendor, service schedule, pricing and accepted quotation.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
                  aria-label="Close booking details"
                  onClick={closeBookingDetails}
                >
                  <X className="size-5" />
                </button>
              </div>

              {selectedBookingQuery.isLoading ? (
                <div className="mt-8 grid min-h-64 place-items-center rounded-2xl bg-white/18">
                  <LoaderCircle className="size-8 animate-spin text-[var(--color-deep-plum)]" />
                </div>
              ) : null}

              {selectedBookingQuery.isError ? (
                <div
                  role="alert"
                  className="mt-8 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                >
                  {getApiErrorMessage(selectedBookingQuery.error)}
                </div>
              ) : null}

              {selectedBookingQuery.data ? (
                <BookingDetails booking={selectedBookingQuery.data} onCancel={openCancelDialog} />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {bookingToCancel ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-booking-title"
        >
          <div className="glass-card w-full max-w-xl p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Ban className="size-7" />
            </div>

            <h2
              id="cancel-booking-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Cancel this booking?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              This will cancel the booking with{' '}
              <strong>{bookingToCancel.vendor.businessName}</strong>. The vendor will be notified
              with your reason.
            </p>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Cancellation reason
              </span>

              <textarea
                className="form-field min-h-36 resize-y"
                maxLength={2000}
                value={cancellationReason}
                disabled={cancelBookingMutation.isPending}
                placeholder="Explain why this booking needs to be cancelled."
                onChange={(event) => {
                  cancelBookingMutation.reset();
                  setCancellationReason(event.target.value);
                }}
              />

              <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/48">
                Minimum 10 characters. {cancellationReason.length}/2000
              </p>
            </label>

            {cancelBookingMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(cancelBookingMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={cancelBookingMutation.isPending}
                onClick={closeCancelDialog}
              >
                Keep booking
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={cancelBookingMutation.isPending}
                onClick={() => {
                  cancelBookingMutation.mutate();
                }}
              >
                {cancelBookingMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Ban className="size-4" />
                )}

                {cancelBookingMutation.isPending ? 'Cancelling booking...' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BookingDetails({
  booking,
  onCancel,
}: {
  booking: CustomerBooking;
  onCancel: (booking: CustomerBooking) => void;
}) {
  const servicePackage = booking.acceptedQuotation.quotationRequest.package;
  const cancellation = getCancellationReason(booking);

  return (
    <div className="mt-8 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-chip" data-tone={getBookingTone(booking.status)}>
          {bookingStatusLabels[booking.status]}
        </span>

        {servicePackage?.category ? (
          <span className="status-chip" data-tone="gray">
            <Tags className="size-3.5" />
            {servicePackage.category.name}
          </span>
        ) : null}
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
          <Store className="size-6 text-[var(--color-deep-plum)]" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
            Vendor
          </p>

          <h3 className="mt-3 text-2xl font-black text-[var(--color-near-black)]">
            {booking.vendor.businessName}
          </h3>

          <div className="mt-4 space-y-3 text-sm font-semibold text-[var(--color-charcoal)]/64">
            {booking.vendor.baseLocation ? (
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-[var(--color-rosewood)]" />
                {booking.vendor.baseLocation}
              </p>
            ) : null}

            {booking.vendor.contactPhone ? (
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-[var(--color-rosewood)]" />
                {booking.vendor.contactPhone}
              </p>
            ) : null}
          </div>

          <Link
            to={`/vendors/${booking.vendor.slug}`}
            className="btn-secondary mt-5 w-fit text-sm font-bold"
          >
            View vendor
          </Link>
        </article>

        <article className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
          <CalendarClock className="size-6 text-[var(--color-deep-plum)]" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
            Service schedule
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/28 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-50">Starts</p>

              <p className="mt-2 font-black text-[var(--color-near-black)]">
                {formatDateTime(booking.serviceStart)}
              </p>
            </div>

            <div className="rounded-2xl bg-white/28 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-50">Ends</p>

              <p className="mt-2 font-black text-[var(--color-near-black)]">
                {booking.serviceEnd ? formatDateTime(booking.serviceEnd) : 'Not specified'}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
        <ReceiptText className="size-6 text-[var(--color-deep-plum)]" />

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
              Accepted quotation
            </p>

            <h3 className="mt-3 text-2xl font-black text-[var(--color-near-black)]">
              {servicePackage?.title ?? 'Custom vendor service'}
            </h3>

            <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/58">
              Quotation version {booking.acceptedQuotation.version}
            </p>
          </div>

          <span className="text-xl font-black text-[var(--color-near-black)]">
            {formatCurrency(booking.agreedCost)}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/28 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-50">
              Proposed price
            </p>

            <p className="mt-2 font-black text-[var(--color-near-black)]">
              {formatCurrency(booking.acceptedQuotation.proposedPrice)}
            </p>
          </div>

          <div className="rounded-2xl bg-white/28 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-50">Deposit</p>

            <p className="mt-2 font-black text-[var(--color-near-black)]">
              {booking.acceptedQuotation.depositAmount
                ? formatCurrency(booking.acceptedQuotation.depositAmount)
                : 'No deposit'}
            </p>
          </div>

          <div className="rounded-2xl bg-white/28 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-50">Base package</p>

            <p className="mt-2 font-black text-[var(--color-near-black)]">
              {formatCurrency(servicePackage?.basePrice ?? null)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-black text-[var(--color-charcoal)]/58">Inclusions</p>

          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
            {booking.acceptedQuotation.inclusions}
          </p>
        </div>

        {booking.acceptedQuotation.exclusions ? (
          <div className="mt-5">
            <p className="text-sm font-black text-[var(--color-charcoal)]/58">Exclusions</p>

            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
              {booking.acceptedQuotation.exclusions}
            </p>
          </div>
        ) : null}

        {booking.acceptedQuotation.terms ? (
          <div className="mt-5">
            <p className="text-sm font-black text-[var(--color-charcoal)]/58">Terms</p>

            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
              {booking.acceptedQuotation.terms}
            </p>
          </div>
        ) : null}
      </section>

      {booking.vendorResponseNote ? (
        <section className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
            Vendor response
          </p>

          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
            {booking.vendorResponseNote}
          </p>

          {booking.vendorRespondedAt ? (
            <p className="mt-3 text-xs font-bold text-[var(--color-charcoal)]/46">
              Responded {formatDateTime(booking.vendorRespondedAt)}
            </p>
          ) : null}
        </section>
      ) : null}

      {cancellation ? (
        <section className="rounded-[1.65rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.08)] p-5 sm:p-6">
          <Ban className="size-6 text-[var(--color-muted-burgundy)]" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
            {cancellation.label}
          </p>

          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
            {cancellation.reason}
          </p>

          {cancellation.cancelledAt ? (
            <p className="mt-3 text-xs font-bold text-[var(--color-charcoal)]/46">
              {formatDateTime(cancellation.cancelledAt)}
            </p>
          ) : null}
        </section>
      ) : null}

      {booking.vendorCompletedAt ? (
        <section className="rounded-[1.65rem] border border-[rgba(89,133,113,0.22)] bg-[rgba(89,133,113,0.08)] p-5 sm:p-6">
          <CheckCircle2 className="size-6 text-[#3f735d]" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[#3f735d]">
            Service completed
          </p>

          <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/68">
            The vendor marked this booking as completed on{' '}
            {formatDateTime(booking.vendorCompletedAt)}.
          </p>
        </section>
      ) : null}

      {isCustomerCancellable(booking.status) ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(124,74,90,0.26)] bg-[rgba(124,74,90,0.10)] px-5 py-3 text-sm font-black text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
            onClick={() => {
              onCancel(booking);
            }}
          >
            <Ban className="size-4" />
            Cancel booking
          </button>
        </div>
      ) : null}
    </div>
  );
}
