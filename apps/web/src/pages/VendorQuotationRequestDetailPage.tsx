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
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';
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
    <main className="workspace-shell">
      <div className="workspace-container w-full max-w-[1500px]">
        <VendorWorkspaceNav />

        <div className="mt-6">
          <PageBackButton
            fallback="/vendor/quotation-requests"
            label="Quotation requests"
            className="w-fit"
          />
        </div>

        {requestQuery.isLoading ? (
          <div className="mt-6">
            <PageSkeleton />
          </div>
        ) : requestQuery.isError || !request ? (
          <section className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h1 className="mt-4 text-xl font-semibold text-red-900">
              Quotation request could not be loaded
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
              {getErrorMessage(requestQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => requestQuery.refetch()}
              className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="glass-card relative mt-6 overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl" />

              <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-[rgba(221,188,163,0.14)] blur-3xl" />

              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                        statusStyles[request.status]
                      }`}
                    >
                      {statusLabels[request.status]}
                    </span>

                    <span className="rounded-full bg-[rgba(183,167,200,0.16)] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]">
                      {request.event.eventType}
                    </span>

                    {markViewedMutation.isPending && (
                      <span className="text-xs font-semibold text-[var(--color-charcoal)]/42">
                        Marking as viewed…
                      </span>
                    )}

                    {markViewedMutation.isSuccess && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                        Marked as viewed
                      </span>
                    )}
                  </div>

                  <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Quotation request
                  </p>

                  <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                    {request.event.name}
                  </h1>

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="size-4 text-[var(--color-deep-plum)]" />
                      Received {formatDateTime(request.createdAt)}
                    </span>

                    <span className="inline-flex items-center gap-2">
                      <UserRound className="size-4 text-[var(--color-deep-plum)]" />
                      {`${request.event.owner.firstName} ${request.event.owner.lastName}`.trim() ||
                        request.event.owner.email}
                    </span>
                  </div>
                </div>

                <article
                  className={`relative overflow-hidden rounded-[1.6rem] border p-5 shadow-[0_18px_50px_rgba(64,42,51,0.08)] lg:min-w-[290px] ${
                    deadlinePassed
                      ? 'border-red-200 bg-red-50/90'
                      : 'border-white/60 bg-white/45 backdrop-blur-xl'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`text-[0.68rem] font-black uppercase tracking-[0.16em] ${
                          deadlinePassed ? 'text-red-600' : 'text-[var(--color-charcoal)]/42'
                        }`}
                      >
                        Response deadline
                      </p>

                      <p
                        className={`mt-3 text-2xl font-black tracking-[-0.04em] ${
                          deadlinePassed ? 'text-red-800' : 'text-[var(--color-near-black)]'
                        }`}
                      >
                        {request.responseDueAt ? formatDate(request.responseDueAt) : 'No deadline'}
                      </p>
                    </div>

                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                        deadlinePassed
                          ? 'bg-red-100 text-red-600'
                          : 'bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]'
                      }`}
                    >
                      <Clock3 className="size-5" />
                    </span>
                  </div>

                  <div
                    className={`mt-5 border-t pt-4 ${
                      deadlinePassed ? 'border-red-200' : 'border-white/55'
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold leading-6 ${
                        deadlinePassed ? 'text-red-700' : 'text-[var(--color-charcoal)]/58'
                      }`}
                    >
                      {deadlinePassed
                        ? 'The response deadline has passed, so quotation editing may be unavailable.'
                        : request.responseDueAt
                          ? 'Prepare and send your quotation before this date.'
                          : 'The customer did not set a response deadline.'}
                    </p>
                  </div>
                </article>
              </div>
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
              <div className="space-y-6">
                <section className="glass-card p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="grid size-12 place-items-center rounded-[1.1rem] bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <CalendarDays className="size-5" />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                          Event overview
                        </p>

                        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Event details
                        </h2>
                      </div>
                    </div>

                    <div className="hidden rounded-full bg-[rgba(183,167,200,0.16)] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)] sm:block">
                      {request.event.eventType}
                    </div>
                  </div>

                  <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--color-charcoal)]/62">
                    Review the customer's event information before preparing your quotation. This
                    helps ensure your pricing, availability, and services match the event
                    requirements.
                  </p>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
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

                    <DetailItem icon={Package} label="Event type" value={request.event.eventType} />
                  </div>
                </section>

                <section className="glass-card p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="grid size-12 place-items-center rounded-[1.1rem] bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <FileText className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                        Customer brief
                      </p>

                      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Service requirements
                      </h2>

                      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-charcoal)]/62">
                        Read every requirement carefully before preparing your quotation. This
                        information should guide your pricing, deliverables, and proposed services.
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 rounded-[1.6rem] border border-white/55 bg-[rgba(255,255,255,0.45)] p-6 shadow-[0_16px_40px_rgba(64,42,51,0.05)]">
                    <div className="mb-5 flex items-center justify-between border-b border-white/55 pb-4">
                      <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                        Customer instructions
                      </p>

                      <span className="rounded-full bg-[rgba(183,167,200,0.16)] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[var(--color-deep-plum)]">
                        Review carefully
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-[15px] leading-8 text-[var(--color-charcoal)]/82">
                      {request.requirements}
                    </p>
                  </div>
                </section>

                <section className="glass-card p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="grid size-12 place-items-center rounded-[1.1rem] bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <Package className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                        Requested service
                      </p>

                      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Package information
                      </h2>

                      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-charcoal)]/62">
                        Review the selected service package before preparing your quotation.
                        Customers may also request additional services beyond the base package.
                      </p>
                    </div>
                  </div>

                  {request.package ? (
                    <div className="mt-7 rounded-[1.6rem] border border-white/55 bg-[rgba(255,255,255,0.45)] p-6 shadow-[0_16px_40px_rgba(64,42,51,0.05)]">
                      <div className="flex flex-col gap-5 border-b border-white/55 pb-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-2xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                            {request.package.title}
                          </p>

                          <p className="mt-2 text-sm font-bold text-[var(--color-deep-plum)]">
                            {request.package.category?.name || 'Service package'}
                          </p>
                        </div>

                        <div className="rounded-[1.2rem] bg-[rgba(183,167,200,0.16)] px-5 py-3">
                          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/45">
                            Base price
                          </p>

                          <p className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                            {formatMoney(request.package.basePrice)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-600">
                        {request.package.description || 'No package description was provided.'}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-[#faf8f7] p-6">
                      <p className="font-semibold text-zinc-700">Custom service request</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        The customer did not select one of your predefined packages. Prepare the
                        quotation based on their written requirements.
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-6">
                <section className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-[1.1rem] bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <UserRound className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                        Customer
                      </p>

                      <h2 className="mt-2 break-words text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        {`${request.event.owner.firstName} ${request.event.owner.lastName}`.trim() ||
                          'Customer'}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/58">
                        Primary contact for this quotation request.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4 border-t border-white/55 pt-6">
                    <DetailItem icon={Mail} label="Email" value={request.event.owner.email} />

                    <DetailItem
                      icon={Phone}
                      label="Phone"
                      value={request.event.owner.phone || 'Phone number not provided'}
                    />
                  </div>
                </section>

                <section className="glass-card relative overflow-hidden p-6">
                  <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl" />
                  <div className="relative flex items-start gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-[1.1rem] bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <FileText className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                        Quotation response
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/58">
                        Prepare, review, and manage your response to this customer request.
                      </p>
                    </div>
                  </div>

                  {draftQuery.isLoading ? (
                    <div className="relative mt-6 animate-pulse rounded-[1.4rem] border border-white/55 bg-white/35 p-5">
                      <div className="h-6 w-2/3 rounded bg-zinc-200/80" />
                      <div className="mt-4 h-4 w-full rounded bg-zinc-200/75" />
                      <div className="mt-2 h-4 w-4/5 rounded bg-zinc-200/75" />
                      <div className="mt-6 h-12 rounded-2xl bg-[rgba(91,61,82,0.18)]" />
                    </div>
                  ) : draftQuery.isError && !draftNotFound ? (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-semibold text-red-800">
                        Draft status could not be checked
                      </p>

                      <button
                        type="button"
                        onClick={() => draftQuery.refetch()}
                        className="mt-3 text-sm font-semibold text-red-700 underline underline-offset-4"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative mt-6 rounded-[1.4rem] border border-white/55 bg-white/35 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                              {draftExists ? 'Draft available' : 'No quotation drafted'}
                            </p>

                            <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                              {draftExists ? 'Continue your quotation' : 'Prepare a quotation'}
                            </h2>
                          </div>

                          <span
                            className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
                              draftExists
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]'
                            }`}
                          >
                            {draftExists ? (
                              <Clock3 className="size-4.5" />
                            ) : (
                              <FileText className="size-4.5" />
                            )}
                          </span>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-[var(--color-charcoal)]/62">
                          {draftExists
                            ? 'A saved draft exists for this request. Review its pricing, deliverables, terms, and expiry before sending it to the customer.'
                            : 'Create a detailed response with pricing, deposit, inclusions, exclusions, terms, and expiry.'}
                        </p>
                      </div>

                      {canPrepareQuotation ? (
                        <Link
                          to={`/vendor/quotation-requests/${request.id}/quotation`}
                          className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_40px_rgba(91,61,82,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:shadow-[0_22px_50px_rgba(91,61,82,0.3)] focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
                        >
                          {draftExists ? 'Continue draft' : 'Create quotation'}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-100 p-4">
                          <p className="text-sm font-semibold text-zinc-700">
                            Quotation editing unavailable
                          </p>

                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            This request is closed, declined, accepted, or its response deadline has
                            already passed.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </section>

                <section className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid size-11 place-items-center rounded-[1.05rem] bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <FileText className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                        Request record
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/58">
                        Internal reference details for this quotation request.
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 space-y-5 border-t border-white/55 pt-6 text-sm">
                    <div className="rounded-2xl border border-white/55 bg-white/35 p-4">
                      <dt className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                        Request ID
                      </dt>

                      <dd className="mt-2 break-all text-sm font-semibold leading-6 text-[var(--color-charcoal)]">
                        {request.id}
                      </dd>
                    </div>

                    <div className="rounded-2xl border border-white/55 bg-white/35 p-4">
                      <dt className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                        Last updated
                      </dt>

                      <dd className="mt-2 font-semibold text-[var(--color-charcoal)]">
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
    </main>
  );
}
