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
import { canManageWorkspace, getWorkspaceLockedMessage } from '../features/events/eventLifecycle';

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

  const bookingEventStatus = eventQuery.data?.status;

  const isBookingWorkspaceMutable =
    bookingEventStatus !== undefined ? canManageWorkspace(bookingEventStatus, 'BOOKINGS') : false;

  const bookingWorkspaceLockedMessage =
    bookingEventStatus !== undefined && !isBookingWorkspaceMutable
      ? getWorkspaceLockedMessage(bookingEventStatus, 'BOOKINGS')
      : null;

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
      if (!isBookingWorkspaceMutable) {
        throw new Error(
          bookingWorkspaceLockedMessage ?? 'Booking changes are unavailable for this event.',
        );
      }

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
      if (!isBookingWorkspaceMutable) {
        throw new Error(
          bookingWorkspaceLockedMessage ?? 'Payment activity is unavailable for this event.',
        );
      }
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
      if (!isBookingWorkspaceMutable) {
        throw new Error(
          bookingWorkspaceLockedMessage ?? 'Payment activity is unavailable for this event.',
        );
      }

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
    if (!isBookingWorkspaceMutable) {
      return;
    }

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
    if (!isBookingWorkspaceMutable) {
      return;
    }

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

  const bookingProgress =
    totalBookings > 0
      ? Math.round(((committedCount + bookingCounts.COMPLETED) / totalBookings) * 100)
      : 0;

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
          <section className="relative isolate min-h-[22rem] overflow-hidden rounded-[2.5rem] border border-white/68 bg-[#fffaf6] px-6 py-5 shadow-[0_26px_78px_rgba(31,27,29,0.11)] sm:px-7 sm:py-6 lg:px-8 lg:py-6">
            <img
              src="/images/workspaces/shortcuts/bookings.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-30 size-full scale-[1.01] object-cover object-[76%_center] opacity-100 saturate-[0.94] contrast-[0.99] transition duration-1000"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(255,250,246,0.995)_0%,rgba(255,250,246,0.985)_20%,rgba(255,250,246,0.93)_34%,rgba(255,250,246,0.72)_47%,rgba(255,250,246,0.40)_58%,rgba(255,250,246,0.14)_69%,rgba(255,250,246,0.025)_79%,transparent_88%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 -z-20 w-[58%] bg-[linear-gradient(90deg,rgba(255,250,246,0.42),rgba(255,250,246,0.10),transparent)] backdrop-blur-[2.5px]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_48%,rgba(255,250,246,0.09)_100%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 -top-28 -z-10 size-[30rem] rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
            />

            <div className="relative flex min-h-[17rem] flex-col justify-between gap-3">
              <div className="max-w-[35rem]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/44 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)] shadow-[0_10px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Vendor commitments
                </div>

                <div className="mt-2.5 max-w-[32rem] rounded-[1.3rem] border border-white/44 bg-white/[0.15] px-5 py-3 shadow-[0_14px_36px_rgba(31,27,29,0.055)] backdrop-blur-[3px]">
                  <h2 className="max-w-[30rem] text-balance text-[2rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.2rem] lg:text-[2.35rem]">
                    Every vendor commitment,
                    <br />
                    clearly organised.
                  </h2>

                  <p className="mt-2.5 max-w-[30rem] text-sm font-semibold leading-[1.4rem] text-[var(--color-charcoal)]/70">
                    Follow confirmations, deposits, active services, completed work and payment
                    progress from one organised booking workspace.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                      to={`/events/${eventId}/quotations`}
                      className="group/hero-open-quotations btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(93,58,85,0.24)]"
                    >
                      <ReceiptText
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/hero-open-quotations:scale-105"
                      />
                      Open quotations
                    </Link>

                    <span className="rounded-full border border-white/72 bg-white/46 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                      <CalendarClock aria-hidden="true" className="mr-1.5 inline size-3.5" />
                      {formatLongDate(eventDetails.eventDate)}
                    </span>
                  </div>

                  <div className="mt-3 max-w-[26rem] rounded-[1.1rem] border border-white/56 bg-white/34 px-4 py-2.5 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/48">
                          Commitment progress
                        </p>

                        <p className="mt-1 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/54">
                          Confirmed, active or completed services
                        </p>
                      </div>

                      <p className="text-sm font-black text-[var(--color-deep-plum)]">
                        {bookingProgress}%
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.09)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),#d7b7c3)] transition-[width] duration-700"
                        style={{
                          width: `${Math.min(Math.max(bookingProgress, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid max-w-[49rem] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="group/booking-metric rounded-[1.3rem] border border-white/68 bg-white/40 px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/56 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] transition duration-300 group-hover/booking-metric:scale-105">
                    <PackageCheck aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Total bookings
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {totalBookings}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {bookingCounts.AWAITING_VENDOR_CONFIRMATION} awaiting vendor response
                  </p>
                </article>

                <article className="group/booking-metric rounded-[1.3rem] border border-white/68 bg-[rgba(240,247,250,0.48)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#334954] transition duration-300 group-hover/booking-metric:scale-105">
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Committed services
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {committedCount}
                  </p>

                  <p className="mt-1 text-[0.64rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {bookingCounts.CONFIRMED} confirmed · {bookingCounts.DEPOSIT_PENDING} deposit ·{' '}
                    {bookingCounts.ACTIVE} active
                  </p>
                </article>

                <article className="group/booking-metric rounded-[1.3rem] border border-white/68 bg-[rgba(244,246,236,0.50)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#596449] transition duration-300 group-hover/booking-metric:scale-105">
                    <Sparkles aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Completed
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {bookingCounts.COMPLETED}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Vendor services successfully delivered
                  </p>
                </article>

                <article className="group/booking-metric rounded-[1.3rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(249,235,240,0.52)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)] transition duration-300 group-hover/booking-metric:scale-105">
                      <CircleAlert aria-hidden="true" className="size-4" />
                    </span>

                    <span className="rounded-full border border-[rgba(124,74,90,0.14)] bg-white/38 px-2 py-1 text-[0.52rem] font-black uppercase tracking-[0.12em] text-[var(--color-muted-burgundy)]">
                      Exceptions
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 divide-x divide-[rgba(124,74,90,0.12)]">
                    <div className="pr-2">
                      <p className="text-[0.48rem] font-black uppercase tracking-[0.09em] text-[var(--color-charcoal)]/46">
                        Cancelled
                      </p>

                      <p className="mt-1 text-xl font-black tracking-[-0.05em] text-[var(--color-muted-burgundy)]">
                        {bookingCounts.CANCELLED}
                      </p>
                    </div>

                    <div className="px-2">
                      <p className="text-[0.48rem] font-black uppercase tracking-[0.09em] text-[var(--color-charcoal)]/46">
                        Rejected
                      </p>

                      <p className="mt-1 text-xl font-black tracking-[-0.05em] text-[var(--color-muted-burgundy)]">
                        {bookingCounts.REJECTED}
                      </p>
                    </div>

                    <div className="pl-2">
                      <p className="text-[0.48rem] font-black uppercase tracking-[0.09em] text-[var(--color-charcoal)]/46">
                        Disputed
                      </p>

                      <p className="mt-1 text-xl font-black tracking-[-0.05em] text-[var(--color-deep-plum)]">
                        {bookingCounts.DISPUTED}
                      </p>
                    </div>
                  </div>

                  <p className="mt-1.5 text-[0.66rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Bookings requiring historical or support context
                  </p>
                </article>
              </div>
            </div>
          </section>

          {bookingWorkspaceLockedMessage ? (
            <div className="mt-6 flex items-start gap-4 rounded-[1.5rem] border border-[rgba(93,58,85,0.14)] bg-[rgba(255,255,255,0.58)] px-5 py-4 shadow-[0_14px_36px_rgba(31,27,29,0.05)] backdrop-blur-xl">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                <CircleAlert aria-hidden="true" className="size-5" />
              </span>

              <div>
                <p className="text-sm font-black text-[var(--color-near-black)]">
                  Booking activity is read-only
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  {bookingWorkspaceLockedMessage}
                </p>
              </div>
            </div>
          ) : null}

          <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.3fr]">
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
                <div className="mt-5 space-y-3">
                  {bookings.map((booking) => {
                    const servicePackage = booking.acceptedQuotation.quotationRequest.package;
                    const existingReview = reviewsByBookingId.get(booking.id);

                    return (
                      <article
                        key={booking.id}
                        className="group/booking relative overflow-hidden rounded-[1.55rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.42),rgba(255,255,255,0.22))] p-4 shadow-[0_14px_38px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/90 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.76),rgba(229,221,239,0.48))] hover:shadow-[0_22px_54px_rgba(31,27,29,0.09)] sm:p-5"
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-[rgba(183,167,200,0.14)] opacity-60 blur-3xl transition duration-500 group-hover/booking:scale-125 group-hover/booking:opacity-100"
                        />

                        <div className="relative">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

                              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <h3 className="text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/booking:text-[var(--color-deep-plum)]">
                                    {servicePackage?.title ?? 'Custom vendor service'}
                                  </h3>

                                  <Link
                                    to={`/vendors/${booking.vendor.slug}`}
                                    state={{
                                      returnTo: `/events/${eventId}/bookings`,
                                      returnLabel: 'Back to bookings',
                                    }}
                                    className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-black text-[var(--color-deep-plum)] transition hover:text-[var(--color-rosewood)]"
                                  >
                                    <Store aria-hidden="true" className="size-3.5" />
                                    {booking.vendor.businessName}
                                  </Link>
                                </div>

                                <p className="shrink-0 text-[0.68rem] font-bold text-[var(--color-charcoal)]/42">
                                  Created {formatDateTime(booking.createdAt)}
                                </p>
                              </div>

                              <div className="mt-4 grid gap-2.5 border-t border-[rgba(93,58,85,0.08)] pt-3 sm:grid-cols-3">
                                <div className="flex items-center gap-3 rounded-xl bg-white/24 px-3 py-2.5">
                                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)]">
                                    <ReceiptText aria-hidden="true" className="size-3.5" />
                                  </span>

                                  <div className="min-w-0">
                                    <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/42">
                                      Agreed cost
                                    </p>

                                    <p className="mt-0.5 truncate text-sm font-black text-[var(--color-near-black)]">
                                      {formatCurrency(booking.agreedCost)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-xl bg-white/24 px-3 py-2.5">
                                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)]">
                                    <WalletCards aria-hidden="true" className="size-3.5" />
                                  </span>

                                  <div className="min-w-0">
                                    <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/42">
                                      Deposit
                                    </p>

                                    <p className="mt-0.5 truncate text-sm font-black text-[var(--color-near-black)]">
                                      {booking.acceptedQuotation.depositAmount
                                        ? formatCurrency(booking.acceptedQuotation.depositAmount)
                                        : 'No deposit'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-xl bg-white/24 px-3 py-2.5">
                                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)]">
                                    <CalendarClock aria-hidden="true" className="size-3.5" />
                                  </span>

                                  <div className="min-w-0">
                                    <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/42">
                                      Service starts
                                    </p>

                                    <p className="mt-0.5 text-xs font-black leading-5 text-[var(--color-near-black)]">
                                      {formatDateTime(booking.serviceStart)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/50 pt-3 lg:w-40 lg:flex-col lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                              <button
                                type="button"
                                className="group/view-booking btn-secondary flex-1 justify-center text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.24)] hover:bg-white/52 lg:flex-none"
                                onClick={() => {
                                  setSelectedBookingId(booking.id);
                                }}
                              >
                                <FileText
                                  aria-hidden="true"
                                  className="size-3.5 transition duration-300 group-hover/view-booking:rotate-[3deg]"
                                />
                                View details
                              </button>

                              {booking.status === 'COMPLETED' ? (
                                existingReview ? (
                                  <Link
                                    to={`/events/${eventId}/reviews`}
                                    className="group/view-review btn-secondary flex-1 justify-center text-xs font-bold lg:flex-none"
                                  >
                                    <Star className="size-3.5 fill-current" />
                                    View review
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    className="group/write-review btn-primary flex-1 justify-center text-xs font-bold lg:flex-none"
                                    onClick={() => {
                                      openReviewDialog(booking);
                                    }}
                                  >
                                    <Star className="size-3.5 fill-current" />
                                    Write review
                                  </button>
                                )
                              ) : null}

                              {isCustomerCancellable(booking.status) ? (
                                <button
                                  type="button"
                                  className="group/cancel-booking flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5 text-xs font-black text-[var(--color-muted-burgundy)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.32)] hover:bg-[rgba(124,74,90,0.14)] disabled:cursor-not-allowed disabled:opacity-40 lg:flex-none"
                                  disabled={!isBookingWorkspaceMutable}
                                  title={
                                    !isBookingWorkspaceMutable
                                      ? (bookingWorkspaceLockedMessage ?? undefined)
                                      : undefined
                                  }
                                  onClick={() => {
                                    openCancelDialog(booking);
                                  }}
                                >
                                  <Ban
                                    aria-hidden="true"
                                    className="size-3.5 transition duration-300 group-hover/cancel-booking:rotate-[-4deg]"
                                  />
                                  Cancel booking
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.4rem] border border-dashed border-white/70 bg-white/20 p-6 text-center">
                  <PackageCheck className="mx-auto size-8 text-[var(--color-deep-plum)]" />

                  <p className="mt-3 text-lg font-black text-[var(--color-near-black)]">
                    {filtersAreActive ? 'No bookings match this filter' : 'No bookings created yet'}
                  </p>

                  <p className="mx-auto mt-1.5 max-w-lg text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                    {filtersAreActive
                      ? 'Try changing the booking status or sorting option.'
                      : 'Accept a vendor quotation and create a booking request from the quotation workflow.'}
                  </p>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary mt-4 text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <Link
                      to={`/events/${eventId}/quotations`}
                      className="btn-primary mt-4 text-sm font-bold"
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

            <aside>
              <article className="glass-card p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <Clock3 className="size-4" />
                    </div>

                    <div>
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                        Booking flow
                      </p>

                      <h2 className="mt-0.5 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                        Booking lifecycle
                      </h2>
                    </div>
                  </div>

                  <span className="rounded-full bg-white/30 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                    4 stages
                  </span>
                </div>

                <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/54">
                  Follow each vendor commitment from confirmation through service completion.
                </p>

                <div className="mt-4 border-t border-[rgba(93,58,85,0.08)] pt-3">
                  {[
                    {
                      number: '01',
                      title: 'Vendor response',
                      description: 'Vendor confirms or rejects the request.',
                    },
                    {
                      number: '02',
                      title: 'Deposit readiness',
                      description: 'Required deposits move into payment.',
                    },
                    {
                      number: '03',
                      title: 'Active service',
                      description: 'The commitment becomes active.',
                    },
                    {
                      number: '04',
                      title: 'Service completion',
                      description: 'The vendor records completed delivery.',
                    },
                  ].map(({ number, title, description }, index, stages) => (
                    <div key={number} className="relative flex gap-3">
                      <div className="flex w-8 shrink-0 flex-col items-center">
                        <span className="grid size-8 place-items-center rounded-lg bg-[rgba(93,58,85,0.08)] text-[0.62rem] font-black text-[var(--color-deep-plum)]">
                          {number}
                        </span>

                        {index < stages.length - 1 ? (
                          <span className="my-1 h-full min-h-5 w-px bg-[rgba(93,58,85,0.12)]" />
                        ) : null}
                      </div>

                      <div className="pb-3">
                        <p className="text-xs font-black text-[var(--color-near-black)]">{title}</p>

                        <p className="mt-0.5 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/52">
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
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.58)] px-3 py-3 backdrop-blur-xl sm:px-4 sm:py-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-details-title"
          onClick={() => {
            if (!cancelBookingMutation.isPending) {
              closeBookingDetails();
            }
          }}
        >
          <div className="mx-auto flex min-h-full max-w-6xl items-start justify-center">
            <div
              className="relative w-full overflow-hidden rounded-[1.75rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(245,238,248,0.86))] p-4 shadow-[0_36px_100px_rgba(31,27,29,0.24)] backdrop-blur-3xl sm:p-5"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[24%] top-[-7rem] size-56 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4 border-b border-[rgba(93,58,85,0.10)] pb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="soft-chip w-fit text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                        <PackageCheck aria-hidden="true" className="size-3.5" />
                        Booking overview
                      </div>

                      {selectedBookingQuery.data ? (
                        <>
                          <span
                            className="status-chip"
                            data-tone={getBookingTone(selectedBookingQuery.data.status)}
                          >
                            {bookingStatusLabels[selectedBookingQuery.data.status]}
                          </span>

                          {selectedBookingQuery.data.acceptedQuotation.quotationRequest.package
                            ?.category ? (
                            <span className="status-chip" data-tone="gray">
                              <Tags aria-hidden="true" className="size-3.5" />
                              {
                                selectedBookingQuery.data.acceptedQuotation.quotationRequest.package
                                  .category.name
                              }
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="min-w-0">
                        <h2
                          id="booking-details-title"
                          className="text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-[1.8rem]"
                        >
                          {selectedBookingQuery.data?.acceptedQuotation.quotationRequest.package
                            ?.title ?? 'Custom vendor service'}
                        </h2>

                        <p className="mt-1.5 text-xs font-semibold text-[var(--color-charcoal)]/50">
                          Vendor service, quotation, payment and booking activity
                        </p>
                      </div>

                      {selectedBookingQuery.data ? (
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <Link
                            to={`/vendors/${selectedBookingQuery.data.vendor.slug}`}
                            state={{
                              returnTo: `/events/${eventId}/bookings`,
                              returnLabel: 'Back to bookings',
                            }}
                            className="group/details-vendor inline-flex items-center gap-2 rounded-xl border border-[rgba(93,58,85,0.10)] bg-[rgba(93,58,85,0.07)] px-3 py-2 text-xs font-black text-[var(--color-deep-plum)] transition duration-300 hover:border-[rgba(93,58,85,0.20)] hover:bg-[rgba(93,58,85,0.13)] hover:text-[var(--color-rosewood)]"
                          >
                            <Store aria-hidden="true" className="size-3.5" />
                            {selectedBookingQuery.data.vendor.businessName}
                          </Link>

                          <span className="inline-flex items-center gap-2 rounded-xl border border-white/52 bg-white/32 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/64">
                            <CalendarClock
                              aria-hidden="true"
                              className="size-3.5 text-[var(--color-rosewood)]"
                            />
                            {formatDateTime(selectedBookingQuery.data.serviceStart)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_10px_24px_rgba(31,27,29,0.06)] backdrop-blur-xl transition duration-300 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/25"
                    aria-label="Close booking details"
                    onClick={closeBookingDetails}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>

                {selectedBookingQuery.isLoading ? (
                  <div className="mt-4 grid min-h-48 place-items-center rounded-2xl bg-white/18">
                    <LoaderCircle className="size-7 animate-spin text-[var(--color-deep-plum)]" />
                  </div>
                ) : null}

                {selectedBookingQuery.isError ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(selectedBookingQuery.error)}
                  </div>
                ) : null}

                {selectedBookingQuery.data ? (
                  <BookingDetails
                    booking={selectedBookingQuery.data}
                    hasReview={reviewsByBookingId.has(selectedBookingQuery.data.id)}
                    canMutateBooking={isBookingWorkspaceMutable}
                    bookingLockedMessage={bookingWorkspaceLockedMessage}
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

      {paymentBooking && isBookingWorkspaceMutable ? (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto bg-[rgba(31,27,29,0.58)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-payment-title"
          onClick={() => {
            if (!submitPaymentMutation.isPending) {
              closePaymentDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-xl overflow-hidden rounded-[2.15rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(226,238,244,0.82))] p-6 shadow-[0_40px_110px_rgba(31,27,29,0.24)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-5 border-b border-[rgba(93,58,85,0.10)] pb-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <Landmark aria-hidden="true" className="size-6" />
                      </div>

                      <span className="rounded-full border border-[rgba(175,201,216,0.28)] bg-[rgba(175,201,216,0.16)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#3b515b]">
                        Bank transfer
                      </span>
                    </div>

                    <h2
                      id="submit-payment-title"
                      className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                    >
                      Submit deposit payment
                    </h2>

                    <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64">
                      Record your bank-transfer reference for{' '}
                      <strong className="font-black text-[var(--color-near-black)]">
                        {paymentBooking.vendor.businessName}
                      </strong>
                      .
                    </p>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close payment form"
                    disabled={submitPaymentMutation.isPending}
                    onClick={closePaymentDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-white/56 bg-[linear-gradient(145deg,rgba(255,255,255,0.70),rgba(215,232,239,0.52))] p-5 shadow-[0_14px_34px_rgba(31,27,29,0.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
                        Required deposit
                      </p>

                      <p className="mt-3 break-words text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        {formatCurrency(paymentBooking.acceptedQuotation.depositAmount)}
                      </p>
                    </div>

                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.26)] text-[#3b515b]">
                      <WalletCards aria-hidden="true" className="size-4" />
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                    Submit the transfer reference first. A receipt or payment proof can be attached
                    optionally.
                  </p>
                </div>

                <label className="mt-6 block">
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/76">
                      Payment reference number
                    </span>

                    <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                      {paymentReferenceNumber.length} / 200
                    </span>
                  </span>

                  <input
                    className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
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

                  <div className="mt-2 flex flex-col gap-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48 sm:flex-row sm:items-center sm:justify-between">
                    <span>Use the exact reference shown by your bank.</span>

                    <span
                      className={
                        paymentReferenceNumber.trim().length > 0 &&
                        paymentReferenceNumber.trim().length < 3
                          ? 'font-black text-[var(--color-muted-burgundy)]'
                          : 'font-black text-[var(--color-deep-plum)]/60'
                      }
                    >
                      Minimum 3 characters
                    </span>
                  </div>
                </label>

                <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/72 bg-white/26 p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <Upload aria-hidden="true" className="size-4" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Payment proof
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                        Attach a bank receipt or transfer confirmation. This is optional.
                      </p>
                    </div>
                  </div>

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
                    className="group/payment-file btn-secondary mt-5 w-fit cursor-pointer text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                  >
                    <Upload
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/payment-file:-translate-y-0.5"
                    />
                    Choose proof file
                  </label>

                  {paymentProofFile ? (
                    <div className="mt-4 rounded-2xl border border-white/54 bg-white/36 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-[var(--color-near-black)]">
                            {paymentProofFile.name}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/50">
                            {formatFileSize(paymentProofFile.size)}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="shrink-0 rounded-xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.08)] px-3 py-2 text-xs font-black text-[var(--color-muted-burgundy)] transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(124,74,90,0.14)]"
                          disabled={submitPaymentMutation.isPending}
                          onClick={() => {
                            setPaymentProofFile(null);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      Accepted formats: PDF, JPEG, PNG or WebP up to 10 MB.
                    </p>
                  )}
                </div>

                {submitPaymentMutation.isError ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                        <CircleAlert aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                        {getApiErrorMessage(submitPaymentMutation.error)}
                      </p>
                    </div>
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
                    className="group/submit-deposit btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                    disabled={submitPaymentMutation.isPending}
                    onClick={() => {
                      submitPaymentMutation.mutate();
                    }}
                  >
                    {submitPaymentMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Landmark
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/submit-deposit:-translate-y-0.5"
                      />
                    )}

                    {submitPaymentMutation.isPending ? 'Submitting payment...' : 'Submit payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {bookingToCancel && isBookingWorkspaceMutable ? (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto bg-[rgba(31,27,29,0.58)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-booking-title"
          onClick={() => {
            if (!cancelBookingMutation.isPending) {
              closeCancelDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-xl overflow-hidden rounded-[2.15rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(249,235,240,0.82))] p-6 shadow-[0_40px_110px_rgba(31,27,29,0.24)] backdrop-blur-3xl sm:p-8"
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
                <div className="flex items-start justify-between gap-5 border-b border-[rgba(124,74,90,0.10)] pb-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <Ban aria-hidden="true" className="size-6" />
                      </div>

                      <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.10)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                        Irreversible action
                      </span>
                    </div>

                    <h2
                      id="cancel-booking-title"
                      className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                    >
                      Cancel this booking?
                    </h2>

                    <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64">
                      This will end the booking with{' '}
                      <strong className="font-black text-[var(--color-near-black)]">
                        {bookingToCancel.vendor.businessName}
                      </strong>
                      . The vendor will receive your cancellation reason.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.22)] hover:bg-white/56 hover:text-[var(--color-muted-burgundy)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close cancellation form"
                    disabled={cancelBookingMutation.isPending}
                    onClick={closeCancelDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-[rgba(124,74,90,0.16)] bg-[linear-gradient(145deg,rgba(250,239,243,0.74),rgba(255,255,255,0.44))] p-5 shadow-[0_14px_34px_rgba(124,74,90,0.06)]">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.13)] text-[var(--color-muted-burgundy)]">
                      <CircleAlert aria-hidden="true" className="size-4" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        What happens next
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                        The booking will be marked as cancelled, removed from active commitments and
                        the vendor will be notified immediately.
                      </p>
                    </div>
                  </div>
                </div>

                <label className="mt-6 block">
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/76">
                      Cancellation reason
                    </span>

                    <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                      {cancellationReason.length.toLocaleString('en-LK')} / 2,000
                    </span>
                  </span>

                  <textarea
                    className="form-field mt-2 min-h-40 resize-y transition duration-300 focus:bg-white/52"
                    maxLength={2000}
                    value={cancellationReason}
                    disabled={cancelBookingMutation.isPending}
                    placeholder="Explain clearly why this booking needs to be cancelled."
                    onChange={(event) => {
                      cancelBookingMutation.reset();
                      setCancellationReason(event.target.value);
                    }}
                  />

                  <div className="mt-2 flex flex-col gap-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48 sm:flex-row sm:items-center sm:justify-between">
                    <span>This reason will be shared with the vendor.</span>

                    <span
                      className={
                        cancellationReason.trim().length > 0 &&
                        cancellationReason.trim().length < 10
                          ? 'font-black text-[var(--color-muted-burgundy)]'
                          : 'font-black text-[var(--color-deep-plum)]/60'
                      }
                    >
                      Minimum 10 characters
                    </span>
                  </div>
                </label>

                {cancelBookingMutation.isError ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                        <CircleAlert aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                        {getApiErrorMessage(cancelBookingMutation.error)}
                      </p>
                    </div>
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
                    className="group/confirm-cancellation flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={cancelBookingMutation.isPending}
                    onClick={() => {
                      cancelBookingMutation.mutate();
                    }}
                  >
                    {cancelBookingMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Ban
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/confirm-cancellation:rotate-[-4deg]"
                      />
                    )}

                    {cancelBookingMutation.isPending
                      ? 'Cancelling booking...'
                      : 'Confirm cancellation'}
                  </button>
                </div>
              </div>
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
  canMutateBooking,
  bookingLockedMessage,
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
  canMutateBooking: boolean;
  bookingLockedMessage: string | null;
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
    canMutateBooking &&
    booking.status === 'DEPOSIT_PENDING' &&
    Boolean(booking.acceptedQuotation.depositAmount) &&
    !hasPendingManualPayment &&
    !hasVerifiedPayment &&
    !pendingStripePayment;

  const canStartStripeCheckout =
    canMutateBooking &&
    booking.status === 'DEPOSIT_PENDING' &&
    Boolean(booking.acceptedQuotation.depositAmount) &&
    !hasPendingManualPayment &&
    !hasVerifiedPayment;

    return (
    <div className="mt-4 space-y-3">
      {/* Vendor + service schedule */}
      <section className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="relative overflow-hidden rounded-[1.35rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(240,231,246,0.42))] p-4 shadow-[0_12px_34px_rgba(31,27,29,0.045)] backdrop-blur-2xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
          />

          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                  <Store aria-hidden="true" className="size-4" />
                </span>

                <div className="min-w-0">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                    Vendor
                  </p>

                  <h3 className="mt-0.5 truncate text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                    {booking.vendor.businessName}
                  </h3>
                </div>
              </div>

              <Link
                to={`/vendors/${booking.vendor.slug}`}
                state={{
                  returnTo: `/events/${booking.event.id}/bookings`,
                  returnLabel: 'Back to bookings',
                }}
                className="group/vendor-profile inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/60 bg-white/38 px-3 py-2 text-xs font-black text-[var(--color-deep-plum)] transition duration-300 hover:bg-white/58"
              >
                <Store aria-hidden="true" className="size-3.5" />
                View profile
              </Link>
            </div>

            {(booking.vendor.baseLocation || booking.vendor.contactPhone) && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-[rgba(93,58,85,0.08)] pt-3">
                {booking.vendor.baseLocation ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-[var(--color-rosewood)]"
                    />
                    <span className="text-xs font-bold text-[var(--color-charcoal)]/64">
                      {booking.vendor.baseLocation}
                    </span>
                  </div>
                ) : null}

                {booking.vendor.contactPhone ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <Phone
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-[var(--color-rosewood)]"
                    />
                    <span className="text-xs font-bold text-[var(--color-charcoal)]/64">
                      {booking.vendor.contactPhone}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[1.35rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(220,235,242,0.40))] p-4 shadow-[0_12px_34px_rgba(31,27,29,0.045)] backdrop-blur-2xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -left-12 size-32 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl"
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[var(--color-deep-plum)]">
                <CalendarClock aria-hidden="true" className="size-4" />
              </span>

              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                  Schedule
                </p>

                <h3 className="mt-0.5 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                  Service timeline
                </h3>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/52 bg-white/34 px-3 py-2.5">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                  Service starts
                </p>

                <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                  {formatDateTime(booking.serviceStart)}
                </p>
              </div>

              <div className="rounded-xl border border-white/52 bg-white/34 px-3 py-2.5">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                  Service ends
                </p>

                <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                  {booking.serviceEnd ? formatDateTime(booking.serviceEnd) : 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* Accepted quotation */}
      <section className="relative overflow-hidden rounded-[1.45rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.70),rgba(241,230,246,0.44))] p-4 shadow-[0_14px_38px_rgba(31,27,29,0.05)] backdrop-blur-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
        />

        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                  <ReceiptText aria-hidden="true" className="size-4" />
                </span>

                <span className="rounded-full border border-[rgba(89,133,113,0.18)] bg-[rgba(89,133,113,0.10)] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#3f735d]">
                  Accepted
                </span>

                <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                  Accepted quotation
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className="text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {servicePackage?.title ?? 'Custom vendor service'}
                </h3>

                <span className="status-chip" data-tone="gray">
                  Version {booking.acceptedQuotation.version}
                </span>

                {servicePackage?.category ? (
                  <span className="status-chip" data-tone="plum">
                    <Tags aria-hidden="true" className="size-3.5" />
                    {servicePackage.category.name}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 rounded-[1.15rem] border border-white/58 bg-white/38 px-4 py-3 lg:min-w-[13.5rem] lg:text-right">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                Agreed amount
              </p>

              <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                {formatCurrency(booking.agreedCost)}
              </p>

              <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/46">
                Final accepted service value
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/48 bg-white/28 px-3 py-2.5">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                Proposed price
              </p>
              <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                {formatCurrency(booking.acceptedQuotation.proposedPrice)}
              </p>
            </div>

            <div className="rounded-xl border border-white/48 bg-white/28 px-3 py-2.5">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                Deposit
              </p>
              <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                {booking.acceptedQuotation.depositAmount
                  ? formatCurrency(booking.acceptedQuotation.depositAmount)
                  : 'No deposit'}
              </p>
            </div>

            <div className="rounded-xl border border-white/48 bg-white/28 px-3 py-2.5">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                Base package
              </p>
              <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                {formatCurrency(servicePackage?.basePrice ?? null)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            <section className="rounded-[1.15rem] border border-[rgba(89,133,113,0.18)] bg-[rgba(222,238,228,0.30)] p-3.5">
              <div className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(89,133,113,0.16)] text-[#3f735d]">
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                </span>

                <p className="text-xs font-black text-[var(--color-near-black)]">Inclusions</p>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-[var(--color-charcoal)]/66">
                {booking.acceptedQuotation.inclusions}
              </p>
            </section>

            {booking.acceptedQuotation.exclusions ? (
              <section className="rounded-[1.15rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(245,225,230,0.28)] p-3.5">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                    <X aria-hidden="true" className="size-3.5" />
                  </span>

                  <p className="text-xs font-black text-[var(--color-near-black)]">Exclusions</p>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-[var(--color-charcoal)]/66">
                  {booking.acceptedQuotation.exclusions}
                </p>
              </section>
            ) : null}
          </div>

          {booking.acceptedQuotation.terms ? (
            <section className="mt-2 rounded-[1.15rem] border border-[rgba(175,201,216,0.24)] bg-[rgba(222,236,242,0.30)] px-3.5 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(175,201,216,0.26)] text-[#3b515b]">
                  <FileText aria-hidden="true" className="size-3.5" />
                </span>

                <div className="min-w-0">
                  <p className="text-xs font-black text-[var(--color-near-black)]">Terms</p>

                  <p className="mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-5 text-[var(--color-charcoal)]/66">
                    {booking.acceptedQuotation.terms}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </section>

      {/* Payment history */}
      <section className="relative overflow-hidden rounded-[1.45rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.70),rgba(225,237,243,0.42))] p-4 shadow-[0_14px_38px_rgba(31,27,29,0.05)] backdrop-blur-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl"
        />

        <div className="relative">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                  <Landmark aria-hidden="true" className="size-4" />
                </span>

                <span className="rounded-full border border-[rgba(175,201,216,0.28)] bg-[rgba(175,201,216,0.16)] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#3b515b]">
                  {paymentsCount} {paymentsCount === 1 ? 'payment' : 'payments'}
                </span>

                <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                  Deposit payments
                </span>
              </div>

              <div className="mt-2">
                <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                  Payment history
                </h3>

                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/56">
                  Review transfers, Stripe activity, verification results and payment documents.
                </p>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-white/54 bg-white/36 px-4 py-2.5 lg:min-w-[13.5rem] lg:text-right">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                Required deposit
              </p>

              <p className="mt-1 text-lg font-black text-[var(--color-near-black)]">
                {booking.acceptedQuotation.depositAmount
                  ? formatCurrency(booking.acceptedQuotation.depositAmount)
                  : 'No deposit'}
              </p>

              <p className="text-[0.65rem] font-semibold text-[var(--color-charcoal)]/44">
                Based on accepted quotation
              </p>
            </div>
          </div>

          {paymentsLoading ? (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/52 bg-white/24 px-4 py-5">
              <LoaderCircle className="size-5 animate-spin text-[var(--color-deep-plum)]" />
              <p className="text-xs font-bold text-[var(--color-charcoal)]/58">
                Loading payment history
              </p>
            </div>
          ) : null}

          {paymentsError ? (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-3.5"
            >
              <div className="flex items-start gap-3">
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-[var(--color-muted-burgundy)]">
                    Payment history unavailable
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/64">
                    {paymentsError}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-secondary shrink-0 text-xs font-bold"
                  onClick={onRetryPayments}
                >
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          {!paymentsLoading && !paymentsError && payments.length > 0 ? (
            <div className="mt-3 space-y-2">
              {payments.map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-[1.15rem] border border-white/60 bg-white/32 p-3.5"
                >
                  <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-chip" data-tone={getPaymentTone(payment.status)}>
                        {getPaymentStatusLabel(payment)}
                      </span>

                      <span className="status-chip" data-tone="gray">
                        {paymentMethodLabels[payment.method]}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                          Amount
                        </p>
                        <p className="mt-0.5 text-sm font-black text-[var(--color-near-black)]">
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                          Reference
                        </p>
                        <p className="mt-0.5 break-words text-xs font-black text-[var(--color-near-black)]">
                          {payment.referenceNumber}
                        </p>
                      </div>
                    </div>

                    <div className="lg:text-right">
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                        Submitted
                      </p>
                      <p className="mt-0.5 text-xs font-black text-[var(--color-near-black)]">
                        {formatDateTime(payment.createdAt)}
                      </p>
                    </div>
                  </div>

                  {payment.proofFileUrl ||
                  payment.proofFileOriginalName ||
                  payment.reviewedAt ||
                  payment.rejectionReason ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/52 pt-3">
                      {payment.proofFileUrl ? (
                        <a
                          href={payment.proofFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-xs font-bold"
                        >
                          <Download aria-hidden="true" className="size-3.5" />
                          View payment proof
                        </a>
                      ) : null}

                      {payment.proofFileOriginalName ? (
                        <span className="break-all text-[0.68rem] font-semibold text-[var(--color-charcoal)]/54">
                          {payment.proofFileOriginalName}
                          {payment.proofFileSize
                            ? ` · ${formatFileSize(payment.proofFileSize)}`
                            : ''}
                        </span>
                      ) : null}

                      {payment.reviewedAt ? (
                        <span className="text-[0.68rem] font-bold text-[var(--color-charcoal)]/46">
                          Reviewed {formatDateTime(payment.reviewedAt)}
                        </span>
                      ) : null}

                      {payment.rejectionReason ? (
                        <div className="w-full rounded-xl border border-[rgba(124,74,90,0.20)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                          <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[var(--color-muted-burgundy)]">
                            Rejection reason
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/68">
                            {payment.rejectionReason}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          {!paymentsLoading && !paymentsError && payments.length === 0 ? (
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-dashed border-white/75 bg-white/28 px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                <WalletCards aria-hidden="true" className="size-4" />
              </span>

              <div>
                <p className="text-xs font-black text-[var(--color-near-black)]">
                  No payments submitted
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/58">
                  Deposit-payment actions become available after the vendor confirms the booking and
                  the accepted quotation requires a deposit.
                </p>
              </div>
            </div>
          ) : null}

          {canSubmitManualDeposit || canStartStripeCheckout ? (
            <div className="mt-3 flex flex-col gap-3 rounded-[1.15rem] border border-[rgba(93,58,85,0.16)] bg-[rgba(239,229,244,0.44)] p-3.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                  <CreditCard aria-hidden="true" className="size-3.5" />
                </span>

                <div className="min-w-0">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.15em] text-[var(--color-rosewood)]">
                    Deposit required
                  </p>

                  <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-[var(--color-charcoal)]/62">
                    {pendingStripePayment
                      ? 'Your Stripe checkout has started but has not been completed yet.'
                      : 'Submit your bank-transfer reference with an optional receipt, or continue securely through Stripe Checkout.'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {canSubmitManualDeposit ? (
                  <button
                    type="button"
                    className="btn-primary justify-center text-xs font-bold"
                    onClick={() => {
                      onOpenPayment(booking);
                    }}
                  >
                    <Landmark aria-hidden="true" className="size-3.5" />
                    Submit bank transfer
                  </button>
                ) : null}

                {canStartStripeCheckout ? (
                  <button
                    type="button"
                    className="btn-secondary justify-center text-xs font-bold"
                    disabled={stripeCheckoutPending}
                    onClick={() => {
                      onStripeCheckout(booking);
                    }}
                  >
                    {stripeCheckoutPending ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <CreditCard aria-hidden="true" className="size-3.5" />
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
                  className="w-full rounded-xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-3 py-2 text-xs font-bold text-[var(--color-muted-burgundy)] lg:basis-full"
                >
                  {stripeCheckoutError}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* Vendor response */}
      {booking.vendorResponseNote ? (
        <section className="relative overflow-hidden rounded-[1.35rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(220,235,242,0.40))] p-4 shadow-[0_12px_34px_rgba(31,27,29,0.045)] backdrop-blur-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                <FileText aria-hidden="true" className="size-4" />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-[var(--color-rosewood)]">
                    Vendor response
                  </span>

                  <span className="rounded-full border border-[rgba(175,201,216,0.28)] bg-[rgba(175,201,216,0.16)] px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#3b515b]">
                    Vendor note
                  </span>
                </div>

                <h3 className="mt-1 text-base font-black text-[var(--color-near-black)]">
                  Update from {booking.vendor.businessName}
                </h3>

                <p className="mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-5 text-[var(--color-charcoal)]/66">
                  {booking.vendorResponseNote}
                </p>
              </div>
            </div>

            {booking.vendorRespondedAt ? (
              <div className="shrink-0 rounded-xl border border-white/52 bg-white/34 px-3 py-2 lg:text-right">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                  Responded
                </p>

                <p className="mt-0.5 text-xs font-black text-[var(--color-near-black)]">
                  {formatDateTime(booking.vendorRespondedAt)}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Cancellation state */}
      {cancellation ? (
        <section className="rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(249,238,242,0.56)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                <Ban aria-hidden="true" className="size-4" />
              </span>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--color-muted-burgundy)]">
                    {cancellation.label}
                  </span>
                  <span className="status-chip" data-tone="red">
                    Booking ended
                  </span>
                </div>

                <h3 className="mt-1.5 text-base font-black text-[var(--color-near-black)]">
                  This vendor commitment was cancelled.
                </h3>

                <p className="mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-5 text-[var(--color-charcoal)]/66">
                  <span className="font-black text-[var(--color-muted-burgundy)]">
                    Cancellation reason:
                  </span>{' '}
                  {cancellation.reason}
                </p>
              </div>
            </div>

            {cancellation.cancelledAt ? (
              <div className="shrink-0 rounded-xl border border-white/52 bg-white/34 px-3 py-2 sm:text-right">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                  Cancelled
                </p>
                <p className="mt-0.5 text-xs font-black text-[var(--color-near-black)]">
                  {formatDateTime(cancellation.cancelledAt)}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Completion state */}
      {booking.vendorCompletedAt ? (
        <section className="rounded-[1.35rem] border border-[rgba(89,133,113,0.22)] bg-[rgba(234,246,239,0.58)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(89,133,113,0.16)] text-[#3f735d]">
                <CheckCircle2 aria-hidden="true" className="size-4" />
              </span>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#3f735d]">
                    Service completed
                  </span>

                  <span className="rounded-full border border-[rgba(89,133,113,0.20)] bg-[rgba(89,133,113,0.11)] px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#3f735d]">
                    Service delivered
                  </span>
                </div>

                <h3 className="mt-1.5 text-base font-black text-[var(--color-near-black)]">
                  This vendor commitment is complete.
                </h3>

                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/62">
                  The vendor confirmed that the agreed service was delivered for this event.
                </p>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-white/52 bg-white/34 px-3 py-2 sm:text-right">
              <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                Completed
              </p>

              <p className="mt-0.5 text-xs font-black text-[var(--color-near-black)]">
                {formatDateTime(booking.vendorCompletedAt)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Review */}
      {booking.status === 'COMPLETED' ? (
        <section className="rounded-[1.35rem] border border-[rgba(130,72,77,0.20)] bg-[rgba(249,236,230,0.56)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(130,72,77,0.13)] text-[var(--color-rosewood)]">
                <Star aria-hidden="true" className="size-4 fill-current" />
              </span>

              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                  Vendor review
                </p>

                <h3 className="mt-1 text-base font-black text-[var(--color-near-black)]">
                  {hasReview ? 'You reviewed this completed service.' : 'How was your experience?'}
                </h3>

                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/62">
                  {hasReview
                    ? 'Your verified review is available in this event’s Reviews workspace.'
                    : 'Share an overall rating and optional feedback about the service quality and vendor communication.'}
                </p>
              </div>
            </div>

            {hasReview ? (
              <Link
                to={`/events/${booking.event.id}/reviews`}
                className="btn-secondary shrink-0 justify-center text-xs font-bold"
              >
                <Star aria-hidden="true" className="size-3.5 fill-current" />
                View review
              </Link>
            ) : (
              <button
                type="button"
                className="btn-primary shrink-0 justify-center text-xs font-bold"
                onClick={() => {
                  onOpenReview(booking);
                }}
              >
                <Star aria-hidden="true" className="size-3.5 fill-current" />
                Write review
              </button>
            )}
          </div>
        </section>
      ) : null}

      {/* Cancel action */}
      {isCustomerCancellable(booking.status) ? (
        <section className="rounded-[1.25rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(249,238,242,0.48)] px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                <Ban aria-hidden="true" className="size-3.5" />
              </span>

              <div className="min-w-0">
                <p className="text-xs font-black text-[var(--color-near-black)]">
                  Need to end this vendor commitment?
                </p>

                <p className="mt-0.5 text-[0.7rem] font-semibold leading-5 text-[var(--color-charcoal)]/56">
                  Cancellation remains available while this booking is awaiting confirmation,
                  confirmed, deposit pending or active.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[rgba(124,74,90,0.24)] bg-[rgba(124,74,90,0.08)] px-3.5 py-2 text-xs font-black text-[var(--color-muted-burgundy)] transition duration-300 hover:bg-[rgba(124,74,90,0.14)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canMutateBooking}
              title={!canMutateBooking ? (bookingLockedMessage ?? undefined) : undefined}
              onClick={() => {
                if (!canMutateBooking) {
                  return;
                }

                onCancel(booking);
              }}
            >
              <Ban aria-hidden="true" className="size-3.5" />
              Cancel booking
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
