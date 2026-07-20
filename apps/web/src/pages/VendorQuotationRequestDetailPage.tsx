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
      <main className="min-h-screen bg-[#f5f1f0] px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(190,137,154,0.18),_transparent_34%),linear-gradient(180deg,_#f8f5f4_0%,_#f3efee_100%)] text-[#2e2529]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <VendorWorkspaceNav />

        <div className="mt-6">
          <Link
            to="/vendor/quotation-requests"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-rose-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to quotation requests
          </Link>
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
            <section className="mt-6 overflow-hidden rounded-[32px] border border-white/80 bg-white/65 p-6 shadow-[0_24px_80px_rgba(64,42,51,0.08)] backdrop-blur-xl sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusStyles[request.status]
                      }`}
                    >
                      {statusLabels[request.status]}
                    </span>

                    {markViewedMutation.isPending && (
                      <span className="text-xs font-medium text-zinc-400">Marking as viewed…</span>
                    )}

                    {markViewedMutation.isSuccess && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Marked as viewed
                      </span>
                    )}
                  </div>

                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700/70">
                    {request.event.eventType}
                  </p>

                  <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-[#2e2529] sm:text-4xl">
                    {request.event.name}
                  </h1>

                  <p className="mt-3 text-sm text-zinc-500">
                    Received {formatDateTime(request.createdAt)}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border px-5 py-4 ${
                    deadlinePassed ? 'border-red-200 bg-red-50' : 'border-white bg-white/85'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock3
                      className={`h-4 w-4 ${deadlinePassed ? 'text-red-600' : 'text-rose-700'}`}
                    />

                    <p
                      className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                        deadlinePassed ? 'text-red-600' : 'text-zinc-400'
                      }`}
                    >
                      Response deadline
                    </p>
                  </div>

                  <p
                    className={`mt-2 text-lg font-semibold ${
                      deadlinePassed ? 'text-red-800' : 'text-[#34282e]'
                    }`}
                  >
                    {request.responseDueAt ? formatDate(request.responseDueAt) : 'No deadline'}
                  </p>

                  {deadlinePassed && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      This response deadline has passed.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <CalendarDays className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Event overview
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-[#34282e]">Event details</h2>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
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

                <section className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Customer request
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-[#34282e]">
                        Service requirements
                      </h2>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-5">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                      {request.requirements}
                    </p>
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <Package className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Requested service
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-[#34282e]">
                        Package information
                      </h2>
                    </div>
                  </div>

                  {request.package ? (
                    <div className="mt-6 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-[#34282e]">
                            {request.package.title}
                          </p>

                          <p className="mt-1 text-sm font-medium text-rose-700">
                            {request.package.category?.name || 'Service package'}
                          </p>
                        </div>

                        <p className="text-lg font-semibold text-[#34282e]">
                          {formatMoney(request.package.basePrice)}
                        </p>
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
                <section className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.07)] backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                        Customer
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-[#34282e]">
                        {`${request.event.owner.firstName} ${request.event.owner.lastName}`.trim() ||
                          'Customer'}
                      </h2>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <DetailItem icon={Mail} label="Email" value={request.event.owner.email} />

                    <DetailItem
                      icon={Phone}
                      label="Phone"
                      value={request.event.owner.phone || 'Phone number not provided'}
                    />
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.08)] backdrop-blur-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    Quotation response
                  </p>

                  {draftQuery.isLoading ? (
                    <div className="mt-5 animate-pulse">
                      <div className="h-5 w-2/3 rounded bg-zinc-200" />
                      <div className="mt-3 h-4 w-full rounded bg-zinc-200" />
                      <div className="mt-6 h-12 rounded-2xl bg-zinc-200" />
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
                      <h2 className="mt-3 text-xl font-semibold text-[#34282e]">
                        {draftExists ? 'Continue your quotation' : 'Prepare a quotation'}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        {draftExists
                          ? 'A saved draft exists for this request. Review it before sending it to the customer.'
                          : 'Create a detailed response with pricing, deposit, inclusions, exclusions, terms, and expiry.'}
                      </p>

                      {canPrepareQuotation ? (
                        <Link
                          to={`/vendor/quotation-requests/${request.id}/quotation`}
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#34282e] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#4b343e] focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
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

                <section className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-sm backdrop-blur-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    Request record
                  </p>

                  <dl className="mt-4 space-y-4 text-sm">
                    <div>
                      <dt className="text-zinc-400">Request ID</dt>
                      <dd className="mt-1 break-all font-medium text-zinc-700">{request.id}</dd>
                    </div>

                    <div>
                      <dt className="text-zinc-400">Last updated</dt>
                      <dd className="mt-1 font-medium text-zinc-700">
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
