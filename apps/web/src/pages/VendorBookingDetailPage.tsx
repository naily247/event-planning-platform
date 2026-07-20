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
    <div className="flex items-start gap-3 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-700 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>

        <p className="mt-1 break-words text-sm font-medium leading-6 text-zinc-700">{value}</p>
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
      <h3 className="text-sm font-semibold text-zinc-700">{title}</h3>

      <div className="mt-2 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-4">
        <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-600">{value || emptyText}</p>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-[32px] border border-white/80 bg-white/70 p-8">
        <div className="h-6 w-40 rounded bg-zinc-200" />
        <div className="mt-5 h-10 w-2/3 rounded bg-zinc-200" />
        <div className="mt-4 h-5 w-1/2 rounded bg-zinc-200" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="space-y-6">
          <div className="h-72 rounded-[28px] bg-white/75" />
          <div className="h-80 rounded-[28px] bg-white/75" />
        </div>

        <div className="space-y-6">
          <div className="h-80 rounded-[28px] bg-white/75" />
          <div className="h-64 rounded-[28px] bg-white/75" />
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
      <main className="min-h-screen bg-[#f5f1f0] px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

          <h1 className="mt-4 text-xl font-semibold text-red-900">Invalid booking</h1>

          <Link
            to="/vendor/bookings"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white"
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
          <section className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h1 className="mt-4 text-xl font-semibold text-red-900">Booking could not be loaded</h1>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
              {getErrorMessage(bookingQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => bookingQuery.refetch()}
              className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="mt-6 overflow-hidden rounded-[32px] border border-white/80 bg-white/65 p-6 shadow-[0_24px_80px_rgba(64,42,51,0.08)] backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
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

                  <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                    {booking.event.name}
                  </h1>

                  <p className="mt-3 text-sm text-zinc-500">
                    Booking created {formatDateTime(booking.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white bg-white/85 px-5 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
                    Agreed cost
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-[#34282e]">
                    {formatMoney(booking.agreedCost)}
                  </p>
                </div>
              </div>
            </section>

            {successMessage && (
              <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
              </div>
            )}

            {operationError && (
              <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

                <p className="text-sm font-medium text-red-800">{operationError}</p>
              </div>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <CalendarDays className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Service schedule
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">Booking details</h2>
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

                <section className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <Package className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Accepted quotation
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">Package and service scope</h2>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-[#34282e]">
                          {booking.acceptedQuotation.quotationRequest.package?.title ||
                            'Custom service'}
                        </p>

                        <p className="mt-1 text-sm font-medium text-rose-700">
                          {booking.acceptedQuotation.quotationRequest.package?.category?.name ||
                            'Event service'}
                        </p>
                      </div>

                      <p className="text-lg font-semibold text-[#34282e]">
                        {formatMoney(booking.acceptedQuotation.proposedPrice)}
                      </p>
                    </div>

                    {booking.acceptedQuotation.quotationRequest.package?.description && (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-600">
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

                <section className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <FileCheck2 className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Booking record
                      </p>

                      <h2 className="mt-1 text-xl font-semibold">Status timeline</h2>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
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
                <section className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.07)] backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Customer
                      </p>

                      <h2 className="mt-1 text-lg font-semibold">{getCustomerName(booking)}</h2>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <DetailItem icon={Mail} label="Email" value={booking.event.owner.email} />

                    <DetailItem
                      icon={Phone}
                      label="Phone"
                      value={booking.event.owner.phone || 'Phone number not provided'}
                    />
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.08)] backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <CircleDollarSign className="h-5 w-5 text-rose-700" />

                    <h2 className="font-semibold">Financial summary</h2>
                  </div>

                  <dl className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-sm text-zinc-500">Agreed cost</dt>

                      <dd className="font-semibold text-[#34282e]">
                        {formatMoney(booking.agreedCost)}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-sm text-zinc-500">Deposit</dt>

                      <dd className="font-semibold text-[#34282e]">
                        {depositAmount ? formatMoney(depositAmount) : 'Not required'}
                      </dd>
                    </div>

                    <div className="border-t border-zinc-100 pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-sm font-semibold text-zinc-700">Remaining balance</dt>

                        <dd className="text-lg font-semibold text-rose-800">
                          {remainingBalance !== null
                            ? formatMoney(remainingBalance.toString())
                            : 'Not available'}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </section>

                {(canConfirm || canReject || canCancel || canComplete) && (
                  <section className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      Booking actions
                    </p>

                    {canConfirm && (
                      <button
                        type="button"
                        onClick={() => openDialog('CONFIRM')}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#34282e] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#4b343e]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm booking
                      </button>
                    )}

                    {canReject && (
                      <button
                        type="button"
                        onClick={() => openDialog('REJECT')}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject booking
                      </button>
                    )}

                    {canComplete && (
                      <button
                        type="button"
                        onClick={() => openDialog('COMPLETE')}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark as completed
                      </button>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => openDialog('CANCEL')}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <Ban className="h-4 w-4" />
                        Cancel booking
                      </button>
                    )}
                  </section>
                )}

                <section className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-sm backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-rose-700" />

                    <h2 className="font-semibold">Booking guidance</h2>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-zinc-600">
                    Confirm only when the date and service scope are feasible. Rejections and
                    cancellations require a clear reason and are permanently recorded.
                  </p>
                </section>

                <section className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-sm backdrop-blur-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    Record information
                  </p>

                  <dl className="mt-4 space-y-4 text-sm">
                    <div>
                      <dt className="text-zinc-400">Booking ID</dt>

                      <dd className="mt-1 break-all font-medium text-zinc-700">{booking.id}</dd>
                    </div>

                    <div>
                      <dt className="text-zinc-400">Quotation version</dt>

                      <dd className="mt-1 font-medium text-zinc-700">
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
            className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white p-6 shadow-2xl sm:p-7"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                actionDialog === 'CONFIRM' || actionDialog === 'COMPLETE'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {actionDialog === 'CONFIRM' && <CheckCircle2 className="h-5 w-5" />}

              {actionDialog === 'REJECT' && <XCircle className="h-5 w-5" />}

              {actionDialog === 'CANCEL' && <Ban className="h-5 w-5" />}

              {actionDialog === 'COMPLETE' && <FileCheck2 className="h-5 w-5" />}
            </div>

            <h2 id="booking-action-title" className="mt-5 text-xl font-semibold text-[#34282e]">
              {actionDialog === 'CONFIRM' && 'Confirm this booking?'}

              {actionDialog === 'REJECT' && 'Reject this booking?'}

              {actionDialog === 'CANCEL' && 'Cancel this booking?'}

              {actionDialog === 'COMPLETE' && 'Mark this booking as completed?'}
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
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
                <span className="text-sm font-semibold text-zinc-700">
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
                  className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100 disabled:bg-zinc-100"
                />

                <p className="mt-2 text-right text-xs text-zinc-400">{confirmNote.length}/2000</p>
              </label>
            )}

            {(actionDialog === 'REJECT' || actionDialog === 'CANCEL') && (
              <label className="mt-5 block">
                <span className="text-sm font-semibold text-zinc-700">
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
                  className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100 disabled:bg-zinc-100"
                />

                <p className="mt-2 text-right text-xs text-zinc-400">{reason.length}/2000</p>
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
                className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
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
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
