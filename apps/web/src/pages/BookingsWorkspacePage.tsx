import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Landmark,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  Sparkles,
  Star,
  Store,
  Tags,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  bookingStatuses,
  cancelCustomerBooking,
  createCustomerBookingReview,
  getCustomerBookingById,
  getCustomerBookings,
  type BookingSort,
  type BookingStatus,
  type CreateCustomerBookingReviewInput,
  type CustomerBooking,
} from '../features/bookings/booking.api';

import {
  createStripeCheckoutSession,
  getCustomerBookingPayments,
  submitManualPayment,
  submitManualPaymentWithProof,
  type CustomerPayment,
  type PaymentStatus,
} from '../features/payments/payment.api';

import { ReviewFormDialog } from '../features/reviews/ReviewFormDialog';
import { getCustomerReviews } from '../features/reviews/review.api';
import { PageBackButton } from '../components/navigation/PageBackButton';

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

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially refunded',
};

const paymentMethodLabels = {
  BANK_TRANSFER: 'Bank transfer',
  STRIPE_CHECKOUT: 'Stripe checkout',
} as const;

const getPaymentStatusLabel = (payment: CustomerPayment) => {
  if (payment.status === 'PENDING' && payment.method === 'STRIPE_CHECKOUT') {
    return 'Checkout started';
  }

  if (payment.status === 'PENDING' && payment.method === 'BANK_TRANSFER') {
    return 'Pending verification';
  }

  return paymentStatusLabels[payment.status];
};

const getPaymentTone = (status: PaymentStatus): 'gray' | 'blue' | 'green' | 'plum' | 'rose' => {
  switch (status) {
    case 'VERIFIED':
      return 'green';

    case 'PENDING':
      return 'plum';

    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'blue';

    case 'REJECTED':
    case 'CANCELLED':
      return 'rose';

    default:
      return 'gray';
  }
};

const formatFileSize = (size: number | null) => {
  if (size === null) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  const [paymentBooking, setPaymentBooking] = useState<CustomerBooking | null>(null);
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [reviewBooking, setReviewBooking] = useState<CustomerBooking | null>(null);

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

  const eventReviewsQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'reviews', 'booking-actions'],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const firstPage = await getCustomerReviews({
        eventId: eventId!,
        page: 1,
        limit: 100,
        sort: 'newest',
      });

      if (firstPage.pagination.totalPages <= 1) {
        return firstPage.reviews;
      }

      const remainingPages = await Promise.all(
        Array.from(
          {
            length: firstPage.pagination.totalPages - 1,
          },
          (_, index) =>
            getCustomerReviews({
              eventId: eventId!,
              page: index + 2,
              limit: 100,
              sort: 'newest',
            }),
        ),
      );

      return [...firstPage.reviews, ...remainingPages.flatMap((result) => result.reviews)];
    },
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

  const selectedBookingPaymentsQuery = useQuery({
    queryKey: ['customer', 'bookings', selectedBookingId, 'payments'],
    enabled: Boolean(selectedBookingId),
    queryFn: () => getCustomerBookingPayments(selectedBookingId!),
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

  const invalidatePaymentQueries = async (bookingId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['customer', 'bookings', bookingId, 'payments'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['customer', 'bookings', bookingId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'bookings'],
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

  const submitPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentBooking) {
        throw new Error('Booking details are missing.');
      }

      const normalizedReferenceNumber = paymentReferenceNumber.trim();

      if (normalizedReferenceNumber.length < 3) {
        throw new Error('Payment reference number must contain at least 3 characters.');
      }

      if (normalizedReferenceNumber.length > 200) {
        throw new Error('Payment reference number cannot exceed 200 characters.');
      }

      if (paymentProofFile) {
        return submitManualPaymentWithProof(paymentBooking.id, {
          referenceNumber: normalizedReferenceNumber,
          file: paymentProofFile,
        });
      }

      return submitManualPayment(paymentBooking.id, {
        referenceNumber: normalizedReferenceNumber,
      });
    },

    onSuccess: async (payment) => {
      setPaymentBooking(null);
      setPaymentReferenceNumber('');
      setPaymentProofFile(null);

      await invalidatePaymentQueries(payment.bookingId);
    },
  });

  const stripeCheckoutMutation = useMutation({
    mutationFn: async (booking: CustomerBooking) => {
      return createStripeCheckoutSession(booking.id);
    },

    onSuccess: (result) => {
      window.location.assign(result.checkout.checkoutUrl);
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async ({
      booking,
      input,
    }: {
      booking: CustomerBooking;
      input: CreateCustomerBookingReviewInput;
    }) => {
      return createCustomerBookingReview(booking.id, input);
    },

    onSuccess: async () => {
      setReviewBooking(null);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'reviews'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'reviews'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'bookings'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'customer'],
        }),
      ]);
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

  const openPaymentDialog = (booking: CustomerBooking) => {
    submitPaymentMutation.reset();
    setPaymentBooking(booking);
    setPaymentReferenceNumber('');
    setPaymentProofFile(null);
  };

  const closePaymentDialog = () => {
    if (submitPaymentMutation.isPending) {
      return;
    }

    submitPaymentMutation.reset();
    setPaymentBooking(null);
    setPaymentReferenceNumber('');
    setPaymentProofFile(null);
  };

  const openReviewDialog = (booking: CustomerBooking) => {
    createReviewMutation.reset();
    setSelectedBookingId(null);
    setReviewBooking(booking);
  };

  const closeReviewDialog = () => {
    if (createReviewMutation.isPending) {
      return;
    }

    createReviewMutation.reset();
    setReviewBooking(null);
  };

  const filtersAreActive = Boolean(statusFilter) || sort !== 'newest';

  const clearFilters = () => {
    setStatusFilter('');
    setSort('newest');
    setPage(1);
  };

  const isLoading =
    eventQuery.isLoading ||
    bookingsQuery.isLoading ||
    summaryQuery.isLoading ||
    eventReviewsQuery.isLoading;

  const isError =
    eventQuery.isError ||
    bookingsQuery.isError ||
    summaryQuery.isError ||
    eventReviewsQuery.isError;

  const firstError =
    eventQuery.error ?? bookingsQuery.error ?? summaryQuery.error ?? eventReviewsQuery.error;

  const bookingCounts = summaryQuery.data;

  const reviewsByBookingId = useMemo(() => {
    return new Map((eventReviewsQuery.data ?? []).map((review) => [review.bookingId, review]));
  }, [eventReviewsQuery.data]);

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
                      eventReviewsQuery.refetch(),
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
            <PageBackButton
              fallback={`/events/${eventId}`}
              label="Event workspace"
              className="shrink-0"
            />

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

              <div className="mt-7 flex flex-col gap-4 rounded-[1.6rem] border border-white/55 bg-white/22 p-5 backdrop-blur-xl lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/55">
                      Booking status
                    </span>

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
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/55">
                      Sort bookings
                    </span>

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
                  </label>
                </div>

                <div className="flex justify-end lg:pb-[2px]">
                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <div className="rounded-xl bg-[rgba(183,167,200,0.18)] px-4 py-3 text-sm font-bold text-[var(--color-charcoal)]/60">
                      {pagination.total} booking{pagination.total === 1 ? '' : 's'}
                    </div>
                  )}
                </div>
              </div>

              {bookings.length > 0 ? (
                <div className="mt-8 space-y-4">
                  {bookings.map((booking) => {
                    const servicePackage = booking.acceptedQuotation.quotationRequest.package;
                    const existingReview = reviewsByBookingId.get(booking.id);

                    return (
                      <article
                        key={booking.id}
                        className="group relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/26 p-5 shadow-[0_18px_50px_rgba(31,27,29,0.06)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/32 hover:shadow-[0_24px_65px_rgba(31,27,29,0.10)] sm:p-6"
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
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
                              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[rgba(93,58,85,0.07)] px-3 py-2 text-sm font-black text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.12)]"
                            >
                              <Store className="size-4" />
                              {booking.vendor.businessName}
                            </Link>

                            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.15fr_1fr_1.25fr_1fr]">
                              <div className="rounded-2xl border border-white/45 bg-white/30 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                    Agreed cost
                                  </p>

                                  <ReceiptText className="size-4 text-[var(--color-deep-plum)]/70" />
                                </div>

                                <p className="mt-3 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                                  {formatCurrency(booking.agreedCost)}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/45 bg-white/30 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                    Deposit
                                  </p>

                                  <WalletCards className="size-4 text-[var(--color-deep-plum)]/70" />
                                </div>

                                <p className="mt-3 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                                  {booking.acceptedQuotation.depositAmount
                                    ? formatCurrency(booking.acceptedQuotation.depositAmount)
                                    : 'No deposit'}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/45 bg-white/30 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                    Service starts
                                  </p>

                                  <CalendarClock className="size-4 text-[var(--color-deep-plum)]/70" />
                                </div>

                                <p className="mt-3 text-sm font-black leading-6 text-[var(--color-near-black)]">
                                  {formatDateTime(booking.serviceStart)}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/45 bg-white/30 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                                    Created
                                  </p>

                                  <Clock3 className="size-4 text-[var(--color-deep-plum)]/70" />
                                </div>

                                <p className="mt-3 text-sm font-black leading-6 text-[var(--color-near-black)]">
                                  {formatDateTime(booking.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col gap-3 border-t border-white/50 pt-5 sm:flex-row xl:min-w-44 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0 xl:flex-col">
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

                            {booking.status === 'COMPLETED' ? (
                              existingReview ? (
                                <Link
                                  to={`/events/${eventId}/reviews`}
                                  className="btn-secondary justify-center text-sm font-bold"
                                >
                                  <Star className="size-4 fill-current" />
                                  View review
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-primary justify-center text-sm font-bold"
                                  onClick={() => {
                                    openReviewDialog(booking);
                                  }}
                                >
                                  <Star className="size-4 fill-current" />
                                  Write review
                                </button>
                              )
                            ) : null}

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
              <article className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-white/14 backdrop-blur">
                      <PackageCheck className="size-6 text-[var(--color-powder-blue)]" />
                    </div>

                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/74 backdrop-blur">
                      {committedCount} committed
                    </span>
                  </div>

                  <h2 className="mt-7 text-3xl font-black tracking-[-0.045em]">Booking progress</h2>

                  <p className="mt-3 leading-7 text-white/68">
                    Follow every vendor commitment from confirmation and deposit readiness through
                    active service delivery and completion.
                  </p>

                  <div className="mt-8 space-y-3">
                    {[
                      {
                        label: 'Awaiting response',
                        value: bookingCounts.AWAITING_VENDOR_CONFIRMATION,
                        helper: 'Vendor decision pending',
                      },
                      {
                        label: 'Deposit pending',
                        value: bookingCounts.DEPOSIT_PENDING,
                        helper: 'Payment action required',
                      },
                      {
                        label: 'Active',
                        value: bookingCounts.ACTIVE,
                        helper: 'Service is committed',
                      },
                      {
                        label: 'Completed',
                        value: bookingCounts.COMPLETED,
                        helper: 'Service delivered',
                      },
                    ].map(({ label, value, helper }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur"
                      >
                        <div>
                          <p className="text-sm font-black text-white/88">{label}</p>

                          <p className="mt-1 text-xs font-semibold text-white/48">{helper}</p>
                        </div>

                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 text-lg font-black">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="glass-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                    <Clock3 className="size-6" />
                  </div>

                  <span className="rounded-full bg-white/30 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/52">
                    4 stages
                  </span>
                </div>

                <h2 className="mt-6 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Booking lifecycle
                </h2>

                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                  Each booking moves through a clear sequence before the service is completed.
                </p>

                <div className="mt-6 space-y-1">
                  {[
                    {
                      number: '01',
                      title: 'Vendor response',
                      description: 'The vendor confirms or rejects the booking request.',
                    },
                    {
                      number: '02',
                      title: 'Deposit readiness',
                      description: 'A required deposit moves the booking into payment progress.',
                    },
                    {
                      number: '03',
                      title: 'Active service',
                      description: 'The vendor commitment becomes active for the event.',
                    },
                    {
                      number: '04',
                      title: 'Service completion',
                      description: 'The vendor marks the service completed after delivery.',
                    },
                  ].map(({ number, title, description }, index, stages) => (
                    <div key={number} className="relative flex gap-4">
                      <div className="flex w-10 shrink-0 flex-col items-center">
                        <span className="grid size-10 place-items-center rounded-xl bg-[rgba(93,58,85,0.09)] text-xs font-black text-[var(--color-deep-plum)]">
                          {number}
                        </span>

                        {index < stages.length - 1 ? (
                          <span className="my-1 h-full min-h-8 w-px bg-[rgba(93,58,85,0.14)]" />
                        ) : null}
                      </div>

                      <div className="pb-5">
                        <p className="text-sm font-black text-[var(--color-near-black)]">{title}</p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                          {description}
                        </p>
                      </div>
                    </div>
                  ))}
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
              <div className="flex items-start justify-between gap-5 border-b border-white/45 pb-6">
                <div className="min-w-0">
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <PackageCheck className="size-4" />
                    Booking overview
                  </div>

                  <h2
                    id="booking-details-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    {selectedBookingQuery.data?.acceptedQuotation.quotationRequest.package?.title ??
                      'Custom vendor service'}
                  </h2>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-[var(--color-charcoal)]/60">
                    <span className="inline-flex items-center gap-2">
                      <Store className="size-4 text-[var(--color-rosewood)]" />
                      {selectedBookingQuery.data?.vendor.businessName ?? 'Vendor booking'}
                    </span>

                    {selectedBookingQuery.data ? (
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="size-4 text-[var(--color-rosewood)]" />
                        {formatDateTime(selectedBookingQuery.data.serviceStart)}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-4 max-w-2xl leading-7 text-[var(--color-charcoal)]/66">
                    Review the vendor, service schedule, agreed pricing, payment activity and
                    accepted quotation.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 transition hover:bg-white/42"
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
                <BookingDetails
                  booking={selectedBookingQuery.data}
                  hasReview={reviewsByBookingId.has(selectedBookingQuery.data.id)}
                  onOpenReview={openReviewDialog}
                  payments={selectedBookingPaymentsQuery.data?.payments ?? []}
                  paymentsCount={selectedBookingPaymentsQuery.data?.count ?? 0}
                  paymentsLoading={selectedBookingPaymentsQuery.isLoading}
                  paymentsError={
                    selectedBookingPaymentsQuery.isError
                      ? getApiErrorMessage(selectedBookingPaymentsQuery.error)
                      : null
                  }
                  stripeCheckoutPending={stripeCheckoutMutation.isPending}
                  stripeCheckoutError={
                    stripeCheckoutMutation.isError
                      ? getApiErrorMessage(stripeCheckoutMutation.error)
                      : null
                  }
                  onRetryPayments={() => {
                    void selectedBookingPaymentsQuery.refetch();
                  }}
                  onOpenPayment={openPaymentDialog}
                  onStripeCheckout={(booking) => {
                    stripeCheckoutMutation.reset();
                    stripeCheckoutMutation.mutate(booking);
                  }}
                  onCancel={openCancelDialog}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {reviewBooking ? (
        <ReviewFormDialog
          mode="create"
          vendorName={reviewBooking.vendor.businessName}
          packageTitle={reviewBooking.acceptedQuotation.quotationRequest.package?.title}
          isPending={createReviewMutation.isPending}
          errorMessage={
            createReviewMutation.isError ? getApiErrorMessage(createReviewMutation.error) : null
          }
          onClose={closeReviewDialog}
          onSubmit={(input) => {
            if (input.overallRating === undefined) {
              return;
            }

            createReviewMutation.mutate({
              booking: reviewBooking,
              input: {
                overallRating: input.overallRating,
                serviceRating: input.serviceRating,
                communicationRating: input.communicationRating,
                comment: input.comment,
              },
            });
          }}
        />
      ) : null}

      {paymentBooking ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-payment-title"
        >
          <div className="glass-card w-full max-w-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(93,58,85,0.12)] text-[var(--color-deep-plum)]">
                  <Landmark className="size-7" />
                </div>

                <h2
                  id="submit-payment-title"
                  className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                >
                  Submit deposit payment
                </h2>

                <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
                  Record your bank-transfer reference for{' '}
                  <strong>{paymentBooking.vendor.businessName}</strong>.
                </p>
              </div>

              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
                aria-label="Close payment form"
                disabled={submitPaymentMutation.isPending}
                onClick={closePaymentDialog}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-white/24 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                Required deposit
              </p>

              <p className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                {formatCurrency(paymentBooking.acceptedQuotation.depositAmount)}
              </p>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Payment reference number
              </span>

              <input
                className="form-field"
                type="text"
                maxLength={200}
                value={paymentReferenceNumber}
                disabled={submitPaymentMutation.isPending}
                placeholder="Enter the bank transaction reference"
                onChange={(event) => {
                  submitPaymentMutation.reset();
                  setPaymentReferenceNumber(event.target.value);
                }}
              />

              <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/48">
                Minimum 3 characters. {paymentReferenceNumber.length}/200
              </p>
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Payment proof
              </span>

              <div className="rounded-2xl border border-dashed border-white/70 bg-white/20 p-5">
                <input
                  className="sr-only"
                  id="payment-proof-file"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  disabled={submitPaymentMutation.isPending}
                  onChange={(event) => {
                    submitPaymentMutation.reset();
                    setPaymentProofFile(event.target.files?.[0] ?? null);
                  }}
                />

                <label
                  htmlFor="payment-proof-file"
                  className="btn-secondary w-fit cursor-pointer text-sm font-bold"
                >
                  <Upload className="size-4" />
                  Choose proof file
                </label>

                <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/58">
                  {paymentProofFile
                    ? `${paymentProofFile.name} · ${formatFileSize(paymentProofFile.size)}`
                    : 'Optional PDF, JPEG, PNG or WebP up to 10 MB.'}
                </p>

                {paymentProofFile ? (
                  <button
                    type="button"
                    className="mt-3 text-sm font-black text-[var(--color-muted-burgundy)]"
                    disabled={submitPaymentMutation.isPending}
                    onClick={() => {
                      setPaymentProofFile(null);
                    }}
                  >
                    Remove file
                  </button>
                ) : null}
              </div>
            </label>

            {submitPaymentMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(submitPaymentMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={submitPaymentMutation.isPending}
                onClick={closePaymentDialog}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary justify-center text-sm font-bold"
                disabled={submitPaymentMutation.isPending}
                onClick={() => {
                  submitPaymentMutation.mutate();
                }}
              >
                {submitPaymentMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Landmark className="size-4" />
                )}

                {submitPaymentMutation.isPending ? 'Submitting payment...' : 'Submit payment'}
              </button>
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
  hasReview,
  onOpenReview,
  payments,
  paymentsCount,
  paymentsLoading,
  paymentsError,
  stripeCheckoutPending,
  stripeCheckoutError,
  onRetryPayments,
  onOpenPayment,
  onStripeCheckout,
  onCancel,
}: {
  booking: CustomerBooking;
  hasReview: boolean;
  onOpenReview: (booking: CustomerBooking) => void;
  payments: CustomerPayment[];
  paymentsCount: number;
  paymentsLoading: boolean;
  paymentsError: string | null;
  stripeCheckoutPending: boolean;
  stripeCheckoutError: string | null;
  onRetryPayments: () => void;
  onOpenPayment: (booking: CustomerBooking) => void;
  onStripeCheckout: (booking: CustomerBooking) => void;
  onCancel: (booking: CustomerBooking) => void;
}) {
  const servicePackage = booking.acceptedQuotation.quotationRequest.package;
  const cancellation = getCancellationReason(booking);

  const pendingStripePayment = payments.find(
    (payment) => payment.status === 'PENDING' && payment.method === 'STRIPE_CHECKOUT',
  );

  const hasPendingManualPayment = payments.some(
    (payment) => payment.status === 'PENDING' && payment.method === 'BANK_TRANSFER',
  );

  const hasVerifiedPayment = payments.some((payment) => payment.status === 'VERIFIED');

  const canSubmitManualDeposit =
    booking.status === 'DEPOSIT_PENDING' &&
    Boolean(booking.acceptedQuotation.depositAmount) &&
    !hasPendingManualPayment &&
    !hasVerifiedPayment &&
    !pendingStripePayment;

  const canStartStripeCheckout =
    booking.status === 'DEPOSIT_PENDING' &&
    Boolean(booking.acceptedQuotation.depositAmount) &&
    !hasPendingManualPayment &&
    !hasVerifiedPayment;

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
        <article className="group relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/26 p-5 shadow-[0_16px_45px_rgba(31,27,29,0.05)] transition duration-300 hover:bg-white/32 sm:p-6">
          <div className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                <Store className="size-6" />
              </div>

              <span className="rounded-full bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50">
                Vendor
              </span>
            </div>

            <h3 className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              {booking.vendor.businessName}
            </h3>

            <div className="mt-5 space-y-3">
              {booking.vendor.baseLocation ? (
                <div className="flex items-start gap-3 rounded-2xl bg-white/28 p-4">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--color-rosewood)]" />

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/45">
                      Location
                    </p>

                    <p className="mt-1 text-sm font-bold text-[var(--color-charcoal)]/70">
                      {booking.vendor.baseLocation}
                    </p>
                  </div>
                </div>
              ) : null}

              {booking.vendor.contactPhone ? (
                <div className="flex items-start gap-3 rounded-2xl bg-white/28 p-4">
                  <Phone className="mt-0.5 size-4 shrink-0 text-[var(--color-rosewood)]" />

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/45">
                      Contact
                    </p>

                    <p className="mt-1 text-sm font-bold text-[var(--color-charcoal)]/70">
                      {booking.vendor.contactPhone}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              to={`/vendors/${booking.vendor.slug}`}
              className="btn-secondary mt-5 w-fit text-sm font-bold"
            >
              <Store className="size-4" />
              View vendor profile
            </Link>
          </div>
        </article>

        <article className="group relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/26 p-5 shadow-[0_16px_45px_rgba(31,27,29,0.05)] transition duration-300 hover:bg-white/32 sm:p-6">
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(175,201,216,0.20)] text-[var(--color-deep-plum)]">
                <CalendarClock className="size-6" />
              </div>

              <span className="rounded-full bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50">
                Schedule
              </span>
            </div>

            <h3 className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              Service timeline
            </h3>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/45 bg-white/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/45">
                    Service starts
                  </p>

                  <span className="grid size-8 place-items-center rounded-xl bg-[rgba(93,58,85,0.08)]">
                    <CalendarClock className="size-4 text-[var(--color-deep-plum)]" />
                  </span>
                </div>

                <p className="mt-3 font-black leading-6 text-[var(--color-near-black)]">
                  {formatDateTime(booking.serviceStart)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/45 bg-white/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/45">
                    Service ends
                  </p>

                  <span className="grid size-8 place-items-center rounded-xl bg-[rgba(93,58,85,0.08)]">
                    <Clock3 className="size-4 text-[var(--color-deep-plum)]" />
                  </span>
                </div>

                <p className="mt-3 font-black leading-6 text-[var(--color-near-black)]">
                  {booking.serviceEnd ? formatDateTime(booking.serviceEnd) : 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
              <ReceiptText className="size-6" />
            </div>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
              Accepted quotation
            </p>

            <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              {servicePackage?.title ?? 'Custom vendor service'}
            </h3>

            <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/58">
              Version {booking.acceptedQuotation.version}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/45 bg-white/30 px-6 py-5 text-right">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
              Agreed amount
            </p>

            <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              {formatCurrency(booking.agreedCost)}
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
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

      <section className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
              <Landmark className="size-6" />
            </div>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
              Deposit payments
            </p>

            <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              Payment history
            </h3>

            <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/58">
              {paymentsCount} {paymentsCount === 1 ? 'payment' : 'payments'} recorded for this
              booking.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/45 bg-white/30 px-6 py-5 text-right">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
              Required deposit
            </p>

            <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              {booking.acceptedQuotation.depositAmount
                ? formatCurrency(booking.acceptedQuotation.depositAmount)
                : 'No deposit'}
            </p>
          </div>
        </div>

        {paymentsLoading ? (
          <div className="mt-6 grid min-h-36 place-items-center rounded-2xl bg-white/18">
            <div className="text-center">
              <LoaderCircle className="mx-auto size-7 animate-spin text-[var(--color-deep-plum)]" />

              <p className="mt-3 text-sm font-bold text-[var(--color-charcoal)]/58">
                Loading payment history
              </p>
            </div>
          </div>
        ) : null}

        {paymentsError ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
          >
            <p className="text-sm font-bold text-[var(--color-muted-burgundy)]">{paymentsError}</p>

            <button
              type="button"
              className="btn-secondary mt-4 text-sm font-bold"
              onClick={onRetryPayments}
            >
              Try again
            </button>
          </div>
        ) : null}

        {!paymentsLoading && !paymentsError && payments.length > 0 ? (
          <div className="mt-6 space-y-4">
            {payments.map((payment) => (
              <article
                key={payment.id}
                className="group relative overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/28 p-5 shadow-[0_16px_45px_rgba(31,27,29,0.05)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/34 hover:shadow-[0_22px_60px_rgba(31,27,29,0.08)] sm:p-6"
              >
                <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />

                <div className="relative">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-chip" data-tone={getPaymentTone(payment.status)}>
                          {getPaymentStatusLabel(payment)}
                        </span>

                        <span className="status-chip" data-tone="gray">
                          {paymentMethodLabels[payment.method]}
                        </span>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/45 bg-white/32 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
                          Payment amount
                        </p>

                        <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                          {formatCurrency(payment.amount)}
                        </p>

                        <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/58">
                          <span className="font-black">Reference</span> · {payment.referenceNumber}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/45 bg-white/30 px-4 py-3 text-right">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
                        Submitted
                      </p>

                      <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                        {formatDateTime(payment.createdAt)}
                      </p>
                    </div>
                  </div>

                  {payment.proofFileUrl ? (
                    <a
                      href={payment.proofFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary mt-4 w-fit text-sm font-bold"
                    >
                      <Download className="size-4" />
                      View payment proof
                    </a>
                  ) : null}

                  {payment.proofFileOriginalName ? (
                    <p className="mt-3 text-xs font-semibold text-[var(--color-charcoal)]/48">
                      {payment.proofFileOriginalName}
                      {payment.proofFileSize ? ` · ${formatFileSize(payment.proofFileSize)}` : ''}
                    </p>
                  ) : null}

                  {payment.reviewedAt ? (
                    <p className="mt-4 text-xs font-bold text-[var(--color-charcoal)]/46">
                      Reviewed {formatDateTime(payment.reviewedAt)}
                    </p>
                  ) : null}

                  {payment.rejectionReason ? (
                    <div className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.20)] bg-[rgba(124,74,90,0.08)] px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                        Rejection reason
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                        {payment.rejectionReason}
                      </p>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!paymentsLoading && !paymentsError && payments.length === 0 ? (
          <div className="mt-7 rounded-[1.6rem] border border-dashed border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.18))] p-8 text-center backdrop-blur-xl">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
              <WalletCards className="size-8" />
            </div>

            <p className="mt-6 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
              No payments submitted
            </p>

            <p className="mt-3 max-w-md mx-auto text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
              Deposit-payment actions will become available after the vendor confirms this booking
              and a deposit is required.
            </p>
          </div>
        ) : null}

        {canSubmitManualDeposit || canStartStripeCheckout ? (
          <div className="mt-6 rounded-[1.35rem] border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.07)] p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
              Deposit required
            </p>

            <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
              {pendingStripePayment
                ? 'Your Stripe checkout has started but has not been completed yet.'
                : 'Submit your bank-transfer reference with an optional receipt, or continue to Stripe Checkout.'}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {canSubmitManualDeposit ? (
                <button
                  type="button"
                  className="btn-primary justify-center text-sm font-bold"
                  onClick={() => {
                    onOpenPayment(booking);
                  }}
                >
                  <Landmark className="size-4" />
                  Submit bank transfer
                </button>
              ) : null}

              {canStartStripeCheckout ? (
                <button
                  type="button"
                  className="btn-secondary justify-center text-sm font-bold"
                  disabled={stripeCheckoutPending}
                  onClick={() => {
                    onStripeCheckout(booking);
                  }}
                >
                  {stripeCheckoutPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}

                  {stripeCheckoutPending
                    ? 'Opening Stripe...'
                    : pendingStripePayment
                      ? 'Continue Stripe checkout'
                      : 'Pay with Stripe'}
                </button>
              ) : null}
            </div>

            {stripeCheckoutError ? (
              <div
                role="alert"
                className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {stripeCheckoutError}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {booking.vendorResponseNote ? (
        <section className="relative overflow-hidden rounded-[1.7rem] border border-white/60 bg-white/26 p-6 shadow-[0_16px_45px_rgba(31,27,29,0.05)] sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(175,201,216,0.22)] text-[var(--color-deep-plum)]">
                  <FileText className="size-6" />
                </div>

                <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  Vendor response
                </p>
              </div>

              {booking.vendorRespondedAt ? (
                <div className="rounded-2xl border border-white/45 bg-white/30 px-4 py-3 text-left sm:text-right">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
                    Responded
                  </p>

                  <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                    {formatDateTime(booking.vendorRespondedAt)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-white/45 bg-white/32 p-5">
              <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66">
                {booking.vendorResponseNote}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {cancellation ? (
        <section className="relative overflow-hidden rounded-[1.7rem] border border-[rgba(124,74,90,0.24)] bg-[rgba(124,74,90,0.09)] p-6 shadow-[0_16px_45px_rgba(31,27,29,0.05)] sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(210,146,160,0.18)] blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                  <Ban className="size-6" />
                </div>

                <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
                  {cancellation.label}
                </p>
              </div>

              {cancellation.cancelledAt ? (
                <div className="rounded-2xl border border-white/45 bg-white/30 px-4 py-3 text-left sm:text-right">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
                    Cancelled
                  </p>

                  <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                    {formatDateTime(cancellation.cancelledAt)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-white/45 bg-white/32 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                Cancellation reason
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                {cancellation.reason}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {booking.vendorCompletedAt ? (
        <section className="relative overflow-hidden rounded-[1.7rem] border border-[rgba(89,133,113,0.24)] bg-[rgba(89,133,113,0.09)] p-6 shadow-[0_16px_45px_rgba(31,27,29,0.05)] sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(170,210,190,0.18)] blur-3xl" />

          <div className="relative">
            <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(170,210,190,0.24)] text-emerald-700">
              <CheckCircle2 className="size-6" />
            </div>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[#3f735d]">
              Service completed
            </p>

            <div className="mt-6 rounded-[1.4rem] border border-white/45 bg-white/32 p-5">
              <p className="text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                The vendor marked this booking as completed on{' '}
                {formatDateTime(booking.vendorCompletedAt)}.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {booking.status === 'COMPLETED' ? (
        <section className="relative overflow-hidden rounded-[1.7rem] border border-[rgba(130,72,77,0.22)] bg-[rgba(130,72,77,0.08)] p-6 shadow-[0_16px_45px_rgba(31,27,29,0.05)] sm:p-7">
          <div className="pointer-events-none absolute -bottom-16 -right-10 size-40 rounded-full bg-[rgba(220,183,150,0.18)] blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(130,72,77,0.13)] text-[var(--color-rosewood)]">
                <Star className="size-6 fill-current" />
              </div>

              <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                Vendor review
              </p>

              <h3 className="mt-3 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                {hasReview ? 'You reviewed this completed service.' : 'How was your experience?'}
              </h3>

              <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64">
                {hasReview
                  ? 'Your verified review is available in this event’s Reviews workspace.'
                  : 'Share an overall rating and optional feedback about the service and communication.'}
              </p>
            </div>

            <div className="shrink-0">
              {hasReview ? (
                <Link
                  to={`/events/${booking.event.id}/reviews`}
                  className="btn-secondary w-full justify-center text-sm font-bold sm:w-auto"
                >
                  <Star className="size-4 fill-current" />
                  View review
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn-primary w-full justify-center text-sm font-bold sm:w-auto"
                  onClick={() => {
                    onOpenReview(booking);
                  }}
                >
                  <Star className="size-4 fill-current" />
                  Write review
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {isCustomerCancellable(booking.status) ? (
        <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.05)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-[var(--color-near-black)]">
              Need to end this vendor commitment?
            </p>

            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
              Cancellation is available while this booking is still awaiting, confirmed, deposit
              pending or active.
            </p>
          </div>

          <button
            type="button"
            className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-[rgba(124,74,90,0.26)] bg-[rgba(124,74,90,0.10)] px-5 py-3 text-sm font-black text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
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
