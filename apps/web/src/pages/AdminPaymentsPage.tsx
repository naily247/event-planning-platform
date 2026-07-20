import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileCheck2,
  FileText,
  LoaderCircle,
  MapPin,
  ReceiptText,
  Store,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import {
  adminPaymentSortOptions,
  getAdminPaymentById,
  getPendingAdminPayments,
  rejectAdminPayment,
  verifyAdminPayment,
  type AdminPayment,
  type AdminPaymentSort,
} from '../features/admin/admin.api';
import { AdminWorkspaceNav } from '../features/admin/components/AdminWorkspaceNav';

const PAGE_LIMIT = 20;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

const paymentSortLabels: Record<AdminPaymentSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  amount_highest: 'Highest amount',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCurrency(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `LKR ${value}`;
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatFileSize(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return 'Not recorded';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function ReadOnlyDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/60 p-4">
      <div className="flex items-start gap-3">
        <div className="icon-tile shrink-0">
          <Icon className="size-4" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-bold leading-6 text-[var(--color-near-black)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PaymentCard({
  payment,
  onView,
}: {
  payment: AdminPayment;
  onView: (paymentId: string) => void;
}) {
  return (
    <article className="workspace-card p-5">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.3)] text-[#334954]">
            <CreditCard className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
              {formatCurrency(payment.amount)}
            </p>

            <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
              {payment.booking.event.name}
            </p>

            <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/46">
              {payment.booking.vendor.businessName}
            </p>
          </div>
        </div>

        <span className="status-chip w-fit" data-tone="warning">
          Pending
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/48 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
            Method
          </p>

          <p className="mt-2 text-sm font-bold text-[var(--color-near-black)]">
            {payment.method.replaceAll('_', ' ')}
          </p>
        </div>

        <div className="rounded-2xl bg-white/48 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
            Submitted
          </p>

          <p className="mt-2 text-sm font-bold text-[var(--color-near-black)]">
            {formatDate(payment.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-white/48 p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
          Reference
        </p>

        <p className="mt-2 break-all text-sm font-bold text-[var(--color-near-black)]">
          {payment.referenceNumber}
        </p>
      </div>

      <button
        type="button"
        className="btn-secondary mt-6 w-full text-sm"
        onClick={() => onView(payment.id)}
      >
        Review payment
      </button>
    </article>
  );
}

export function AdminPaymentsPage() {
  const queryClient = useQueryClient();

  const [sort, setSort] = useState<AdminPaymentSort>('newest');
  const [page, setPage] = useState(1);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const paymentsQuery = useQuery({
    queryKey: ['admin', 'payments', 'pending', { page, sort }],
    queryFn: () =>
      getPendingAdminPayments({
        page,
        limit: PAGE_LIMIT,
        sort,
      }),
  });

  const paymentDetailQuery = useQuery({
    queryKey: ['admin', 'payments', selectedPaymentId],
    queryFn: () => getAdminPaymentById(selectedPaymentId as string),
    enabled: Boolean(selectedPaymentId),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyAdminPayment,

    onSuccess: (_, paymentId) => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'payments', 'pending'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'payments', paymentId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'dashboard', 'summary'],
      });

      setSelectedPaymentId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      rejectAdminPayment(paymentId, {
        reason,
      }),

    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'payments', 'pending'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'payments', variables.paymentId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'dashboard', 'summary'],
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedPaymentId(null);
    },
  });

  const payments = paymentsQuery.data?.payments ?? [];
  const pagination = paymentsQuery.data?.pagination;
  const selectedPayment = paymentDetailQuery.data;

  const isDecisionPending = verifyMutation.isPending || rejectMutation.isPending;

  const summary = useMemo(() => {
    return {
      total: pagination?.total ?? payments.length,
      bankTransfers: payments.filter((payment) => payment.method === 'BANK_TRANSFER').length,
      stripePayments: payments.filter((payment) => payment.method === 'STRIPE_CHECKOUT').length,
      withProof: payments.filter((payment) => Boolean(payment.proofFileUrl)).length,
    };
  }, [payments, pagination?.total]);

  function openPayment(paymentId: string) {
    verifyMutation.reset();
    rejectMutation.reset();
    setSelectedPaymentId(paymentId);
  }

  function closePayment() {
    if (isDecisionPending) {
      return;
    }

    verifyMutation.reset();
    rejectMutation.reset();
    setSelectedPaymentId(null);
    setShowRejectDialog(false);
    setRejectionReason('');
  }

  function handleVerify() {
    if (!selectedPayment) {
      return;
    }

    verifyMutation.mutate(selectedPayment.id);
  }

  function handleReject() {
    if (!selectedPayment || rejectionReason.trim().length < 10) {
      return;
    }

    rejectMutation.mutate({
      paymentId: selectedPayment.id,
      reason: rejectionReason.trim(),
    });
  }

  return (
    <div className="workspace-shell">
      <div className="workspace-container">
        <AdminWorkspaceNav />

        <main className="py-8">
          <section className="workspace-hero">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <ReceiptText className="size-4" />
                  Payment verification
                </div>

                <h1 className="max-w-4xl text-balance text-4xl font-black leading-[1] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                  Review pending deposit payments carefully.
                </h1>

                <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--color-charcoal)]/68">
                  Confirm submitted references, inspect proof files, validate booking details, and
                  approve or reject pending deposits.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/72 px-5 py-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                  Pending payments
                </p>

                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {paymentsQuery.isLoading ? '—' : summary.total}
                </p>
              </div>
            </div>
          </section>

          {paymentsQuery.isLoading ? (
            <section className="state-surface mt-6">
              <div>
                <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

                <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                  Loading pending payments
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                  Preparing booking, customer, vendor, and proof details.
                </p>
              </div>
            </section>
          ) : paymentsQuery.isError ? (
            <section className="state-surface mt-6">
              <div className="max-w-lg">
                <div className="icon-tile mx-auto">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                  Payments could not be loaded
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                  {getErrorMessage(paymentsQuery.error, 'We could not load pending payments.')}
                </p>

                <button
                  type="button"
                  className="btn-primary mt-6 text-sm"
                  onClick={() => paymentsQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="workspace-card p-5">
                  <div className="icon-tile">
                    <CreditCard className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Total pending
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {summary.total}
                  </p>
                </article>

                <article className="workspace-card p-5">
                  <div className="icon-tile">
                    <Banknote className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Bank transfers on this page
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {summary.bankTransfers}
                  </p>
                </article>

                <article className="workspace-card p-5">
                  <div className="icon-tile">
                    <CreditCard className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Stripe records on this page
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {summary.stripePayments}
                  </p>
                </article>

                <article className="workspace-card p-5">
                  <div className="icon-tile">
                    <FileCheck2 className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Proof files on this page
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {summary.withProof}
                  </p>
                </article>
              </section>

              <section className="workspace-panel mt-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="section-eyebrow">Verification queue</p>

                    <h2 className="section-title">Pending payment records</h2>

                    <p className="section-description">
                      Review pending deposits before the related booking becomes active.
                    </p>
                  </div>

                  <select
                    className="form-field w-full sm:w-56"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as AdminPaymentSort);
                      setPage(1);
                    }}
                  >
                    {adminPaymentSortOptions.map((sortOption) => (
                      <option key={sortOption} value={sortOption}>
                        {paymentSortLabels[sortOption]}
                      </option>
                    ))}
                  </select>
                </div>

                {payments.length > 0 ? (
                  <div className="mt-7 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {payments.map((payment) => (
                      <PaymentCard key={payment.id} payment={payment} onView={openPayment} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-surface mt-7">
                    <BadgeCheck className="mx-auto size-9 text-[var(--color-deep-plum)]/64" />

                    <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                      The payment queue is clear
                    </h3>

                    <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                      New pending deposit payments will appear here.
                    </p>
                  </div>
                )}

                {pagination && pagination.totalPages > 1 ? (
                  <div className="mt-7 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/48 px-5 py-4 sm:flex-row">
                    <p className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                      Page{' '}
                      <span className="font-black text-[var(--color-near-black)]">
                        {pagination.page}
                      </span>{' '}
                      of{' '}
                      <span className="font-black text-[var(--color-near-black)]">
                        {pagination.totalPages}
                      </span>
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-4 py-2.5 text-sm"
                        disabled={!pagination.hasPreviousPage || paymentsQuery.isFetching}
                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </button>

                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-4 py-2.5 text-sm"
                        disabled={!pagination.hasNextPage || paymentsQuery.isFetching}
                        onClick={() => setPage((currentPage) => currentPage + 1)}
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </main>
      </div>

      {selectedPaymentId ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePayment();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-payment-detail-title"
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/80 bg-[#fbf8f5] p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Payment record</p>

                <h2 id="admin-payment-detail-title" className="section-title">
                  Payment verification
                </h2>
              </div>

              <button
                type="button"
                className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                onClick={closePayment}
                aria-label="Close payment details"
              >
                <X className="size-5" />
              </button>
            </div>

            {paymentDetailQuery.isLoading ? (
              <div className="state-surface mt-6 min-h-72">
                <div>
                  <LoaderCircle className="mx-auto size-9 animate-spin text-[var(--color-deep-plum)]" />

                  <p className="mt-4 font-black text-[var(--color-near-black)]">
                    Loading payment details
                  </p>
                </div>
              </div>
            ) : paymentDetailQuery.isError ? (
              <div className="feedback-surface mt-6" data-tone="danger">
                {getErrorMessage(
                  paymentDetailQuery.error,
                  'We could not load this payment record.',
                )}
              </div>
            ) : selectedPayment ? (
              <>
                <div className="mt-6 flex flex-col justify-between gap-5 rounded-2xl border border-white/80 bg-white/72 p-5 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-4">
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.3)] text-[#334954]">
                      <CreditCard className="size-6" />
                    </div>

                    <div>
                      <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        {formatCurrency(selectedPayment.amount)}
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
                        {selectedPayment.booking.event.name}
                      </p>
                    </div>
                  </div>

                  <span className="status-chip w-fit" data-tone="warning">
                    {selectedPayment.status}
                  </span>
                </div>

                <section className="workspace-panel mt-6">
                  <p className="section-eyebrow">Payment information</p>

                  <h3 className="section-title">Submission details</h3>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ReadOnlyDetail
                      icon={CreditCard}
                      label="Amount"
                      value={formatCurrency(selectedPayment.amount)}
                    />

                    <ReadOnlyDetail
                      icon={Banknote}
                      label="Method"
                      value={selectedPayment.method.replaceAll('_', ' ')}
                    />

                    <ReadOnlyDetail
                      icon={ReceiptText}
                      label="Reference"
                      value={selectedPayment.referenceNumber}
                    />

                    <ReadOnlyDetail
                      icon={CalendarDays}
                      label="Submitted"
                      value={formatDateTime(selectedPayment.createdAt)}
                    />

                    <ReadOnlyDetail
                      icon={UserRound}
                      label="Submitted by"
                      value={`${selectedPayment.submittedBy.firstName} ${selectedPayment.submittedBy.lastName}`}
                    />

                    <ReadOnlyDetail
                      icon={CreditCard}
                      label="Status"
                      value={selectedPayment.status}
                    />
                  </div>
                </section>

                <section className="workspace-panel mt-6">
                  <p className="section-eyebrow">Booking context</p>

                  <h3 className="section-title">Related booking</h3>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ReadOnlyDetail
                      icon={CalendarDays}
                      label="Event"
                      value={selectedPayment.booking.event.name}
                    />

                    <ReadOnlyDetail
                      icon={Store}
                      label="Vendor"
                      value={selectedPayment.booking.vendor.businessName}
                    />

                    <ReadOnlyDetail
                      icon={MapPin}
                      label="Location"
                      value={selectedPayment.booking.event.location ?? 'Not provided'}
                    />

                    <ReadOnlyDetail
                      icon={CreditCard}
                      label="Booking cost"
                      value={formatCurrency(selectedPayment.booking.agreedCost)}
                    />

                    <ReadOnlyDetail
                      icon={CreditCard}
                      label="Quotation price"
                      value={formatCurrency(
                        selectedPayment.booking.acceptedQuotation.proposedPrice,
                      )}
                    />

                    <ReadOnlyDetail
                      icon={CreditCard}
                      label="Required deposit"
                      value={
                        selectedPayment.booking.acceptedQuotation.depositAmount
                          ? formatCurrency(selectedPayment.booking.acceptedQuotation.depositAmount)
                          : 'No deposit recorded'
                      }
                    />

                    <ReadOnlyDetail
                      icon={CalendarDays}
                      label="Service start"
                      value={formatDateTime(selectedPayment.booking.serviceStart)}
                    />

                    <ReadOnlyDetail
                      icon={CalendarDays}
                      label="Service end"
                      value={formatDateTime(selectedPayment.booking.serviceEnd)}
                    />

                    <ReadOnlyDetail
                      icon={UserRound}
                      label="Customer"
                      value={`${selectedPayment.booking.event.owner.firstName} ${selectedPayment.booking.event.owner.lastName}`}
                    />
                  </div>
                </section>

                <section className="workspace-panel mt-6">
                  <p className="section-eyebrow">Proof file</p>

                  <h3 className="section-title">Payment evidence</h3>

                  {selectedPayment.proofFileUrl ? (
                    <div className="mt-6 rounded-2xl border border-white/80 bg-white/60 p-5">
                      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                        <div className="flex items-start gap-4">
                          <div className="icon-tile shrink-0">
                            <FileText className="size-5" />
                          </div>

                          <div>
                            <p className="font-black text-[var(--color-near-black)]">
                              {selectedPayment.proofFileOriginalName ?? 'Payment proof'}
                            </p>

                            <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
                              {selectedPayment.proofFileMimeType ?? 'Unknown file type'} ·{' '}
                              {formatFileSize(selectedPayment.proofFileSize)}
                            </p>
                          </div>
                        </div>

                        <a
                          href={selectedPayment.proofFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-sm"
                        >
                          <ExternalLink className="size-4" />
                          Open proof
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="feedback-surface mt-6" data-tone="info">
                      No uploaded proof file is attached to this payment. Review the payment method
                      and reference number carefully.
                    </div>
                  )}
                </section>

                {verifyMutation.isError || rejectMutation.isError ? (
                  <div className="feedback-surface mt-6" data-tone="danger" role="alert">
                    {getErrorMessage(
                      verifyMutation.error ?? rejectMutation.error,
                      'We could not complete this payment decision.',
                    )}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col justify-between gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-black text-[var(--color-near-black)]">Payment decision</p>

                    <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--color-charcoal)]/56">
                      Verifying activates the related booking. Rejecting keeps the booking in
                      deposit-pending status so the customer can submit a corrected payment.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="btn-danger text-sm"
                      disabled={isDecisionPending}
                      onClick={() => {
                        rejectMutation.reset();
                        setRejectionReason('');
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="size-4" />
                      Reject payment
                    </button>

                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={isDecisionPending}
                      onClick={handleVerify}
                    >
                      {verifyMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}

                      {verifyMutation.isPending ? 'Verifying...' : 'Verify payment'}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {showRejectDialog && selectedPayment ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !rejectMutation.isPending) {
              setShowRejectDialog(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-payment-reject-title"
            className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-[#fbf8f5] p-6 shadow-2xl"
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700">
              <XCircle className="size-5" />
            </div>

            <h2
              id="admin-payment-reject-title"
              className="mt-5 text-2xl font-black text-[var(--color-near-black)]"
            >
              Reject this payment?
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/64">
              Provide a clear explanation so the customer understands what must be corrected before
              submitting another deposit payment.
            </p>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Rejection reason
              </span>

              <textarea
                className="form-field min-h-32"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Explain why the payment could not be verified."
                aria-invalid={rejectionReason.length > 0 && rejectionReason.trim().length < 10}
                disabled={rejectMutation.isPending}
              />

              <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/48">
                Minimum 10 characters.
              </span>
            </label>

            {rejectMutation.isError ? (
              <div className="feedback-surface mt-5" data-tone="danger" role="alert">
                {getErrorMessage(rejectMutation.error, 'We could not reject this payment.')}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={rejectMutation.isPending}
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-danger text-sm"
                disabled={rejectMutation.isPending || rejectionReason.trim().length < 10}
                onClick={handleReject}
              >
                {rejectMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}

                {rejectMutation.isPending ? 'Rejecting...' : 'Reject payment'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
