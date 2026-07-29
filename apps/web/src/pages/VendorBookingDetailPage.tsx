import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
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
import { Link, useParams } from 'react-router-dom';
import {
  cancelVendorBooking,
  completeVendorBooking,
  confirmVendorBooking,
  getVendorBookingById,
  rejectVendorBooking,
  type BookingStatus,
  type VendorBooking,
} from '../features/bookings/booking.api';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';

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
    <div className="group relative flex items-start gap-4 overflow-hidden rounded-[1.35rem] border border-white/65 bg-white/48 p-4 shadow-inner transition duration-300 hover:bg-white/60">
      <div className="pointer-events-none absolute -right-10 -top-10 size-24 rounded-full bg-[rgba(183,167,200,0.12)] blur-2xl transition duration-500 group-hover:scale-110" />
      <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
        <Icon className="size-5" />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42">
          {label}
        </p>

        <p className="mt-1.5 break-words text-sm font-semibold leading-6 text-[var(--color-near-black)]">
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
      <h3 className="text-sm font-black tracking-[-0.015em] text-[var(--color-near-black)]">
        {title}
      </h3>

      <div className="mt-2 rounded-[1.35rem] border border-white/65 bg-white/48 p-4 shadow-inner">
        <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--color-charcoal)]/64">
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
      setOperationError(getErrorMessage(error));
      resetDialog();
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
      setOperationError(getErrorMessage(error));
      resetDialog();
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
      setOperationError(getErrorMessage(error));
      resetDialog();
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
      setOperationError(getErrorMessage(error));
      resetDialog();
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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(190,137,154,0.18),_transparent_34%),linear-gradient(180deg,_#f8f5f4_0%,_#f3efee_100%)] px-4 py-8">
        <div className="glass-card relative mx-auto max-w-3xl overflow-hidden p-8 text-center sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-red-100/70 blur-3xl" />
          <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle className="size-6" />
          </div>

          <h1 className="relative mt-5 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
            Invalid booking
          </h1>

          <Link
            to="/vendor/bookings"
            className="relative mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to bookings
          </Link>
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(190,137,154,0.18),_transparent_34%),linear-gradient(180deg,_#f8f5f4_0%,_#f3efee_100%)] text-[#2e2529]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <VendorWorkspaceNav />

        <div className="mt-6">
          <Link
            to="/vendor/bookings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-rose-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to bookings
          </Link>
        </div>

        {bookingQuery.isLoading ? (
          <div className="mt-6">
            <PageSkeleton />
          </div>
        ) : bookingQuery.isError || !booking ? (
          <section className="glass-card relative mt-6 overflow-hidden p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-red-100/70 blur-3xl" />
            <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="size-6" />
            </div>

            <h1 className="relative mt-5 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              Booking could not be loaded
            </h1>

            <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--color-charcoal)]/62">
              {getErrorMessage(bookingQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => bookingQuery.refetch()}
              className="relative mt-6 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="glass-card relative mt-6 overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl" />
              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      bookingStatusStyles[booking.status]
                    }`}
                  >
                    {bookingStatusLabels[booking.status]}
                  </span>

                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700/70">
                    {booking.event.eventType}
                  </p>

                  <h1 className="mt-2 max-w-4xl text-4xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                    {booking.event.name}
                  </h1>

                  <p className="mt-4 text-base leading-7 text-[var(--color-charcoal)]/60">
                    Booking created {formatDateTime(booking.createdAt)}
                  </p>
                </div>

                <div className="relative min-w-[220px] overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/38 p-5 shadow-[0_18px_48px_rgba(49,35,42,0.08)] backdrop-blur-xl">
                  <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[rgba(183,167,200,0.18)] blur-2xl" />

                  <div className="relative flex items-center gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.22)]">
                      <CircleDollarSign className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/46">
                        Agreed cost
                      </p>

                      <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        {formatMoney(booking.agreedCost)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {successMessage && (
              <div className="glass-card mt-6 flex items-start gap-3 border-emerald-200/70 bg-emerald-50/75 p-5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />

                <p className="text-sm font-semibold leading-6 text-emerald-800">{successMessage}</p>
              </div>
            )}

            {operationError && (
              <div className="glass-card mt-6 flex items-start gap-3 border-red-200/70 bg-red-50/75 p-5">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-700" />

                <p className="text-sm font-semibold leading-6 text-red-800">operationError</p>
              </div>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
              <div className="space-y-6">
                <section className="glass-card relative overflow-hidden p-6 sm:p-7">
                  <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
                      <CalendarDays className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Service schedule
                      </p>

                      <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                        Booking details
                      </h2>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
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

                <section className="glass-card relative overflow-hidden p-6 sm:p-7">
                  <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
                      <Package className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Accepted quotation
                      </p>

                      <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                        Package and service scope
                      </h2>
                    </div>
                  </div>

                  <div className="relative mt-6 overflow-hidden rounded-[1.5rem] border border-white/65 bg-white/48 p-5 shadow-inner">
                    <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-[rgba(183,167,200,0.12)] blur-2xl" />
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                          {booking.acceptedQuotation.quotationRequest.package?.title ||
                            'Custom service'}
                        </p>

                        <p className="mt-1.5 text-sm font-black text-[var(--color-deep-plum)]">
                          {booking.acceptedQuotation.quotationRequest.package?.category?.name ||
                            'Event service'}
                        </p>
                      </div>

                      <p className="text-xl font-black tracking-[-0.03em] text-[var(--color-deep-plum)]">
                        {formatMoney(booking.acceptedQuotation.proposedPrice)}
                      </p>
                    </div>

                    {booking.acceptedQuotation.quotationRequest.package?.description && (
                      <p className="relative mt-4 whitespace-pre-wrap border-t border-white/60 pt-4 text-sm leading-7 text-[var(--color-charcoal)]/64">
                        {booking.acceptedQuotation.quotationRequest.package.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 space-y-5">
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

                <section className="glass-card relative overflow-hidden p-6 sm:p-7">
                  <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
                      <FileCheck2 className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Booking record
                      </p>

                      <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                        Status timeline
                      </h2>
                    </div>
                  </div>

                  <div className="relative mt-6 space-y-4">
                    <DetailItem
                      icon={CalendarDays}
                      label="Booking created"
                      value={formatDateTime(booking.createdAt)}
                    />

                    {booking.vendorRespondedAt && (
                      <DetailItem
                        icon={FileCheck2}
                        label="Vendor responded"
                        value={formatDateTime(booking.vendorRespondedAt)}
                      />
                    )}

                    {booking.vendorCancelledAt && (
                      <DetailItem
                        icon={Ban}
                        label="Vendor cancelled"
                        value={formatDateTime(booking.vendorCancelledAt)}
                      />
                    )}

                    {booking.customerCancelledAt && (
                      <DetailItem
                        icon={Ban}
                        label="Customer cancelled"
                        value={formatDateTime(booking.customerCancelledAt)}
                      />
                    )}

                    {booking.vendorCompletedAt && (
                      <DetailItem
                        icon={CheckCircle2}
                        label="Service completed"
                        value={formatDateTime(booking.vendorCompletedAt)}
                      />
                    )}

                    <DetailItem
                      icon={Clock3}
                      label="Last updated"
                      value={formatDateTime(booking.updatedAt)}
                    />
                  </div>

                  {booking.vendorResponseNote && (
                    <div className="mt-6">
                      <TextSection
                        title="Vendor response note"
                        value={booking.vendorResponseNote}
                        emptyText="No response note recorded."
                      />
                    </div>
                  )}

                  {booking.vendorCancellationReason && (
                    <div className="mt-6">
                      <TextSection
                        title="Vendor cancellation reason"
                        value={booking.vendorCancellationReason}
                        emptyText="No cancellation reason recorded."
                      />
                    </div>
                  )}

                  {booking.customerCancellationReason && (
                    <div className="mt-6">
                      <TextSection
                        title="Customer cancellation reason"
                        value={booking.customerCancellationReason}
                        emptyText="No cancellation reason recorded."
                      />
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="glass-card relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
                      <UserRound className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Customer
                      </p>

                      <h2 className="mt-1 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        {getCustomerName(booking)}
                      </h2>
                    </div>
                  </div>

                  <div className="relative mt-6 space-y-3">
                    <DetailItem icon={Mail} label="Email" value={booking.event.owner.email} />

                    <DetailItem
                      icon={Phone}
                      label="Phone"
                      value={booking.event.owner.phone || 'Phone number not provided'}
                    />
                  </div>
                </section>

                <section className="glass-card relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -left-14 -top-16 size-40 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
                      <CircleDollarSign className="size-5" />
                    </div>

                    <h2 className="text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                      Financial summary
                    </h2>
                  </div>

                  <dl className="relative mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-sm font-semibold text-[var(--color-charcoal)]/52">
                        Agreed cost
                      </dt>

                      <dd className="font-black text-[var(--color-near-black)]">
                        {formatMoney(booking.agreedCost)}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-sm font-semibold text-[var(--color-charcoal)]/52">
                        Deposit
                      </dt>

                      <dd className="font-black text-[var(--color-near-black)]">
                        {depositAmount ? formatMoney(depositAmount) : 'Not required'}
                      </dd>
                    </div>

                    <div className="border-t border-white/65 pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-sm font-black text-[var(--color-near-black)]">
                          Remaining balance
                        </dt>

                        <dd className="text-lg font-black tracking-[-0.025em] text-[var(--color-deep-plum)]">
                          {remainingBalance !== null
                            ? formatMoney(remainingBalance.toString())
                            : 'Not available'}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </section>

                {(canConfirm || canReject || canCancel || canComplete) && (
                  <section className="glass-card relative overflow-hidden p-6">
                    <div className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />
                    <p className="relative text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42">
                      Booking actions
                    </p>

                    {canConfirm && (
                      <button
                        type="button"
                        onClick={() => openDialog('CONFIRM')}
                        className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm booking
                      </button>
                    )}

                    {canReject && (
                      <button
                        type="button"
                        onClick={() => openDialog('REJECT')}
                        className="relative mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-white/70 px-5 py-3.5 text-sm font-black text-red-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject booking
                      </button>
                    )}

                    {canComplete && (
                      <button
                        type="button"
                        onClick={() => openDialog('COMPLETE')}
                        className="relative mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_38px_rgba(4,120,87,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-800"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark as completed
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => openDialog('CANCEL')}
                        className="relative mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-white/70 px-5 py-3.5 text-sm font-black text-red-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-red-50"
                      >
                        <Ban className="h-4 w-4" />
                        Cancel booking
                      </button>
                    )}
                  </section>
                )}

                <section className="glass-card relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl" />
                  <div className="relative flex items-center gap-4">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
                      <ShieldAlert className="size-5" />
                    </div>

                    <h2 className="text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                      Booking guidance
                    </h2>
                  </div>

                  <p className="relative mt-5 text-sm leading-7 text-[var(--color-charcoal)]/64">
                    Confirm only when the date and service scope are feasible. Rejections and
                    cancellations require a clear reason and are permanently recorded.
                  </p>
                </section>

                <section className="glass-card relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -left-14 -top-16 size-40 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl" />
                  <p className="relative text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42">
                    Record information
                  </p>

                  <dl className="relative mt-5 space-y-4 text-sm">
                    <div>
                      <dt className="font-semibold text-[var(--color-charcoal)]/42">Booking ID</dt>

                      <dd className="mt-1.5 break-all font-semibold leading-6 text-[var(--color-near-black)]">
                        {booking.id}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-semibold text-[var(--color-charcoal)]/42"> version</dt>

                      <dd className="mt-1.5 font-semibold text-[var(--color-near-black)]">
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

      {actionDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isActionPending) {
              resetDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-action-title"
            className="glass-card relative w-full max-w-lg overflow-hidden p-6 shadow-[0_32px_90px_rgba(38,24,31,0.24)] sm:p-7"
          >
            <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />

            <div
              className={`relative grid size-12 place-items-center rounded-2xl shadow-[0_12px_28px_rgba(49,35,42,0.1)] ${
                actionDialog === 'CONFIRM' || actionDialog === 'COMPLETE'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {actionDialog === 'CONFIRM' && <CheckCircle2 className="size-5" />}

              {actionDialog === 'REJECT' && <XCircle className="size-5" />}

              {actionDialog === 'CANCEL' && <Ban className="size-5" />}

              {actionDialog === 'COMPLETE' && <FileCheck2 className="size-5" />}
            </div>

            <h2
              id="booking-action-title"
              className="relative mt-5 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]"
            >
              {actionDialog === 'CONFIRM' && 'Confirm this booking?'}

              {actionDialog === 'REJECT' && 'Reject this booking?'}

              {actionDialog === 'CANCEL' && 'Cancel this booking?'}

              {actionDialog === 'COMPLETE' && 'Mark this booking as completed?'}
            </h2>

            <p className="relative mt-3 text-sm leading-7 text-[var(--color-charcoal)]/62">
              {actionDialog === 'CONFIRM' &&
                'Confirm that you can provide the agreed service on the scheduled date.'}

              {actionDialog === 'REJECT' &&
                'The customer will be informed that this booking request was rejected.'}

              {actionDialog === 'CANCEL' &&
                'Cancellation affects an accepted booking and the reason will remain in the booking record.'}

              {actionDialog === 'COMPLETE' &&
                'Only mark the booking complete after the agreed service has been delivered.'}
            </p>

            {actionDialog === 'CONFIRM' && (
              <label className="mt-5 block">
                <span className="text-sm font-black text-[var(--color-near-black)]">
                  Confirmation note (optional)
                </span>

                <textarea
                  rows={5}
                  value={confirmNote}
                  disabled={isActionPending}
                  onChange={(event) => {
                    setConfirmNote(event.target.value);
                    setFormError('');
                  }}
                  placeholder="Add any useful confirmation details for the customer..."
                  className="mt-2 w-full resize-y rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm leading-7 text-[var(--color-near-black)] outline-none transition duration-300 placeholder:text-[var(--color-charcoal)]/38 focus:border-[rgba(183,167,200,0.75)] focus:bg-white focus:ring-4 focus:ring-[rgba(183,167,200,0.18)] disabled:bg-white/40 disabled:text-[var(--color-charcoal)]/40"
                />

                <p className="mt-2 text-right text-xs font-semibold text-[var(--color-charcoal)]/40">
                  confirmNote.length/2000
                </p>
              </label>
            )}

            {(actionDialog === 'REJECT' || actionDialog === 'CANCEL') && (
              <label className="mt-5 block">
                <span className="text-sm font-black text-[var(--color-near-black)]">
                  {actionDialog === 'REJECT' ? 'Rejection reason' : 'Cancellation reason'}
                </span>

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
                      ? 'Explain why this booking cannot be accepted...'
                      : 'Explain why this booking must be cancelled...'
                  }
                  className="mt-2 w-full resize-y rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm leading-7 text-[var(--color-near-black)] outline-none transition duration-300 placeholder:text-[var(--color-charcoal)]/38 focus:border-[rgba(183,167,200,0.75)] focus:bg-white focus:ring-4 focus:ring-[rgba(183,167,200,0.18)] disabled:bg-white/40 disabled:text-[var(--color-charcoal)]/40"
                />

                <p className="mt-2 text-right text-xs font-semibold text-[var(--color-charcoal)]/40">
                  {reason.length}/2000
                </p>
              </label>
            )}

            {formError && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />

                <p className="text-xs font-medium leading-5 text-red-700">{formError}</p>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isActionPending}
                onClick={resetDialog}
                className="rounded-2xl border border-white/70 bg-white/72 px-5 py-3 text-sm font-black text-[var(--color-charcoal)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-[0_16px_38px_rgba(49,35,42,0.18)] transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${
                  actionDialog === 'CONFIRM' || actionDialog === 'COMPLETE'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-red-700 hover:bg-red-800'
                }`}
              >
                {isActionPending && <LoaderCircle className="h-4 w-4 animate-spin" />}

                {actionDialog === 'CONFIRM' && 'Confirm booking'}

                {actionDialog === 'REJECT' && 'Reject booking'}

                {actionDialog === 'CANCEL' && 'Cancel booking'}

                {actionDialog === 'COMPLETE' && 'Mark completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
