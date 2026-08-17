import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  MapPin,
  Package,
  Search,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getVendorQuotationRequests,
  quotationRequestStatuses,
  type QuotationRequestStatus,
  type QuotationRequestSort,
  type VendorQuotationRequest,
} from '../features/quotationRequests/quotationRequest.api';
import { PageBackButton } from '../components/navigation/PageBackButton';

const PAGE_LIMIT = 9;

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
    return 'No deadline';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getCustomerName(request: VendorQuotationRequest) {
  const name = `${request.event.owner.firstName} ${request.event.owner.lastName}`.trim();

  return name || request.event.owner.email;
}

function isDeadlinePassed(value: string | null) {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() < Date.now();
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

  return 'Unable to load quotation requests right now.';
}

type QuotationRequestCardProps = {
  request: VendorQuotationRequest;
};

function QuotationRequestCard({ request }: QuotationRequestCardProps) {
  const deadlinePassed = isDeadlinePassed(request.responseDueAt);

  const requirementsPreview =
    request.requirements.length > 150
      ? `${request.requirements.slice(0, 150).trim()}…`
      : request.requirements;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-white/60 bg-white/44 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_62px_rgba(35,24,30,0.11)]">
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex rounded-full border px-3 py-1.5 text-[0.68rem] font-black ${statusStyles[request.status]}`}
        >
          {statusLabels[request.status]}
        </span>

        <span className="shrink-0 text-[0.68rem] font-bold text-[var(--color-charcoal)]/38">
          {formatDate(request.createdAt)}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[rgba(183,167,200,0.16)] px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)]">
            {request.event.eventType}
          </span>

          {request.package?.category?.name ? (
            <span className="rounded-full bg-[rgba(175,201,216,0.20)] px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[#405d69]">
              {request.package.category.name}
            </span>
          ) : null}
        </div>

        <h2 className="mt-4 line-clamp-2 text-xl font-black leading-tight tracking-[-0.04em] text-[var(--color-near-black)]">
          {request.event.name}
        </h2>

        <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-[var(--color-charcoal)]/58">
          {requirementsPreview}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] border border-white/58 bg-white/30 p-3.5">
          <CalendarDays className="size-4 text-[var(--color-rosewood)]" />

          <p className="mt-2 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
            Event date
          </p>

          <p className="mt-1 text-xs font-black leading-5 text-[var(--color-near-black)]">
            {formatEventDate(request.event.eventDate)}
          </p>
        </div>

        <div className="rounded-[1.2rem] border border-white/58 bg-white/30 p-3.5">
          <MapPin className="size-4 text-[var(--color-rosewood)]" />

          <p className="mt-2 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
            Location
          </p>

          <p className="mt-1 line-clamp-2 text-xs font-black leading-5 text-[var(--color-near-black)]">
            {request.event.location || 'Not provided'}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-[1.3rem] border border-white/58 bg-white/28 p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
            <UserRound className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
              Customer
            </p>

            <p className="mt-1 truncate text-sm font-black text-[var(--color-near-black)]">
              {getCustomerName(request)}
            </p>
          </div>
        </div>

        <div className="my-3 h-px bg-[rgba(93,58,85,0.08)]" />

        <div className="flex items-start gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.20)] text-[#405d69]">
            <Package className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
              Requested package
            </p>

            <p className="mt-1 truncate text-sm font-black text-[var(--color-near-black)]">
              {request.package?.title || 'Custom service request'}
            </p>
          </div>
        </div>
      </div>

      <div
        className={[
          'mt-3 rounded-[1.2rem] border px-4 py-3',
          deadlinePassed ? 'border-red-200/70 bg-red-50/60' : 'border-white/58 bg-white/26',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <span
            className={[
              'grid size-8 shrink-0 place-items-center rounded-full',
              deadlinePassed
                ? 'bg-red-100 text-red-600'
                : 'bg-[rgba(183,167,200,0.15)] text-[var(--color-deep-plum)]',
            ].join(' ')}
          >
            <Clock3 className="size-4" />
          </span>

          <div>
            <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
              Response deadline
            </p>

            <p
              className={[
                'mt-1 text-xs font-black',
                deadlinePassed ? 'text-red-600' : 'text-[var(--color-near-black)]',
              ].join(' ')}
            >
              {request.responseDueAt
                ? `${deadlinePassed ? 'Expired' : 'Respond by'} ${formatDate(
                    request.responseDueAt,
                  )}`
                : 'No response deadline'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-5">
        <Link
          to={`/vendor/quotation-requests/${request.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-4 py-3 text-sm font-black !text-white shadow-[0_12px_28px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white"
        >
          <span className="text-white">Review request</span>
          <ArrowUpRight className="size-4 text-white" />
        </Link>
      </div>
    </article>
  );
}

function QuotationRequestSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_60px_rgba(47,31,38,0.06)] backdrop-blur-xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="h-7 w-28 rounded-full bg-[rgba(183,167,200,0.22)]" />
        <div className="h-4 w-20 rounded-full bg-zinc-200/80" />
      </div>

      <div className="mt-5 flex gap-2">
        <div className="h-6 w-24 rounded-full bg-[rgba(183,167,200,0.16)]" />
        <div className="h-6 w-20 rounded-full bg-[rgba(175,201,216,0.18)]" />
      </div>

      <div className="mt-4 h-7 w-4/5 rounded-lg bg-zinc-200/80" />

      <div className="mt-4 space-y-2.5">
        <div className="h-4 w-full rounded bg-zinc-200/75" />
        <div className="h-4 w-full rounded bg-zinc-200/75" />
        <div className="h-4 w-3/4 rounded bg-zinc-200/75" />
      </div>

      <div className="mt-5 space-y-4 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="size-4 shrink-0 rounded-full bg-zinc-200" />

            <div className="flex-1">
              <div className="h-3 w-20 rounded bg-zinc-200/80" />
              <div className="mt-2 h-4 w-3/4 rounded bg-zinc-200/90" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[1.2rem] border border-white/45 bg-white/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-[rgba(183,167,200,0.16)]" />

          <div className="flex-1">
            <div className="h-3 w-28 rounded bg-zinc-200/80" />
            <div className="mt-2 h-4 w-36 rounded bg-zinc-200/90" />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="h-[50px] w-full rounded-2xl bg-[rgba(91,61,82,0.18)]" />
      </div>
    </div>
  );
}

export function VendorQuotationRequestsPage() {
  const [status, setStatus] = useState<QuotationRequestStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState<QuotationRequestSort>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const quotationRequestsQuery = useQuery({
    queryKey: ['vendor-quotation-requests', status, sort, page],
    queryFn: () =>
      getVendorQuotationRequests({
        status: status === 'ALL' ? undefined : status,
        sort,
        page,
        limit: PAGE_LIMIT,
      }),
  });

  const filteredRequests = useMemo(() => {
    const quotationRequests = quotationRequestsQuery.data?.quotationRequests ?? [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return quotationRequests;
    }

    return quotationRequests.filter((request) => {
      const searchableValues = [
        request.event.name,
        request.event.eventType,
        request.event.location,
        request.event.owner.firstName,
        request.event.owner.lastName,
        request.event.owner.email,
        request.package?.title,
        request.package?.category?.name,
        request.requirements,
      ];

      return searchableValues.some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [quotationRequestsQuery.data?.quotationRequests, searchTerm]);

  const pagination = quotationRequestsQuery.data?.pagination;
  const totalRequests = pagination?.total ?? 0;

  function handleStatusChange(nextStatus: QuotationRequestStatus | 'ALL') {
    setStatus(nextStatus);
    setPage(1);
  }

  function handleSortChange(nextSort: QuotationRequestSort) {
    setSort(nextSort);
    setPage(1);
  }

  return (
    <main className="workspace-shell relative">
      <div className="workspace-container w-full max-w-7xl">
        <header className="relative overflow-visible rounded-[1.75rem] border border-white/55 bg-white/34 p-4 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative flex items-center gap-4">
            <PageBackButton fallback="/vendor/dashboard" label="Dashboard" className="shrink-0" />

            <div className="min-w-0 border-l border-[rgba(93,58,85,0.12)] pl-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <h1 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-2xl">
                Quotation requests
              </h1>
            </div>
          </div>
        </header>

        <div className="pb-10 pt-6">
          <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_24px_70px_rgba(64,42,51,0.10)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-[rgba(183,167,200,0.23)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 left-[32%] size-72 rounded-full bg-[rgba(142,92,103,0.10)] blur-3xl"
            />

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:p-10">
              <div>
                <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <FileText className="size-4" />
                  Customer enquiries
                </div>

                <h2 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                  Turn customer interest into your next confirmed event.
                </h2>

                <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66">
                  Review incoming requirements, track response deadlines, and move suitable
                  opportunities toward a structured quotation.
                </p>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  <span className="soft-chip text-xs font-black">
                    <Inbox className="size-4" />
                    {quotationRequestsQuery.isLoading ? '—' : totalRequests} requests
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <FileText className="size-4" />
                    {status === 'ALL' ? 'All statuses' : statusLabels[status]}
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <Clock3 className="size-4" />
                    Response pipeline
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
                        Request pipeline
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Opportunities at a glance
                      </h3>
                    </div>

                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <FileText className="size-5" />
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                    Keep customer enquiries moving by reviewing requests and responding before their
                    deadlines.
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.25rem] border border-white/62 bg-white/34 p-4">
                      <p className="text-[0.64rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/38">
                        Total requests
                      </p>

                      <p className="mt-3 text-4xl font-black tracking-[-0.06em] text-[var(--color-near-black)]">
                        {quotationRequestsQuery.isLoading ? '—' : totalRequests}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/46">
                        Across the pipeline
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] border border-white/62 bg-white/34 p-4">
                      <p className="text-[0.64rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/38">
                        Visible now
                      </p>

                      <p className="mt-3 text-4xl font-black tracking-[-0.06em] text-[var(--color-near-black)]">
                        {quotationRequestsQuery.isLoading ? '—' : filteredRequests.length}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/46">
                        Current page results
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-white/58 bg-white/30 p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[rgba(91,61,82,0.10)] text-[var(--color-deep-plum)]">
                      <Clock3 className="size-4" />
                    </span>

                    <p className="text-xs font-bold leading-5 text-[var(--color-charcoal)]/55">
                      Response deadlines are shown directly on each request so urgent opportunities
                      are easier to identify.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-eyebrow">Customer enquiries</p>

                <h2 className="section-title">Your quotation requests</h2>

                <p className="section-description max-w-2xl">
                  Find requests by customer, event, package, or location and focus on the
                  opportunities that need your attention.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <span className="soft-chip text-xs font-black">
                  <Inbox className="size-4" />
                  {totalRequests} total
                </span>

                {pagination ? (
                  <span className="soft-chip text-xs font-black">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.85rem] border border-white/58 bg-white/42 p-4 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-5">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl"
              />

              <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <label className="relative block">
                  <span className="sr-only">Search quotation requests</span>

                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search events, customers, packages or locations"
                    className="form-field bg-white/38 pl-11"
                  />
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={status}
                    onChange={(event) =>
                      handleStatusChange(event.target.value as QuotationRequestStatus | 'ALL')
                    }
                    className="rounded-full border border-white/60 bg-white/36 px-4 py-3 text-sm font-black text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(91,61,82,0.28)] focus:bg-white/56 focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
                  >
                    <option value="ALL">All statuses</option>

                    {quotationRequestStatuses.map((quotationRequestStatus) => (
                      <option key={quotationRequestStatus} value={quotationRequestStatus}>
                        {statusLabels[quotationRequestStatus]}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sort}
                    onChange={(event) =>
                      handleSortChange(event.target.value as QuotationRequestSort)
                    }
                    className="rounded-full border border-white/60 bg-white/36 px-4 py-3 text-sm font-black text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(91,61,82,0.28)] focus:bg-white/56 focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5">
            {quotationRequestsQuery.isLoading ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <QuotationRequestSkeleton key={index} />
                ))}
              </div>
            ) : quotationRequestsQuery.isError ? (
              <div className="grid min-h-72 place-items-center rounded-[2rem] border border-red-200/70 bg-red-50/55 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.06)]">
                <div className="max-w-lg">
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600">
                    <AlertCircle className="size-6" />
                  </div>

                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-red-900">
                    Quotation requests could not be loaded
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-red-700">
                    {getErrorMessage(quotationRequestsQuery.error)}
                  </p>

                  <button
                    type="button"
                    onClick={() => quotationRequestsQuery.refetch()}
                    className="mt-6 rounded-full bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="grid min-h-72 place-items-center rounded-[2rem] border border-white/60 bg-white/44 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl">
                <div className="max-w-lg">
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                    {searchTerm.trim() ? (
                      <Search className="size-6" />
                    ) : (
                      <Inbox className="size-6" />
                    )}
                  </div>

                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    {searchTerm.trim()
                      ? 'No matching quotation requests'
                      : status === 'ALL'
                        ? 'Your quotation inbox is waiting'
                        : `No ${statusLabels[status].toLowerCase()} requests`}
                  </h2>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--color-charcoal)]/58">
                    {searchTerm.trim()
                      ? 'Try another event name, customer, package, location, or requirement.'
                      : status === 'ALL'
                        ? 'New customer quotation requests will appear here automatically.'
                        : 'There are currently no quotation requests in this status.'}
                  </p>

                  {searchTerm.trim() ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="btn-secondary mt-6 text-sm font-bold"
                    >
                      Clear search
                    </button>
                  ) : (
                    <div className="soft-chip mx-auto mt-6 w-fit text-xs font-black">
                      <FileText className="size-4" />
                      Requests appear automatically
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredRequests.map((request) => (
                    <QuotationRequestCard key={request.id} request={request} />
                  ))}
                </div>

                {pagination && pagination.totalPages > 1 ? (
                  <div className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-white/58 bg-white/42 p-4 shadow-[0_16px_42px_rgba(35,24,30,0.06)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Showing {filteredRequests.length} of {pagination.total} requests
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/46">
                        Page {pagination.page} of {pagination.totalPages}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!pagination.hasPreviousPage}
                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/36 px-4 py-2.5 text-sm font-black text-[var(--color-charcoal)] transition hover:bg-white/56 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </button>

                      <span className="grid min-w-10 place-items-center rounded-full bg-[var(--color-deep-plum)] px-3 py-2.5 text-sm font-black text-white">
                        {pagination.page}
                      </span>

                      <button
                        type="button"
                        disabled={!pagination.hasNextPage}
                        onClick={() => setPage((currentPage) => currentPage + 1)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/36 px-4 py-2.5 text-sm font-black text-[var(--color-charcoal)] transition hover:bg-white/56 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
