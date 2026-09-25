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
    <div className="group flex min-w-0 items-center gap-2.5 rounded-xl bg-[rgba(91,61,82,0.025)] px-3 py-2.5">
      <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.12)] text-[var(--color-deep-plum)]">
        <Icon className="size-3.5" aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <p className="text-[0.56rem] font-extrabold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
          {label}
        </p>

        <p
          className="mt-0.5 truncate text-[0.72rem] font-bold leading-4 text-[var(--color-near-black)]"
          title={value}
        >
          {value}
        </p>
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
    <article className="group rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/72 p-4 shadow-[0_14px_34px_rgba(64,42,51,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(91,61,82,0.16)] hover:shadow-[0_18px_40px_rgba(64,42,51,0.09)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
            <CreditCard className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
              {formatCurrency(payment.amount)}
            </p>

            <p className="mt-0.5 truncate text-xs font-bold text-[var(--color-charcoal)]/62">
              {payment.booking.event.name}
            </p>

            <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-[var(--color-charcoal)]/44">
              {payment.booking.vendor.businessName}
            </p>
          </div>
        </div>

        <span className="status-chip w-fit shrink-0" data-tone="warning">
          Pending
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[rgba(183,167,200,0.055)] px-3 py-2.5">
          <p className="text-[0.56rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
            Method
          </p>

          <p className="mt-1 truncate text-xs font-bold text-[var(--color-near-black)]">
            {payment.method.replaceAll('_', ' ')}
          </p>
        </div>

        <div className="rounded-xl bg-[rgba(183,167,200,0.055)] px-3 py-2.5">
          <p className="text-[0.56rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
            Submitted
          </p>

          <p className="mt-1 text-xs font-bold text-[var(--color-near-black)]">
            {formatDate(payment.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-2 rounded-xl bg-[rgba(183,167,200,0.055)] px-3 py-2.5">
        <p className="text-[0.56rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
          Reference
        </p>

        <p
          className="mt-1 truncate text-xs font-bold text-[var(--color-near-black)]"
          title={payment.referenceNumber}
        >
          {payment.referenceNumber}
        </p>
      </div>

      <button
        type="button"
        className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-[rgba(91,61,82,0.12)] bg-white/74 px-4 text-xs font-black text-[var(--color-deep-plum)] transition hover:border-[rgba(91,61,82,0.20)] hover:bg-[rgba(183,167,200,0.10)]"
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(183,167,200,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(91,61,82,0.045),transparent_28%),linear-gradient(180deg,#fbf9fa_0%,#f8f5f7_48%,#fbfafb_100%)]">
      <div className="workspace-container">
        <AdminWorkspaceNav />

        <main className="py-4">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(247,242,247,0.92),rgba(241,236,245,0.88))] px-6 py-5 shadow-[0_18px_50px_rgba(64,42,51,0.07)] sm:px-7 sm:py-6">
            <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full border border-[rgba(91,61,82,0.06)]" />
            <div className="pointer-events-none absolute -right-6 -top-16 size-48 rounded-full border border-[rgba(91,61,82,0.05)]" />

            <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(91,61,82,0.10)] bg-white/72 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.19em] text-[var(--color-deep-plum)]">
                  <ReceiptText className="size-3.5" />
                  Payment verification
                </div>

                <h1 className="mt-3 max-w-4xl text-balance text-[2.25rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.7rem]">
                  Review pending deposit payments carefully.
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/62">
                  Confirm submitted references, inspect proof files, validate booking details, and
                  approve or reject pending deposits.
                </p>
              </div>

              <div className="w-full rounded-[1.15rem] border border-[rgba(91,61,82,0.09)] bg-white/70 px-4 py-3 shadow-[0_10px_28px_rgba(64,42,51,0.05)] backdrop-blur lg:w-[190px]">
                <div className="flex items-center justify-between gap-3 lg:block">
                  <div>
                    <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                      Pending payments
                    </p>

                    <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {paymentsQuery.isLoading ? '—' : summary.total}
                    </p>
                  </div>

                  <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-700 lg:mt-2">
                    <ReceiptText className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {paymentsQuery.isLoading ? (
            <section className="state-surface mt-6">
              <div>
                <LoaderCircle className="mx-auto size-10 animate-spin text-sky-700" />

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
              <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/76 px-4 py-3.5 shadow-[0_14px_34px_rgba(64,42,51,0.055)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-700">
                      <CreditCard className="size-4" />
                    </div>

                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.12em] text-amber-700">
                      Pending
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--color-charcoal)]/52">
                      Total pending
                    </p>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {summary.total}
                    </p>
                  </div>
                </article>

                <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/76 px-4 py-3.5 shadow-[0_14px_34px_rgba(64,42,51,0.055)]">
                  <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                    <Banknote className="size-4" />
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--color-charcoal)]/52">
                      Bank transfers on this page
                    </p>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {summary.bankTransfers}
                    </p>
                  </div>
                </article>

                <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/76 px-4 py-3.5 shadow-[0_14px_34px_rgba(64,42,51,0.055)]">
                  <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                    <CreditCard className="size-4" />
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--color-charcoal)]/52">
                      Stripe records on this page
                    </p>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {summary.stripePayments}
                    </p>
                  </div>
                </article>

                <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/76 px-4 py-3.5 shadow-[0_14px_34px_rgba(64,42,51,0.055)]">
                  <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                    <FileCheck2 className="size-4" />
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-xs font-bold text-[var(--color-charcoal)]/52">
                      Proof files on this page
                    </p>

                    <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      {summary.withProof}
                    </p>
                  </div>
                </article>
              </section>

              <section className="mt-4 rounded-[1.75rem] border border-[rgba(91,61,82,0.09)] bg-white/80 p-4 shadow-[0_18px_48px_rgba(64,42,51,0.06)] backdrop-blur sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="section-eyebrow">Verification queue</p>

                    <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                      Pending payment records
                    </h2>

                    <p className="mt-1 text-xs font-medium leading-5 text-[var(--color-charcoal)]/54">
                      Review pending deposits before the related booking becomes active.
                    </p>
                  </div>

                  <div className="shrink-0">
                    <select
                      className="form-field min-h-9 w-full py-2 text-sm sm:w-44"
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
                </div>

                {payments.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {payments.map((payment) => (
                      <PaymentCard key={payment.id} payment={payment} onView={openPayment} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-surface mt-4">
                    <BadgeCheck className="mx-auto size-8 text-[var(--color-deep-plum)]/60" />

                    <h3 className="mt-3 text-lg font-black text-[var(--color-near-black)]">
                      The payment queue is clear
                    </h3>

                    <p className="mx-auto mt-1.5 max-w-lg text-xs font-semibold leading-5 text-[var(--color-charcoal)]/54">
                      New pending deposit payments will appear here.
                    </p>
                  </div>
                )}

                {pagination && pagination.totalPages > 1 ? (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-[rgba(91,61,82,0.09)] bg-[rgba(183,167,200,0.055)] px-4 py-3 sm:flex-row">
                    <p className="text-xs font-semibold text-[var(--color-charcoal)]/58">
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
                        className="btn-secondary min-h-0 px-3 py-2 text-xs"
                        disabled={!pagination.hasPreviousPage || paymentsQuery.isFetching}
                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      >
                        <ChevronLeft className="size-3.5" />
                        Previous
                      </button>

                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-3 py-2 text-xs"
                        disabled={!pagination.hasNextPage || paymentsQuery.isFetching}
                        onClick={() => setPage((currentPage) => currentPage + 1)}
                      >
                        Next
                        <ChevronRight className="size-3.5" />
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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-4 backdrop-blur-md"
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
            className="max-h-[calc(100vh-2rem)] w-full max-w-[1280px] overflow-y-auto rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-[#fbf9fa] p-4 shadow-[0_28px_90px_rgba(64,42,51,0.20)] xl:overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Payment record</p>

                <h2
                  id="admin-payment-detail-title"
                  className="mt-0.5 text-[1.55rem] font-black tracking-[-0.04em] text-[var(--color-near-black)]"
                >
                  Payment verification
                </h2>
              </div>

              <button
                type="button"
                className="grid size-8 place-items-center rounded-xl border border-[rgba(91,61,82,0.10)] bg-white/80 text-[var(--color-charcoal)]/64 transition hover:border-[rgba(91,61,82,0.18)] hover:bg-[rgba(183,167,200,0.08)] hover:text-[var(--color-deep-plum)]"
                onClick={closePayment}
                aria-label="Close payment details"
              >
                <X className="size-4" />
              </button>
            </div>

            {paymentDetailQuery.isLoading ? (
              <div className="state-surface mt-3 min-h-56">
                <div>
                  <LoaderCircle className="mx-auto size-8 animate-spin text-[var(--color-deep-plum)]" />

                  <p className="mt-4 font-black text-[var(--color-near-black)]">
                    Loading payment details
                  </p>
                </div>
              </div>
            ) : paymentDetailQuery.isError ? (
              <div className="feedback-surface mt-3" data-tone="danger">
                {getErrorMessage(
                  paymentDetailQuery.error,
                  'We could not load this payment record.',
                )}
              </div>
            ) : selectedPayment ? (
              <>
                <div className="mt-3 flex flex-col justify-between gap-3 rounded-[1rem] border border-[rgba(91,61,82,0.08)] bg-white/68 px-3.5 py-2 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.12)] text-[var(--color-deep-plum)]">
                      <CreditCard className="size-3.5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-lg font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        {formatCurrency(selectedPayment.amount)}
                      </h3>

                      <p className="mt-0.5 truncate text-[0.7rem] font-semibold text-[var(--color-charcoal)]/54">
                        {selectedPayment.booking.event.name}
                      </p>
                    </div>
                  </div>

                  <span className="status-chip w-fit shrink-0" data-tone="warning">
                    {selectedPayment.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 xl:grid-cols-[0.82fr_1.18fr]">
                  <section className="rounded-[1.25rem] border border-[rgba(91,61,82,0.08)] bg-white/68 p-3.5">
                    <div>
                      <p className="section-eyebrow">Payment information</p>

                      <h3 className="mt-0.5 text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        Submission details
                      </h3>
                    </div>

                    <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
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

                  <section className="rounded-[1.25rem] border border-[rgba(91,61,82,0.08)] bg-white/68 p-3.5">
                    <div>
                      <p className="section-eyebrow">Booking context</p>

                      <h3 className="mt-0.5 text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        Related booking
                      </h3>
                    </div>

                    <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
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
                            ? formatCurrency(
                                selectedPayment.booking.acceptedQuotation.depositAmount,
                              )
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
                </div>

                <section className="mt-3 rounded-[1.2rem] border border-[rgba(91,61,82,0.09)] bg-white/72 px-3.5 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="shrink-0 lg:w-[155px]">
                      <p className="section-eyebrow">Proof file</p>

                      <h3 className="mt-0.5 text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        Payment evidence
                      </h3>
                    </div>

                    {selectedPayment.proofFileUrl ? (
                      <>
                        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[0.95rem] border border-[rgba(91,61,82,0.08)] bg-[rgba(183,167,200,0.045)] px-3 py-2">
                          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                            <FileText className="size-3.5" />
                          </div>

                          <div className="min-w-0">
                            <p
                              className="truncate text-xs font-black text-[var(--color-near-black)]"
                              title={selectedPayment.proofFileOriginalName ?? 'Payment proof'}
                            >
                              {selectedPayment.proofFileOriginalName ?? 'Payment proof'}
                            </p>

                            <p className="mt-0.5 text-[0.66rem] font-semibold text-[var(--color-charcoal)]/50">
                              {selectedPayment.proofFileMimeType ?? 'Unknown file type'} ·{' '}
                              {formatFileSize(selectedPayment.proofFileSize)}
                            </p>
                          </div>
                        </div>

                        <a
                          href={selectedPayment.proofFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-[rgba(91,61,82,0.12)] bg-white/80 px-4 text-xs font-black text-[var(--color-deep-plum)] transition hover:border-[rgba(91,61,82,0.20)] hover:bg-[rgba(183,167,200,0.10)]"
                        >
                          <ExternalLink className="size-3.5" />
                          Open proof
                        </a>
                      </>
                    ) : (
                      <div className="feedback-surface flex-1" data-tone="info">
                        No uploaded proof file is attached to this payment. Review the payment
                        method and reference number carefully.
                      </div>
                    )}
                  </div>
                </section>

                {verifyMutation.isError || rejectMutation.isError ? (
                  <div className="feedback-surface mt-3" data-tone="danger" role="alert">
                    {getErrorMessage(
                      verifyMutation.error ?? rejectMutation.error,
                      'We could not complete this payment decision.',
                    )}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-col justify-between gap-3 border-t border-[rgba(91,61,82,0.10)] pt-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Payment decision
                    </p>

                    <p className="mt-0.5 max-w-2xl text-[0.7rem] font-medium leading-4 text-[var(--color-charcoal)]/54">
                      Verifying activates the related booking. Rejecting keeps the booking in
                      deposit-pending status so the customer can submit a corrected payment.
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="btn-danger min-h-9 px-4 text-xs"
                      disabled={isDecisionPending}
                      onClick={() => {
                        rejectMutation.reset();
                        setRejectionReason('');
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="size-3.5" />
                      Reject payment
                    </button>

                    <button
                      type="button"
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] px-5 text-xs font-black text-white shadow-[0_10px_24px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDecisionPending}
                      onClick={handleVerify}
                    >
                      {verifyMutation.isPending ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
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
            className="w-full max-w-lg rounded-[2rem] border border-rose-100 bg-[#fffafb] p-6 shadow-[0_28px_90px_rgba(127,29,29,0.18)]"
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
