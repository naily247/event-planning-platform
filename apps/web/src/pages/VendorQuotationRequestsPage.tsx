import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
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
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';
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
    request.requirements.length > 180
      ? `${request.requirements.slice(0, 180).trim()}…`
      : request.requirements;

  return (
    <article className="group flex h-full flex-col rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_60px_rgba(47,31,38,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(47,31,38,0.13)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[request.status]}`}
        >
          {statusLabels[request.status]}
        </span>

        <span className="text-xs font-medium text-zinc-400">{formatDate(request.createdAt)}</span>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[rgba(183,167,200,0.16)] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]">
            {request.event.eventType}
          </span>

          {request.package?.category?.name ? (
            <span className="rounded-full bg-[rgba(175,201,216,0.22)] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#405d69]">
              {request.package.category.name}
            </span>
          ) : null}
        </div>

        <h2 className="mt-4 text-[1.45rem] font-black leading-tight tracking-[-0.04em] text-[var(--color-near-black)]">
          {request.event.name}
        </h2>

        <p className="mt-4 line-clamp-4 text-sm leading-7 text-[var(--color-charcoal)]/62">
          {requirementsPreview}
        </p>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-4">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-medium text-zinc-400">Event date</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-700">
              {formatEventDate(request.event.eventDate)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-medium text-zinc-400">Location</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-700">
              {request.event.location || 'Location not provided'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-medium text-zinc-400">Customer</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-700">{getCustomerName(request)}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-medium text-zinc-400">Requested package</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-700">
              {request.package?.title || 'Custom service request'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.2rem] border border-white/45 bg-white/22 px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-8 place-items-center rounded-full ${
              deadlinePassed
                ? 'bg-red-100 text-red-600'
                : 'bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]'
            }`}
          >
            <Clock3 className="size-4" />
          </span>

          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
              Response deadline
            </p>

            <p
              className={`mt-1 text-sm font-bold ${
                deadlinePassed ? 'text-red-600' : 'text-[var(--color-charcoal)]/72'
              }`}
            >
              {request.responseDueAt
                ? `${deadlinePassed ? 'Expired on' : 'Respond by'} ${formatDate(
                    request.responseDueAt,
                  )}`
                : 'No response deadline'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <Link
          to={`/vendor/quotation-requests/${request.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-deep-plum)] px-4 py-3.5 text-sm font-black text-white shadow-[0_16px_40px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:shadow-[0_22px_50px_rgba(91,61,82,0.30)] focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
        >
          Review request
          <ArrowUpRight className="h-4 w-4" />
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
    <main className="workspace-shell">
      <div className="workspace-container w-full max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PageBackButton fallback="/vendor/dashboard" label="Dashboard" className="shrink-0" />

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <p className="mt-1 font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                Quotation request management
              </p>
            </div>
          </div>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <section className="glass-card mt-10 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <FileText className="size-4" />
                Quotation requests
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                Incoming customer requests
              </h1>

              <p className="mt-4 max-w-2xl leading-7 text-[var(--color-charcoal)]/68">
                Review event requirements, monitor response deadlines, and prepare quotations for
                opportunities that suit your business.
              </p>
            </div>

            <article className="glass-card overflow-hidden p-5 sm:p-6 lg:min-w-[320px]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                    Request overview
                  </p>

                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Current pipeline
                  </h2>
                </div>

                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                  <FileText className="size-5" />
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-[var(--color-charcoal)]/60">
                Monitor every customer enquiry and keep track of your quotation workload.
              </p>

              <div className="mt-6 rounded-[1.4rem] border border-white/50 bg-white/28 p-5">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                  Total requests
                </p>

                <p className="mt-2 text-4xl font-black tracking-[-0.06em] text-[var(--color-near-black)]">
                  {quotationRequestsQuery.isLoading ? '—' : totalRequests}
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/52">
                  Across all quotation request statuses
                </p>
              </div>

              <div className="mt-5 flex items-start gap-3 border-t border-white/48 pt-5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(91,61,82,0.11)] text-[var(--color-deep-plum)]">
                  <Clock3 className="size-3.5" />
                </span>

                <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                  Respond promptly to improve customer confidence and conversion rates.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="glass-card mt-6 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-lg">
              <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/40" />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Search events, customers, packages or locations..."
                className="w-full rounded-[1.35rem] border border-white/55 bg-white/35 py-3.5 pl-12 pr-5 text-sm font-medium text-[var(--color-charcoal)] outline-none backdrop-blur transition duration-300 placeholder:text-[var(--color-charcoal)]/38 focus:border-[rgba(91,61,82,0.25)] focus:bg-white/55 focus:ring-4 focus:ring-[rgba(183,167,200,0.18)]"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={status}
                onChange={(event) =>
                  handleStatusChange(event.target.value as QuotationRequestStatus | 'ALL')
                }
                className="rounded-[1.25rem] border border-white/55 bg-white/35 px-4 py-3 text-sm font-bold text-[var(--color-charcoal)] outline-none backdrop-blur transition duration-300 focus:border-[rgba(91,61,82,0.25)] focus:bg-white/55 focus:ring-4 focus:ring-[rgba(183,167,200,0.18)]"
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
                onChange={(event) => handleSortChange(event.target.value as QuotationRequestSort)}
                className="rounded-[1.25rem] border border-white/55 bg-white/35 px-4 py-3 text-sm font-bold text-[var(--color-charcoal)] outline-none backdrop-blur transition duration-300 focus:border-[rgba(91,61,82,0.25)] focus:bg-white/55 focus:ring-4 focus:ring-[rgba(183,167,200,0.18)]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mt-6">
          {quotationRequestsQuery.isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <QuotationRequestSkeleton key={index} />
              ))}
            </div>
          ) : quotationRequestsQuery.isError ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
              <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

              <h2 className="mt-4 text-lg font-semibold text-red-900">
                Quotation requests could not be loaded
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
                {getErrorMessage(quotationRequestsQuery.error)}
              </p>

              <button
                type="button"
                onClick={() => quotationRequestsQuery.refetch()}
                className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
              >
                Try again
              </button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="glass-card relative overflow-hidden p-10 text-center sm:p-14">
              <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl" />

              <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-[rgba(221,188,163,0.16)] blur-3xl" />

              <div className="relative mx-auto max-w-xl">
                <div className="mx-auto grid size-16 place-items-center rounded-[1.4rem] bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)] shadow-[0_14px_35px_rgba(91,61,82,0.08)]">
                  {searchTerm.trim() ? <Search className="size-7" /> : <Inbox className="size-7" />}
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  {searchTerm.trim()
                    ? 'No matching quotation requests'
                    : status === 'ALL'
                      ? 'Your quotation inbox is waiting'
                      : `No ${statusLabels[status].toLowerCase()} requests`}
                </h2>

                <p className="mx-auto mt-4 max-w-lg leading-7 text-[var(--color-charcoal)]/62">
                  {searchTerm.trim()
                    ? 'Try searching with another event name, customer, package, location, or requirement.'
                    : status === 'ALL'
                      ? 'When customers request quotations from your business, they will appear here for you to review and respond.'
                      : 'There are currently no quotation requests in this status.'}
                </p>

                {searchTerm.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="btn-secondary mt-8 text-sm font-bold"
                  >
                    Clear search
                  </button>
                ) : (
                  <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/28 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]">
                    <FileText className="size-4" />
                    New requests will appear automatically
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

              {pagination && pagination.totalPages > 1 && (
                <div className="glass-card mt-8 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <FileText className="size-5" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Showing {filteredRequests.length} of {pagination.total} requests
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                        Page {pagination.page} of {pagination.totalPages}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!pagination.hasPreviousPage}
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/55 bg-white/35 px-4 py-3 text-sm font-black text-[var(--color-charcoal)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/60 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 sm:flex-none"
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </button>

                    <div className="hidden min-w-12 items-center justify-center rounded-2xl bg-[var(--color-deep-plum)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_35px_rgba(91,61,82,0.2)] sm:flex">
                      {pagination.page}
                    </div>

                    <button
                      type="button"
                      disabled={!pagination.hasNextPage}
                      onClick={() => setPage((currentPage) => currentPage + 1)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/55 bg-white/35 px-4 py-3 text-sm font-black text-[var(--color-charcoal)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/60 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 sm:flex-none"
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
