import { useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Package,
  Phone,
  UserRound,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  getVendorQuotationDraft,
  getVendorQuotationRequestById,
  markVendorQuotationRequestViewed,
  type QuotationRequestStatus,
} from '../features/quotationRequests/quotationRequest.api';
import { PageBackButton } from '../components/navigation/PageBackButton';

const statusLabels: Record<QuotationRequestStatus, string> = {
  SENT: 'New request',
  VIEWED: 'Viewed',
  CLARIFICATION_REQUESTED: 'Clarification requested',
  QUOTED: 'Quotation sent',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CLOSED: 'Closed',
};

const statusStyles: Record<QuotationRequestStatus, string> = {
  SENT: 'border-rose-200 bg-rose-50 text-rose-700',
  VIEWED: 'border-sky-200 bg-sky-50 text-sky-700',
  CLARIFICATION_REQUESTED: 'border-amber-200 bg-amber-50 text-amber-700',
  QUOTED: 'border-violet-200 bg-violet-50 text-violet-700',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  DECLINED: 'border-red-200 bg-red-50 text-red-700',
  CLOSED: 'border-zinc-200 bg-zinc-100 text-zinc-600',
};

function formatDate(value: string | null) {
  if (!value) {
    return 'Not specified';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatMoney(value: string | null) {
  if (!value) {
    return 'Custom pricing';
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

function isDeadlinePassed(value: string | null) {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() < Date.now();
}

function getErrorStatus(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    return error.response.status;
  }

  return null;
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

  return 'Unable to load this quotation request.';
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

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-[32px] border border-white/80 bg-white/70 p-8">
        <div className="h-5 w-28 rounded bg-zinc-200" />
        <div className="mt-5 h-10 w-2/3 rounded bg-zinc-200" />
        <div className="mt-4 h-5 w-1/2 rounded bg-zinc-200" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <div className="h-72 rounded-[28px] bg-white/75" />
          <div className="h-64 rounded-[28px] bg-white/75" />
        </div>

        <div className="h-96 rounded-[28px] bg-white/75" />
      </div>
    </div>
  );
}

export function VendorQuotationRequestDetailPage() {
  const { quotationRequestId } = useParams<{
    quotationRequestId: string;
  }>();

  const queryClient = useQueryClient();

  const requestQuery = useQuery({
    queryKey: ['vendor-quotation-request', quotationRequestId],
    queryFn: () => getVendorQuotationRequestById(quotationRequestId as string),
    enabled: Boolean(quotationRequestId),
  });

  const draftQuery = useQuery({
    queryKey: ['vendor-quotation-draft', quotationRequestId],
    queryFn: () => getVendorQuotationDraft(quotationRequestId as string),
    enabled: Boolean(quotationRequestId),
    retry: false,
  });

  const markViewedMutation = useMutation({
    mutationFn: () => markVendorQuotationRequestViewed(quotationRequestId as string),
    onSuccess: (updatedRequest) => {
      queryClient.setQueryData(['vendor-quotation-request', quotationRequestId], updatedRequest);

      void queryClient.invalidateQueries({
        queryKey: ['vendor-quotation-requests'],
      });
    },
  });

  useEffect(() => {
    if (
      requestQuery.data?.status === 'SENT' &&
      quotationRequestId &&
      !markViewedMutation.isPending &&
      !markViewedMutation.isSuccess
    ) {
      markViewedMutation.mutate();
    }
  }, [markViewedMutation, quotationRequestId, requestQuery.data?.status]);

  if (!quotationRequestId) {
    return (
      <main className="workspace-shell grid min-h-screen place-items-center px-4 py-8">
        <div className="w-full max-w-3xl rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

          <h1 className="mt-4 text-xl font-semibold text-red-900">Invalid quotation request</h1>

          <Link
            to="/vendor/quotation-requests"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to requests
          </Link>
        </div>
      </main>
    );
  }

  const request = requestQuery.data;
  const draftExists = Boolean(draftQuery.data);
  const draftNotFound = draftQuery.isError && getErrorStatus(draftQuery.error) === 404;
  const deadlinePassed = request ? isDeadlinePassed(request.responseDueAt) : false;

  const canPrepareQuotation =
    request && !['ACCEPTED', 'DECLINED', 'CLOSED'].includes(request.status) && !deadlinePassed;

  return (
    <main className="workspace-shell relative">
      <div className="workspace-container w-full max-w-7xl">
        <header className="relative overflow-visible rounded-[1.75rem] border border-white/55 bg-white/34 p-4 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative flex min-w-0 items-center gap-4">
            <PageBackButton
              fallback="/vendor/quotation-requests"
              label="Quotation requests"
              className="shrink-0"
            />

            <div className="min-w-0 border-l border-[rgba(93,58,85,0.12)] pl-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <h1 className="mt-1 truncate text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-2xl">
                Quotation request
              </h1>
            </div>
          </div>
        </header>

        <div className="pb-10 pt-6">
          {requestQuery.isLoading ? (
            <PageSkeleton />
          ) : requestQuery.isError || !request ? (
            <section className="grid min-h-72 place-items-center rounded-[2rem] border border-red-200/70 bg-red-50/55 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.06)]">
              <div className="max-w-lg">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600">
                  <AlertCircle className="size-6" />
                </div>

                <h1 className="mt-5 text-2xl font-black tracking-[-0.04em] text-red-900">
                  Quotation request could not be loaded
                </h1>

                <p className="mt-3 text-sm leading-7 text-red-700">
                  {getErrorMessage(requestQuery.error)}
                </p>

                <button
                  type="button"
                  onClick={() => requestQuery.refetch()}
                  className="mt-6 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white transition hover:bg-red-800"
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.72)_0%,rgba(246,239,241,0.58)_58%,rgba(232,225,238,0.48)_100%)] shadow-[0_18px_52px_rgba(64,42,51,0.08)] backdrop-blur-2xl">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                />

                <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:gap-7">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[0.64rem] font-black ${statusStyles[request.status]}`}
                      >
                        {statusLabels[request.status]}
                      </span>

                      <span className="soft-chip text-[0.64rem] font-black uppercase tracking-[0.12em]">
                        {request.event.eventType}
                      </span>

                      {markViewedMutation.isPending ? (
                        <span className="text-[0.68rem] font-bold text-[var(--color-charcoal)]/42">
                          Updating status…
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-4 text-[0.64rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Customer quotation request
                    </p>

                    <h2 className="mt-1.5 max-w-3xl text-balance text-3xl font-black leading-[1.05] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.15rem]">
                      {request.event.name}
                    </h2>

                    <p className="mt-2.5 max-w-2xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/62">
                      Review the customer brief and requested service before preparing your
                      quotation.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-[var(--color-charcoal)]/60">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5 text-[var(--color-deep-plum)]" />
                        Received {formatDateTime(request.createdAt)}
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="size-3.5 text-[var(--color-deep-plum)]" />
                        {`${request.event.owner.firstName} ${request.event.owner.lastName}`.trim() ||
                          request.event.owner.email}
                      </span>

                      <span className="text-[var(--color-charcoal)]/38">
                        Updated {formatDate(request.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={[
                      'rounded-[1.35rem] border px-4 py-4',
                      deadlinePassed
                        ? 'border-red-200/80 bg-red-50/62'
                        : 'border-white/68 bg-white/42',
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={[
                          'grid size-9 shrink-0 place-items-center rounded-xl',
                          deadlinePassed
                            ? 'bg-red-100 text-red-600'
                            : 'bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]',
                        ].join(' ')}
                      >
                        <Clock3 className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <p
                          className={[
                            'text-[0.6rem] font-black uppercase tracking-[0.15em]',
                            deadlinePassed ? 'text-red-600' : 'text-[var(--color-rosewood)]',
                          ].join(' ')}
                        >
                          Response deadline
                        </p>

                        <p
                          className={[
                            'mt-1 text-lg font-black tracking-[-0.03em]',
                            deadlinePassed ? 'text-red-900' : 'text-[var(--color-near-black)]',
                          ].join(' ')}
                        >
                          {request.responseDueAt
                            ? formatDate(request.responseDueAt)
                            : 'No deadline'}
                        </p>

                        <p
                          className={[
                            'mt-1 text-xs font-semibold leading-5',
                            deadlinePassed ? 'text-red-700' : 'text-[var(--color-charcoal)]/52',
                          ].join(' ')}
                        >
                          {deadlinePassed
                            ? 'The response deadline has passed.'
                            : request.responseDueAt
                              ? 'Submit your quotation before this date.'
                              : 'No response deadline was specified.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="mt-5 space-y-4">
                {/* Essential request information */}
                <section className="rounded-[1.65rem] border border-white/58 bg-white/42 p-5 shadow-[0_14px_38px_rgba(35,24,30,0.055)] backdrop-blur-xl">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
                        <CalendarDays className="size-4" />
                      </div>

                      <div>
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                          Request overview
                        </p>

                        <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          Event & customer details
                        </h2>
                      </div>
                    </div>

                    <span className="soft-chip w-fit text-[0.65rem] font-black uppercase tracking-[0.1em]">
                      {request.event.eventType}
                    </span>
                  </div>

                  <div className="mt-4 grid overflow-hidden rounded-[1.2rem] border border-white/58 bg-white/28 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="border-b border-white/58 px-4 py-3 sm:border-r lg:border-b-0">
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                        Event date
                      </p>
                      <p className="mt-1.5 text-sm font-black text-[var(--color-near-black)]">
                        {formatDate(request.event.eventDate)}
                      </p>
                    </div>

                    <div className="border-b border-white/58 px-4 py-3 lg:border-b-0 lg:border-r">
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                        Location
                      </p>
                      <p className="mt-1.5 text-sm font-black text-[var(--color-near-black)]">
                        {request.event.location || 'Location not provided'}
                      </p>
                    </div>

                    <div className="border-b border-white/58 px-4 py-3 sm:border-b-0 sm:border-r">
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                        Event status
                      </p>
                      <p className="mt-1.5 text-sm font-black text-[var(--color-near-black)]">
                        {request.event.status.replaceAll('_', ' ')}
                      </p>
                    </div>

                    <div className="px-4 py-3">
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                        Customer
                      </p>
                      <p className="mt-1.5 truncate text-sm font-black text-[var(--color-near-black)]">
                        {`${request.event.owner.firstName} ${request.event.owner.lastName}`.trim() ||
                          'Customer'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-[rgba(93,58,85,0.07)] pt-3 text-xs font-semibold text-[var(--color-charcoal)]/60">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Mail className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />
                      <span className="break-all">{request.event.owner.email}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />
                      {request.event.owner.phone || 'Phone number not provided'}
                    </span>
                  </div>
                </section>

                {/* Customer requirements */}
                <section className="rounded-[1.65rem] border border-white/58 bg-white/42 p-5 shadow-[0_14px_38px_rgba(35,24,30,0.055)] backdrop-blur-xl">
                  <div className="flex items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
                      <FileText className="size-4" />
                    </div>

                    <div>
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                        Customer brief
                      </p>

                      <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        Service requirements
                      </h2>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[rgba(93,58,85,0.08)] pt-4">
                    <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--color-charcoal)]/72">
                      {request.requirements}
                    </p>
                  </div>
                </section>

                {/* Package + quotation action */}
                <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="rounded-[1.65rem] border border-white/58 bg-white/42 p-5 shadow-[0_14px_38px_rgba(35,24,30,0.055)] backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
                        <Package className="size-4" />
                      </div>

                      <div>
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                          Requested service
                        </p>

                        <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                          Package information
                        </h2>
                      </div>
                    </div>

                    {request.package ? (
                      <div className="mt-4 border-t border-[rgba(93,58,85,0.08)] pt-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                                {request.package.title}
                              </h3>

                              <span className="soft-chip w-fit text-[0.65rem] font-black">
                                <Package className="size-3" />
                                {request.package.category?.name || 'Service package'}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 sm:text-right">
                            <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                              Base price
                            </p>

                            <p className="mt-1 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                              {formatMoney(request.package.basePrice)}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/60">
                          {request.package.description || 'No package description was provided.'}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 border-t border-[rgba(93,58,85,0.08)] pt-4">
                        <p className="text-base font-black text-[var(--color-near-black)]">
                          Custom service request
                        </p>

                        <p className="mt-1.5 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          The customer did not select a predefined package. Build the quotation from
                          the written requirements instead.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="relative overflow-hidden rounded-[1.65rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(240,231,238,0.48))] p-5 shadow-[0_14px_38px_rgba(35,24,30,0.065)] backdrop-blur-xl">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[0.62rem] font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                            Quotation response
                          </p>

                          <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                            {draftExists ? 'Continue your quotation' : 'Prepare your response'}
                          </h2>
                        </div>

                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                          <FileText className="size-4" />
                        </div>
                      </div>

                      {draftQuery.isLoading ? (
                        <div className="mt-4 animate-pulse">
                          <div className="h-4 w-2/3 rounded bg-zinc-200/80" />
                          <div className="mt-3 h-4 w-full rounded bg-zinc-200/70" />
                          <div className="mt-4 h-10 rounded-full bg-[rgba(91,61,82,0.18)]" />
                        </div>
                      ) : draftQuery.isError && !draftNotFound ? (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-3">
                          <p className="text-sm font-black text-red-800">
                            Draft status could not be checked
                          </p>

                          <button
                            type="button"
                            onClick={() => draftQuery.refetch()}
                            className="mt-2 text-xs font-black text-red-700 underline underline-offset-4"
                          >
                            Try again
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 flex items-start gap-2.5 border-t border-[rgba(93,58,85,0.08)] pt-4">
                            {draftExists ? (
                              <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-700" />
                            ) : (
                              <FileText className="mt-0.5 size-4 shrink-0 text-[var(--color-deep-plum)]" />
                            )}

                            <p className="text-xs font-semibold leading-5 text-[var(--color-charcoal)]/58">
                              {draftExists
                                ? 'A saved quotation draft is ready for you to continue.'
                                : 'Add pricing, deposit, inclusions, terms and expiry.'}
                            </p>
                          </div>

                          {canPrepareQuotation ? (
                            <Link
                              to={`/vendor/quotation-requests/${request.id}/quotation`}
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black !text-white shadow-[0_12px_26px_rgba(91,61,82,0.20)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white"
                            >
                              <span className="text-white">
                                {draftExists ? 'Continue draft' : 'Create quotation'}
                              </span>

                              <ArrowRight className="size-4 text-white" />
                            </Link>
                          ) : (
                            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-100/75 p-3">
                              <p className="text-sm font-black text-zinc-700">
                                Quotation editing unavailable
                              </p>

                              <p className="mt-1 text-xs font-medium leading-5 text-zinc-500">
                                This request is closed, declined, accepted, or its response deadline
                                has passed.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </section>

                {/* Low-priority record metadata */}
                <div className="flex flex-col gap-2 border-t border-[rgba(93,58,85,0.08)] px-1 pt-3 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/42 sm:flex-row sm:items-center sm:justify-between">
                  <span className="break-all">Request ID: {request.id}</span>

                  <span className="shrink-0">Last updated {formatDateTime(request.updatedAt)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
