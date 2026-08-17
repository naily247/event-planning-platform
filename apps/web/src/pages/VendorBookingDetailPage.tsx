import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  LoaderCircle,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldAlert,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  cancelVendorBooking,
  completeVendorBooking,
  confirmVendorBooking,
  getVendorBookingById,
  rejectVendorBooking,
  type BookingStatus,
  type VendorBooking,
} from '../features/bookings/booking.api';
import { PageBackButton } from '../components/navigation/PageBackButton';

type ActionDialog = 'CONFIRM' | 'REJECT' | 'CANCEL' | 'COMPLETE' | null;

const bookingStatusLabels: Record<BookingStatus, string> = {
  AWAITING_VENDOR_CONFIRMATION: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  DEPOSIT_PENDING: 'Deposit pending',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  DISPUTED: 'Disputed',
};

const bookingStatusStyles: Record<BookingStatus, string> = {
  AWAITING_VENDOR_CONFIRMATION: 'border-amber-200 bg-amber-50 text-amber-700',
  CONFIRMED: 'border-sky-200 bg-sky-50 text-sky-700',
  DEPOSIT_PENDING: 'border-orange-200 bg-orange-50 text-orange-700',
  ACTIVE: 'border-violet-200 bg-violet-50 text-violet-700',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CANCELLED: 'border-zinc-200 bg-zinc-100 text-zinc-600',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
  DISPUTED: 'border-rose-200 bg-rose-50 text-rose-700',
};

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatMoney(value: string | null) {
  if (!value) {
    return 'Not specified';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(amount);
}

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

  return 'Unable to process this booking action.';
}

function getCustomerName(booking: VendorBooking) {
  const name = `${booking.event.owner.firstName} ${booking.event.owner.lastName}`.trim();

  return name || booking.event.owner.email;
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-white/58 bg-white/30 p-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
        <Icon className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/40">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-black leading-6 text-[var(--color-near-black)]">
          {value}
        </p>
      </div>
    </div>
  );
}

function TextSection({
  title,
  value,
  emptyText,
}: {
  title: string;
  value: string | null;
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
        {title}
      </h3>

      <div className="mt-2 rounded-[1.25rem] border border-white/58 bg-white/30 p-4">
        <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--color-charcoal)]/64">
          {value || emptyText}
        </p>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="glass-card p-8">
        <div className="h-6 w-40 rounded bg-zinc-200" />
        <div className="mt-5 h-10 w-2/3 rounded bg-zinc-200" />
        <div className="mt-4 h-5 w-1/2 rounded bg-zinc-200" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="space-y-6">
          <div className="glass-card h-72" />
          <div className="glass-card h-80" />
        </div>

        <div className="space-y-6">
          <div className="glass-card h-80" />
          <div className="glass-card h-64" />
        </div>
      </div>
    </div>
  );
}

export function VendorBookingDetailPage() {
  const { bookingId } = useParams<{
    bookingId: string;
  }>();

  const queryClient = useQueryClient();

  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);

  const bookingQuery = useQuery({
    queryKey: ['vendor-booking', bookingId],
    queryFn: () => getVendorBookingById(bookingId as string),
    enabled: Boolean(bookingId),
  });

  function updateBookingCache(updatedBooking: VendorBooking) {
    queryClient.setQueryData(['vendor-booking', bookingId], updatedBooking);

    void queryClient.invalidateQueries({
      queryKey: ['vendor-bookings'],
    });

    void queryClient.invalidateQueries({
      queryKey: ['vendor-dashboard'],
    });
  }

  function resetDialog() {
    setActionDialog(null);
    setConfirmNote('');
    setReason('');
    setFormError('');
    setShowDiscardConfirmation(false);
  }

  function hasUnsavedDialogInput() {
    if (actionDialog === 'CONFIRM') {
      return confirmNote.trim().length > 0;
    }

    if (actionDialog === 'REJECT' || actionDialog === 'CANCEL') {
      return reason.trim().length > 0;
    }

    return false;
  }

  function requestCloseDialog() {
    if (isActionPending) {
      return;
    }

    if (hasUnsavedDialogInput()) {
      setShowDiscardConfirmation(true);
      return;
    }

    resetDialog();
  }

  function discardDialogInput() {
    if (isActionPending) {
      return;
    }

    resetDialog();
  }

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmVendorBooking(bookingId as string, {
        note: confirmNote.trim() || null,
      }),
    onSuccess: (updatedBooking) => {
      updateBookingCache(updatedBooking);
      resetDialog();
      setSuccessMessage('Booking confirmed successfully.');
      setOperationError('');
    },
    onError: (error) => {
      setFormError(getErrorMessage(error));
      setOperationError('');
      setSuccessMessage('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      rejectVendorBooking(bookingId as string, {
        reason: reason.trim(),
      }),
    onSuccess: (updatedBooking) => {
      updateBookingCache(updatedBooking);
      resetDialog();
      setSuccessMessage('Booking rejected successfully.');
      setOperationError('');
    },
    onError: (error) => {
      setFormError(getErrorMessage(error));
      setOperationError('');
      setSuccessMessage('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      cancelVendorBooking(bookingId as string, {
        reason: reason.trim(),
      }),
    onSuccess: (updatedBooking) => {
      updateBookingCache(updatedBooking);
      resetDialog();
      setSuccessMessage('Booking cancelled successfully.');
      setOperationError('');
    },
    onError: (error) => {
      setFormError(getErrorMessage(error));
      setOperationError('');
      setSuccessMessage('');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeVendorBooking(bookingId as string),
    onSuccess: (updatedBooking) => {
      updateBookingCache(updatedBooking);
      resetDialog();
      setSuccessMessage('Booking marked as completed.');
      setOperationError('');
    },
    onError: (error) => {
      setFormError(getErrorMessage(error));
      setOperationError('');
      setSuccessMessage('');
    },
  });

  const isActionPending =
    confirmMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    completeMutation.isPending;

  function openDialog(dialog: Exclude<ActionDialog, null>) {
    setActionDialog(dialog);
    setConfirmNote('');
    setReason('');
    setFormError('');
    setOperationError('');
    setSuccessMessage('');
    setShowDiscardConfirmation(false);

    confirmMutation.reset();
    rejectMutation.reset();
    cancelMutation.reset();
    completeMutation.reset();
  }

  function handleConfirmBooking() {
    const note = confirmNote.trim();

    if (note.length > 0 && note.length < 3) {
      setFormError('Confirmation note must contain at least 3 characters.');
      return;
    }

    if (note.length > 2000) {
      setFormError('Confirmation note cannot exceed 2000 characters.');
      return;
    }

    confirmMutation.mutate();
  }

  function handleReasonAction() {
    const trimmedReason = reason.trim();

    if (trimmedReason.length < 10) {
      setFormError(
        `${
          actionDialog === 'REJECT' ? 'Rejection' : 'Cancellation'
        } reason must contain at least 10 characters.`,
      );
      return;
    }

    if (trimmedReason.length > 2000) {
      setFormError(
        `${
          actionDialog === 'REJECT' ? 'Rejection' : 'Cancellation'
        } reason cannot exceed 2000 characters.`,
      );
      return;
    }

    if (actionDialog === 'REJECT') {
      rejectMutation.mutate();
      return;
    }

    if (actionDialog === 'CANCEL') {
      cancelMutation.mutate();
    }
  }

  if (!bookingId) {
    return (
      <main className="workspace-shell grid min-h-screen place-items-center px-4 py-8">
        <div className="glass-card relative mx-auto max-w-3xl overflow-hidden p-8 text-center sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-red-100/70 blur-3xl" />
          <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle className="size-6" />
          </div>

          <h1 className="relative mt-5 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
            Invalid booking
          </h1>

          <PageBackButton fallback="/vendor/bookings" label="Bookings" className="w-fit" />
        </div>
      </main>
    );
  }

  const booking = bookingQuery.data;

  const canConfirm = booking?.status === 'AWAITING_VENDOR_CONFIRMATION';

  const canReject = booking?.status === 'AWAITING_VENDOR_CONFIRMATION';

  const canCancel = booking && ['CONFIRMED', 'DEPOSIT_PENDING', 'ACTIVE'].includes(booking.status);

  const canComplete = booking?.status === 'ACTIVE';

  const depositAmount = booking?.acceptedQuotation.depositAmount ?? null;

  const remainingBalance = useMemo(() => {
    if (!booking) {
      return null;
    }

    const agreedCost = Number(booking.agreedCost);
    const deposit = Number(booking.acceptedQuotation.depositAmount ?? 0);

    if (!Number.isFinite(agreedCost) || !Number.isFinite(deposit)) {
      return null;
    }

    return agreedCost - deposit;
  }, [booking]);

  return (
    <main className="workspace-shell relative">
      <div className="workspace-container w-full max-w-7xl">
        <header className="relative overflow-visible rounded-[1.75rem] border border-white/55 bg-white/34 p-4 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative flex min-w-0 items-center gap-4">
            <PageBackButton fallback="/vendor/bookings" label="Bookings" className="shrink-0" />

            <div className="min-w-0 border-l border-[rgba(93,58,85,0.12)] pl-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <h1 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-2xl">
                Booking details
              </h1>
            </div>
          </div>
        </header>

        <div className="pb-10 pt-6">
          {bookingQuery.isLoading ? (
            <PageSkeleton />
          ) : bookingQuery.isError || !booking ? (
            <section className="grid min-h-72 place-items-center rounded-[2rem] border border-red-200/70 bg-red-50/55 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.06)]">
              <div className="max-w-lg">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600">
                  <AlertCircle className="size-6" />
                </div>

                <h1 className="mt-5 text-2xl font-black tracking-[-0.04em] text-red-900">
                  Booking could not be loaded
                </h1>

                <p className="mt-3 text-sm leading-7 text-red-700">
                  {getErrorMessage(bookingQuery.error)}
                </p>

                <button
                  type="button"
                  onClick={() => bookingQuery.refetch()}
                  className="mt-6 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white transition hover:bg-red-800"
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_24px_70px_rgba(64,42,51,0.10)] backdrop-blur-2xl">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-[rgba(183,167,200,0.23)] blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-36 left-[28%] size-72 rounded-full bg-[rgba(142,92,103,0.10)] blur-3xl"
                />

                <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:p-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-[0.68rem] font-black ${
                          bookingStatusStyles[booking.status]
                        }`}
                      >
                        {bookingStatusLabels[booking.status]}
                      </span>

                      <span className="soft-chip text-xs font-black uppercase tracking-[0.14em]">
                        {booking.event.eventType}
                      </span>
                    </div>

                    <p className="mt-6 text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                      Customer booking
                    </p>

                    <h2 className="mt-3 max-w-3xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                      {booking.event.name}
                    </h2>

                    <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66">
                      Review the service schedule, accepted quotation, customer details and current
                      booking status from one place.
                    </p>

                    <div className="mt-7 flex flex-wrap gap-2.5">
                      <span className="soft-chip text-xs font-black">
                        <CalendarDays className="size-4" />
                        Starts {formatDateTime(booking.serviceStart)}
                      </span>

                      <span className="soft-chip text-xs font-black">
                        <UserRound className="size-4" />
                        {getCustomerName(booking)}
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
                            Booking summary
                          </p>

                          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                            Current commitment
                          </h3>
                        </div>

                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                          <BriefcaseBusiness className="size-5" />
                        </div>
                      </div>

                      <div className="mt-6 rounded-[1.25rem] border border-white/62 bg-white/34 p-4">
                        <p className="text-[0.64rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/38">
                          Agreed cost
                        </p>

                        <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                          {formatMoney(booking.agreedCost)}
                        </p>
                      </div>

                      <div className="mt-3 rounded-[1.25rem] border border-white/62 bg-white/34 p-4">
                        <p className="text-[0.64rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/38">
                          Current status
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${
                              bookingStatusStyles[booking.status]
                            }`}
                          >
                            {bookingStatusLabels[booking.status]}
                          </span>

                          <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                            Updated {formatDateTime(booking.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              {successMessage ? (
                <div className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-5">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />

                  <p className="text-sm font-bold leading-6 text-emerald-800">{successMessage}</p>
                </div>
              ) : null}

              {operationError ? (
                <div className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-red-200 bg-red-50/70 p-5">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-700" />

                  <p className="text-sm font-bold leading-6 text-red-800">{operationError}</p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.38fr_0.72fr]">
                <div className="space-y-6">
                  <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <CalendarDays className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Service schedule
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Booking details
                        </h2>

                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          Confirm the service timing, location and current booking state.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:grid-cols-2">
                      <DetailItem
                        icon={CalendarDays}
                        label="Service starts"
                        value={formatDateTime(booking.serviceStart)}
                      />

                      <DetailItem
                        icon={Clock3}
                        label="Service ends"
                        value={
                          booking.serviceEnd
                            ? formatDateTime(booking.serviceEnd)
                            : 'No end time provided'
                        }
                      />

                      <DetailItem
                        icon={MapPin}
                        label="Location"
                        value={booking.event.location || 'Location not provided'}
                      />

                      <DetailItem
                        icon={BriefcaseBusiness}
                        label="Booking status"
                        value={bookingStatusLabels[booking.status]}
                      />
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Package className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Accepted quotation
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Package and service scope
                        </h2>

                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          Review the service package and the exact scope agreed with the customer.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-[1.55rem] border border-white/58 bg-white/30 p-5 sm:p-6">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                            Selected service
                          </p>

                          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                            {booking.acceptedQuotation.quotationRequest.package?.title ||
                              'Custom service'}
                          </h3>

                          <span className="soft-chip mt-3 w-fit text-xs font-black">
                            <Package className="size-3.5" />
                            {booking.acceptedQuotation.quotationRequest.package?.category?.name ||
                              'Event service'}
                          </span>
                        </div>

                        <div className="shrink-0 rounded-[1.25rem] border border-white/60 bg-white/38 px-5 py-4">
                          <p className="text-[0.63rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                            Quoted price
                          </p>

                          <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                            {formatMoney(booking.acceptedQuotation.proposedPrice)}
                          </p>
                        </div>
                      </div>

                      {booking.acceptedQuotation.quotationRequest.package?.description ? (
                        <p className="mt-5 whitespace-pre-wrap border-t border-[rgba(93,58,85,0.08)] pt-5 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
                          {booking.acceptedQuotation.quotationRequest.package.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-6 grid gap-5">
                      <TextSection
                        title="Customer requirements"
                        value={booking.acceptedQuotation.quotationRequest.requirements}
                        emptyText="No additional customer requirements were provided."
                      />

                      <TextSection
                        title="Inclusions"
                        value={booking.acceptedQuotation.inclusions}
                        emptyText="No inclusions were recorded."
                      />

                      <TextSection
                        title="Exclusions"
                        value={booking.acceptedQuotation.exclusions}
                        emptyText="No exclusions were recorded."
                      />

                      <TextSection
                        title="Terms"
                        value={booking.acceptedQuotation.terms}
                        emptyText="No additional terms were recorded."
                      />
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <FileCheck2 className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Booking record
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Status timeline
                        </h2>

                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          Important changes and actions recorded throughout this booking.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:grid-cols-2">
                      <DetailItem
                        icon={CalendarDays}
                        label="Booking created"
                        value={formatDateTime(booking.createdAt)}
                      />

                      {booking.vendorRespondedAt ? (
                        <DetailItem
                          icon={FileCheck2}
                          label="Vendor responded"
                          value={formatDateTime(booking.vendorRespondedAt)}
                        />
                      ) : null}

                      {booking.vendorCancelledAt ? (
                        <DetailItem
                          icon={Ban}
                          label="Vendor cancelled"
                          value={formatDateTime(booking.vendorCancelledAt)}
                        />
                      ) : null}

                      {booking.customerCancelledAt ? (
                        <DetailItem
                          icon={Ban}
                          label="Customer cancelled"
                          value={formatDateTime(booking.customerCancelledAt)}
                        />
                      ) : null}

                      {booking.vendorCompletedAt ? (
                        <DetailItem
                          icon={CheckCircle2}
                          label="Service completed"
                          value={formatDateTime(booking.vendorCompletedAt)}
                        />
                      ) : null}

                      <DetailItem
                        icon={Clock3}
                        label="Last updated"
                        value={formatDateTime(booking.updatedAt)}
                      />
                    </div>

                    {booking.vendorResponseNote ? (
                      <div className="mt-6 border-t border-[rgba(93,58,85,0.08)] pt-6">
                        <TextSection
                          title="Vendor response note"
                          value={booking.vendorResponseNote}
                          emptyText="No response note recorded."
                        />
                      </div>
                    ) : null}

                    {booking.vendorCancellationReason ? (
                      <div className="mt-5">
                        <TextSection
                          title="Vendor cancellation reason"
                          value={booking.vendorCancellationReason}
                          emptyText="No cancellation reason recorded."
                        />
                      </div>
                    ) : null}

                    {booking.customerCancellationReason ? (
                      <div className="mt-5">
                        <TextSection
                          title="Customer cancellation reason"
                          value={booking.customerCancellationReason}
                          emptyText="No cancellation reason recorded."
                        />
                      </div>
                    ) : null}
                  </section>
                </div>

                <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                  <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <UserRound className="size-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Customer
                        </p>

                        <h2 className="mt-2 break-words text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          {getCustomerName(booking)}
                        </h2>

                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/54">
                          Primary customer for this booking.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <DetailItem icon={Mail} label="Email" value={booking.event.owner.email} />

                      <DetailItem
                        icon={Phone}
                        label="Phone"
                        value={booking.event.owner.phone || 'Phone number not provided'}
                      />
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[2rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(240,231,238,0.48))] p-5 shadow-[0_18px_48px_rgba(35,24,30,0.08)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <CircleDollarSign className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Financial summary
                        </p>

                        <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          Booking value
                        </h2>
                      </div>
                    </div>

                    <dl className="mt-5 space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-[1.15rem] border border-white/58 bg-white/30 px-4 py-3.5">
                        <dt className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                          Agreed cost
                        </dt>

                        <dd className="text-sm font-black text-[var(--color-near-black)]">
                          {formatMoney(booking.agreedCost)}
                        </dd>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-[1.15rem] border border-white/58 bg-white/30 px-4 py-3.5">
                        <dt className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                          Deposit
                        </dt>

                        <dd className="text-sm font-black text-[var(--color-near-black)]">
                          {depositAmount ? formatMoney(depositAmount) : 'Not required'}
                        </dd>
                      </div>

                      <div className="rounded-[1.25rem] bg-[var(--color-deep-plum)] p-4 shadow-[0_14px_34px_rgba(91,61,82,0.20)]">
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-sm font-bold text-white/72">Remaining balance</dt>

                          <dd className="text-lg font-black text-white">
                            {remainingBalance !== null
                              ? formatMoney(remainingBalance.toString())
                              : 'Not available'}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </section>

                  {canConfirm || canReject || canCancel || canComplete ? (
                    <section className="relative overflow-hidden rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Booking actions
                      </p>

                      <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        Manage this commitment
                      </h2>

                      <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/54">
                        Only actions valid for the current booking status are available.
                      </p>

                      <div className="mt-5 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-5">
                        {canConfirm ? (
                          <button
                            type="button"
                            onClick={() => openDialog('CONFIRM')}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-5 py-3.5 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white"
                          >
                            <CheckCircle2 className="size-4 text-white" />
                            <span className="text-white">Confirm booking</span>
                          </button>
                        ) : null}

                        {canReject ? (
                          <button
                            type="button"
                            onClick={() => openDialog('REJECT')}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200/80 bg-red-50/60 px-5 py-3.5 text-sm font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100"
                          >
                            <XCircle className="size-4" />
                            Reject booking
                          </button>
                        ) : null}

                        {canComplete ? (
                          <button
                            type="button"
                            onClick={() => openDialog('COMPLETE')}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3.5 text-sm font-black !text-white shadow-[0_14px_32px_rgba(4,120,87,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-800 hover:!text-white"
                          >
                            <CheckCircle2 className="size-4 text-white" />
                            <span className="text-white">Mark as completed</span>
                          </button>
                        ) : null}

                        {canCancel ? (
                          <button
                            type="button"
                            onClick={() => openDialog('CANCEL')}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200/80 bg-red-50/60 px-5 py-3.5 text-sm font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100"
                          >
                            <Ban className="size-4" />
                            Cancel booking
                          </button>
                        ) : null}
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(220,186,167,0.20)] text-[var(--color-rosewood)]">
                        <ShieldAlert className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Booking guidance
                        </p>

                        <h2 className="mt-2 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                          Protect customer commitments
                        </h2>
                      </div>
                    </div>

                    <p className="mt-5 text-sm font-medium leading-7 text-[var(--color-charcoal)]/60">
                      Confirm only when the date and service scope are feasible. Rejections and
                      cancellations require a clear reason and remain permanently recorded.
                    </p>
                  </section>

                  <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Record information
                    </p>

                    <dl className="mt-5 grid gap-3">
                      <div className="rounded-[1.15rem] border border-white/58 bg-white/30 p-4">
                        <dt className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/40">
                          Booking ID
                        </dt>

                        <dd className="mt-2 break-all text-xs font-semibold leading-5 text-[var(--color-charcoal)]/62">
                          {booking.id}
                        </dd>
                      </div>

                      <div className="rounded-[1.15rem] border border-white/58 bg-white/30 p-4">
                        <dt className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/40">
                          Quotation version
                        </dt>

                        <dd className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                          Version {booking.acceptedQuotation.version}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>

        {actionDialog && booking ? (
          <div
            className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.58)] px-4 py-6 backdrop-blur-md sm:py-8"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                requestCloseDialog();
              }
            }}
          >
            <div className="mx-auto flex min-h-full w-full max-w-lg items-center justify-center">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="booking-action-title"
                className="relative w-full overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.98)] shadow-[0_34px_100px_rgba(27,17,23,0.38)] backdrop-blur-2xl"
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
              >
                <div
                  aria-hidden="true"
                  className={[
                    'pointer-events-none absolute -right-20 -top-24 size-56 rounded-full blur-3xl',
                    actionDialog === 'CONFIRM' || actionDialog === 'COMPLETE'
                      ? 'bg-emerald-100/55'
                      : 'bg-red-100/60',
                  ].join(' ')}
                />

                <div className="relative border-b border-[rgba(93,58,85,0.08)] px-6 py-6 sm:px-7">
                  <div className="flex items-start justify-between gap-5">
                    <div
                      className={[
                        'grid size-12 shrink-0 place-items-center rounded-[1.1rem]',
                        actionDialog === 'CONFIRM' || actionDialog === 'COMPLETE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700',
                      ].join(' ')}
                    >
                      {actionDialog === 'CONFIRM' ? <CheckCircle2 className="size-5" /> : null}

                      {actionDialog === 'REJECT' ? <XCircle className="size-5" /> : null}

                      {actionDialog === 'CANCEL' ? <Ban className="size-5" /> : null}

                      {actionDialog === 'COMPLETE' ? <FileCheck2 className="size-5" /> : null}
                    </div>

                    <button
                      type="button"
                      aria-label="Close booking action"
                      disabled={isActionPending}
                      onClick={requestCloseDialog}
                      className="grid size-10 shrink-0 place-items-center rounded-full border border-white/65 bg-white/42 text-[var(--color-charcoal)]/62 shadow-sm transition hover:bg-white/72 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <XCircle className="size-4.5" />
                    </button>
                  </div>

                  <p
                    className={[
                      'mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em]',
                      actionDialog === 'CONFIRM' || actionDialog === 'COMPLETE'
                        ? 'text-emerald-700'
                        : 'text-red-600',
                    ].join(' ')}
                  >
                    {actionDialog === 'CONFIRM' ? 'Booking confirmation' : null}
                    {actionDialog === 'REJECT' ? 'Booking rejection' : null}
                    {actionDialog === 'CANCEL' ? 'Booking cancellation' : null}
                    {actionDialog === 'COMPLETE' ? 'Service completion' : null}
                  </p>

                  <h2
                    id="booking-action-title"
                    className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
                  >
                    {actionDialog === 'CONFIRM' ? 'Confirm this booking?' : null}
                    {actionDialog === 'REJECT' ? 'Reject this booking?' : null}
                    {actionDialog === 'CANCEL' ? 'Cancel this booking?' : null}
                    {actionDialog === 'COMPLETE' ? 'Mark this booking as completed?' : null}
                  </h2>

                  <p className="mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
                    {actionDialog === 'CONFIRM'
                      ? 'Confirm that you can provide the accepted service on the agreed schedule.'
                      : null}

                    {actionDialog === 'REJECT'
                      ? 'The customer will be informed that you cannot accept this booking request.'
                      : null}

                    {actionDialog === 'CANCEL'
                      ? 'This affects an accepted customer commitment. Your reason will remain permanently in the booking record.'
                      : null}

                    {actionDialog === 'COMPLETE'
                      ? 'Only complete the booking after the agreed service has actually been delivered.'
                      : null}
                  </p>
                </div>

                <div className="relative px-6 py-6 sm:px-7">
                  <div className="rounded-[1.3rem] border border-white/62 bg-white/38 p-4">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                      Booking
                    </p>

                    <p className="mt-2 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                      {booking.event.name}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="text-xs font-semibold text-[var(--color-charcoal)]/52">
                        {getCustomerName(booking)}
                      </span>

                      <span className="text-xs font-semibold text-[var(--color-charcoal)]/52">
                        {formatDateTime(booking.serviceStart)}
                      </span>
                    </div>
                  </div>

                  {actionDialog === 'CONFIRM' ? (
                    <label className="mt-5 block">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-near-black)]">
                          Confirmation note
                          <span className="ml-2 font-semibold text-[var(--color-charcoal)]/40">
                            Optional
                          </span>
                        </span>

                        <span
                          className={[
                            'text-xs font-bold',
                            confirmNote.length > 2000
                              ? 'text-red-700'
                              : 'text-[var(--color-charcoal)]/40',
                          ].join(' ')}
                        >
                          {confirmNote.length}/2000
                        </span>
                      </div>

                      <textarea
                        rows={5}
                        value={confirmNote}
                        disabled={isActionPending}
                        onChange={(event) => {
                          setConfirmNote(event.target.value);
                          setFormError('');
                        }}
                        placeholder="Add useful confirmation details for the customer..."
                        className="form-field mt-2 min-h-32 resize-y bg-white/55 leading-7"
                      />

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                        Optional notes can include arrival instructions, preparation details, or
                        another useful service reminder.
                      </p>
                    </label>
                  ) : null}

                  {actionDialog === 'REJECT' || actionDialog === 'CANCEL' ? (
                    <label className="mt-5 block">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-near-black)]">
                          {actionDialog === 'REJECT' ? 'Rejection reason' : 'Cancellation reason'}
                        </span>

                        <span
                          className={[
                            'text-xs font-bold',
                            reason.length > 2000
                              ? 'text-red-700'
                              : 'text-[var(--color-charcoal)]/40',
                          ].join(' ')}
                        >
                          {reason.length}/2000
                        </span>
                      </div>

                      <textarea
                        rows={6}
                        value={reason}
                        disabled={isActionPending}
                        onChange={(event) => {
                          setReason(event.target.value);
                          setFormError('');
                        }}
                        placeholder={
                          actionDialog === 'REJECT'
                            ? 'Explain clearly why this booking cannot be accepted...'
                            : 'Explain clearly why this booking must be cancelled...'
                        }
                        className="form-field mt-2 min-h-36 resize-y bg-white/55 leading-7"
                      />

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                        Minimum 10 characters. This explanation becomes part of the booking record.
                      </p>
                    </label>
                  ) : null}

                  {actionDialog === 'COMPLETE' ? (
                    <div className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-emerald-200/75 bg-emerald-50/65 p-4">
                      <FileCheck2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />

                      <div>
                        <p className="text-sm font-black text-emerald-900">
                          Confirm service delivery
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">
                          Completing the booking records that your side of the agreed service has
                          been delivered.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {actionDialog === 'CANCEL' ? (
                    <div className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-red-200/80 bg-red-50/70 p-4">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-red-700" />

                      <div>
                        <p className="text-sm font-black text-red-900">
                          Existing customer commitment
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-red-700">
                          Cancellation can affect the customer's event planning and will remain
                          visible in the booking history.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {formError ? (
                    <div
                      role="alert"
                      className="mt-5 flex items-start gap-3 rounded-[1.2rem] border border-red-200 bg-red-50 p-4"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-700" />

                      <p className="text-xs font-bold leading-5 text-red-700">{formError}</p>
                    </div>
                  ) : null}
                </div>

                <div className="relative border-t border-[rgba(93,58,85,0.08)] bg-white/38 px-6 py-5 backdrop-blur-xl sm:px-7">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={requestCloseDialog}
                      className="btn-secondary justify-center text-sm font-black"
                    >
                      Go back
                    </button>

                    <button
                      type="button"
                      disabled={isActionPending}
                      onClick={() => {
                        if (actionDialog === 'CONFIRM') {
                          handleConfirmBooking();
                          return;
                        }

                        if (actionDialog === 'REJECT' || actionDialog === 'CANCEL') {
                          handleReasonAction();
                          return;
                        }

                        if (actionDialog === 'COMPLETE') {
                          completeMutation.mutate();
                        }
                      }}
                      className={[
                        'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(49,35,42,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
                        actionDialog === 'CONFIRM' || actionDialog === 'COMPLETE'
                          ? 'bg-emerald-700 hover:bg-emerald-800'
                          : 'bg-red-700 hover:bg-red-800',
                      ].join(' ')}
                    >
                      {isActionPending ? (
                        <LoaderCircle className="size-4 animate-spin text-white" />
                      ) : actionDialog === 'CONFIRM' ? (
                        <CheckCircle2 className="size-4 text-white" />
                      ) : actionDialog === 'REJECT' ? (
                        <XCircle className="size-4 text-white" />
                      ) : actionDialog === 'CANCEL' ? (
                        <Ban className="size-4 text-white" />
                      ) : (
                        <FileCheck2 className="size-4 text-white" />
                      )}

                      <span className="text-white">
                        {isActionPending
                          ? actionDialog === 'CONFIRM'
                            ? 'Confirming booking...'
                            : actionDialog === 'REJECT'
                              ? 'Rejecting booking...'
                              : actionDialog === 'CANCEL'
                                ? 'Cancelling booking...'
                                : 'Completing booking...'
                          : actionDialog === 'CONFIRM'
                            ? 'Confirm booking'
                            : actionDialog === 'REJECT'
                              ? 'Reject booking'
                              : actionDialog === 'CANCEL'
                                ? 'Cancel booking'
                                : 'Mark completed'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showDiscardConfirmation && actionDialog && booking ? (
          <div
            className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(31,27,29,0.62)] px-4 py-8 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-booking-action-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isActionPending) {
                setShowDiscardConfirmation(false);
              }
            }}
          >
            <div
              className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.98)] p-6 shadow-[0_34px_100px_rgba(27,17,23,0.40)] backdrop-blur-2xl sm:p-7"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-amber-100/55 blur-3xl"
              />

              <div className="relative grid size-12 place-items-center rounded-[1.1rem] bg-amber-50 text-amber-700">
                <AlertCircle className="size-5" />
              </div>

              <p className="relative mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-amber-700">
                Unsaved input
              </p>

              <h2
                id="discard-booking-action-title"
                className="relative mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
              >
                Discard what you entered?
              </h2>

              <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
                {actionDialog === 'CONFIRM'
                  ? 'Your confirmation note has not been submitted. Closing this action will remove the note you entered.'
                  : 'The reason you entered has not been submitted. Closing this action will remove it.'}
              </p>

              <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirmation(false)}
                  className="btn-secondary justify-center text-sm font-black"
                >
                  Keep editing
                </button>

                <button
                  type="button"
                  onClick={discardDialogInput}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  <XCircle className="size-4 text-white" />
                  <span className="text-white">Discard input</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
