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
                        className={`inline-flex rounded-full border px-3 py-1.5 text-[0.68rem] font-black ${statusStyles[request.status]}`}
                      >
                        {statusLabels[request.status]}
                      </span>

                      <span className="soft-chip text-xs font-black uppercase tracking-[0.14em]">
                        {request.event.eventType}
                      </span>

                      {markViewedMutation.isPending ? (
                        <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                          Marking as viewed…
                        </span>
                      ) : null}

                      {markViewedMutation.isSuccess ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700">
                          <CheckCircle2 className="size-3.5" />
                          Viewed
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-6 text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                      Customer quotation request
                    </p>

                    <h2 className="mt-3 max-w-3xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                      {request.event.name}
                    </h2>

                    <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66">
                      Review the event, customer requirements, requested package, and response
                      deadline before preparing your quotation.
                    </p>

                    <div className="mt-7 flex flex-wrap gap-2.5">
                      <span className="soft-chip text-xs font-black">
                        <Clock3 className="size-4" />
                        Received {formatDateTime(request.createdAt)}
                      </span>

                      <span className="soft-chip text-xs font-black">
                        <UserRound className="size-4" />
                        {`${request.event.owner.firstName} ${request.event.owner.lastName}`.trim() ||
                          request.event.owner.email}
                      </span>
                    </div>
                  </div>

                  <article
                    className={[
                      'relative overflow-hidden rounded-[1.8rem] border p-5 shadow-[0_18px_52px_rgba(31,27,29,0.08)] sm:p-6',
                      deadlinePassed
                        ? 'border-red-200/80 bg-red-50/70'
                        : 'border-white/70 bg-white/52 backdrop-blur-2xl',
                    ].join(' ')}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-5">
                        <div>
                          <p
                            className={[
                              'text-[0.68rem] font-black uppercase tracking-[0.18em]',
                              deadlinePassed ? 'text-red-600' : 'text-[var(--color-rosewood)]',
                            ].join(' ')}
                          >
                            Response deadline
                          </p>

                          <h3
                            className={[
                              'mt-2 text-2xl font-black tracking-[-0.04em]',
                              deadlinePassed ? 'text-red-900' : 'text-[var(--color-near-black)]',
                            ].join(' ')}
                          >
                            {request.responseDueAt
                              ? formatDate(request.responseDueAt)
                              : 'No deadline'}
                          </h3>
                        </div>

                        <div
                          className={[
                            'grid size-11 shrink-0 place-items-center rounded-2xl',
                            deadlinePassed
                              ? 'bg-red-100 text-red-600'
                              : 'bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]',
                          ].join(' ')}
                        >
                          <Clock3 className="size-5" />
                        </div>
                      </div>

                      <p
                        className={[
                          'mt-4 text-sm font-semibold leading-6',
                          deadlinePassed ? 'text-red-700' : 'text-[var(--color-charcoal)]/58',
                        ].join(' ')}
                      >
                        {deadlinePassed
                          ? 'This request has passed its response deadline.'
                          : request.responseDueAt
                            ? 'Prepare and send your response before this date.'
                            : 'The customer did not set a response deadline.'}
                      </p>

                      <div
                        className={[
                          'mt-6 rounded-[1.25rem] border p-4',
                          deadlinePassed
                            ? 'border-red-200/70 bg-white/36'
                            : 'border-white/58 bg-white/32',
                        ].join(' ')}
                      >
                        <p className="text-[0.64rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                          Request status
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${statusStyles[request.status]}`}
                          >
                            {statusLabels[request.status]}
                          </span>

                          <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                            Updated {formatDate(request.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.38fr_0.72fr]">
                <div className="space-y-6">
                  <section className="overflow-hidden rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                          <CalendarDays className="size-5" />
                        </div>

                        <div>
                          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Event overview
                          </p>

                          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                            Event details
                          </h2>

                          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                            Confirm the essential event information before pricing your service.
                          </p>
                        </div>
                      </div>

                      <span className="soft-chip w-fit text-xs font-black">
                        {request.event.eventType}
                      </span>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <DetailItem
                        icon={CalendarDays}
                        label="Event date"
                        value={formatDate(request.event.eventDate)}
                      />

                      <DetailItem
                        icon={MapPin}
                        label="Location"
                        value={request.event.location || 'Location not provided'}
                      />

                      <DetailItem
                        icon={FileText}
                        label="Event status"
                        value={request.event.status.replaceAll('_', ' ')}
                      />

                      <DetailItem
                        icon={Package}
                        label="Event type"
                        value={request.event.eventType}
                      />
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <FileText className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Customer brief
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Service requirements
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          Use these instructions as the basis for your pricing, deliverables, and
                          service proposal.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[1.55rem] border border-white/58 bg-white/30 p-5 sm:p-6">
                      <div className="flex flex-col gap-3 border-b border-[rgba(93,58,85,0.08)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                          Customer instructions
                        </p>

                        <span className="soft-chip w-fit text-[0.65rem] font-black uppercase tracking-[0.11em]">
                          Review carefully
                        </span>
                      </div>

                      <p className="mt-5 whitespace-pre-wrap text-[15px] font-medium leading-8 text-[var(--color-charcoal)]/76">
                        {request.requirements}
                      </p>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Package className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Requested service
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Package information
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          Review the selected package and adjust your quotation for any additional
                          requirements.
                        </p>
                      </div>
                    </div>

                    {request.package ? (
                      <div className="mt-6 overflow-hidden rounded-[1.55rem] border border-white/58 bg-white/30 p-5 sm:p-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--color-rosewood)]">
                              Selected package
                            </p>

                            <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                              {request.package.title}
                            </h3>

                            <span className="soft-chip mt-3 w-fit text-xs font-black">
                              <Package className="size-3.5" />
                              {request.package.category?.name || 'Service package'}
                            </span>
                          </div>

                          <div className="shrink-0 rounded-[1.25rem] border border-white/60 bg-white/38 px-5 py-4">
                            <p className="text-[0.63rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                              Base price
                            </p>

                            <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                              {formatMoney(request.package.basePrice)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 border-t border-[rgba(93,58,85,0.08)] pt-5">
                          <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
                            {request.package.description || 'No package description was provided.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-[1.55rem] border border-dashed border-[rgba(93,58,85,0.18)] bg-white/24 p-6">
                        <p className="text-lg font-black text-[var(--color-near-black)]">
                          Custom service request
                        </p>

                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                          The customer did not select a predefined package. Build the quotation from
                          the written requirements instead.
                        </p>
                      </div>
                    )}
                  </section>
                </div>

                <aside className="space-y-6">
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
                          {`${request.event.owner.firstName} ${request.event.owner.lastName}`.trim() ||
                            'Customer'}
                        </h2>

                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-charcoal)]/54">
                          Primary contact for this quotation request.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <DetailItem icon={Mail} label="Email" value={request.event.owner.email} />

                      <DetailItem
                        icon={Phone}
                        label="Phone"
                        value={request.event.owner.phone || 'Phone number not provided'}
                      />
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[2rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(240,231,238,0.48))] p-5 shadow-[0_18px_48px_rgba(35,24,30,0.08)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Quotation response
                          </p>

                          <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            {draftExists ? 'Continue your quotation' : 'Prepare your response'}
                          </h2>
                        </div>

                        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                          <FileText className="size-4.5" />
                        </div>
                      </div>

                      {draftQuery.isLoading ? (
                        <div className="mt-5 animate-pulse rounded-[1.35rem] border border-white/58 bg-white/32 p-5">
                          <div className="h-5 w-2/3 rounded bg-zinc-200/80" />
                          <div className="mt-4 h-4 w-full rounded bg-zinc-200/70" />
                          <div className="mt-2 h-4 w-4/5 rounded bg-zinc-200/70" />
                          <div className="mt-6 h-11 rounded-full bg-[rgba(91,61,82,0.18)]" />
                        </div>
                      ) : draftQuery.isError && !draftNotFound ? (
                        <div className="mt-5 rounded-[1.35rem] border border-red-200 bg-red-50/70 p-4">
                          <p className="text-sm font-black text-red-800">
                            Draft status could not be checked
                          </p>

                          <button
                            type="button"
                            onClick={() => draftQuery.refetch()}
                            className="mt-3 text-sm font-black text-red-700 underline underline-offset-4"
                          >
                            Try again
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="mt-5 rounded-[1.35rem] border border-white/58 bg-white/32 p-5">
                            <div className="flex items-start gap-3">
                              <div
                                className={[
                                  'grid size-9 shrink-0 place-items-center rounded-xl',
                                  draftExists
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]',
                                ].join(' ')}
                              >
                                {draftExists ? (
                                  <Clock3 className="size-4" />
                                ) : (
                                  <FileText className="size-4" />
                                )}
                              </div>

                              <div>
                                <p className="text-[0.63rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                                  {draftExists ? 'Draft available' : 'No quotation drafted'}
                                </p>

                                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                                  {draftExists
                                    ? 'Review your saved pricing, inclusions, terms, and expiry before sending.'
                                    : 'Create a structured quotation with pricing, deposit, inclusions, exclusions, terms, and expiry.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {canPrepareQuotation ? (
                            <Link
                              to={`/vendor/quotation-requests/${request.id}/quotation`}
                              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-5 py-3.5 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white"
                            >
                              <span className="text-white">
                                {draftExists ? 'Continue draft' : 'Create quotation'}
                              </span>

                              <ArrowRight className="size-4 text-white" />
                            </Link>
                          ) : (
                            <div className="mt-5 rounded-[1.3rem] border border-zinc-200 bg-zinc-100/75 p-4">
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
                  </section>

                  <section className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <FileText className="size-5" />
                      </div>

                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Request record
                        </p>

                        <h2 className="mt-2 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                          Internal reference
                        </h2>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3">
                      <div className="rounded-[1.2rem] border border-white/58 bg-white/30 p-4">
                        <dt className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/40">
                          Request ID
                        </dt>

                        <dd className="mt-2 break-all text-xs font-semibold leading-5 text-[var(--color-charcoal)]/62">
                          {request.id}
                        </dd>
                      </div>

                      <div className="rounded-[1.2rem] border border-white/58 bg-white/30 p-4">
                        <dt className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/40">
                          Last updated
                        </dt>

                        <dd className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                          {formatDateTime(request.updatedAt)}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
