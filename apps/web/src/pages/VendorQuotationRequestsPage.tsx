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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700/70">
          {request.event.eventType}
        </p>

        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#2e2529]">
          {request.event.name}
        </h2>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">{requirementsPreview}</p>
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

      <div className="mt-5 flex items-center gap-2">
        <Clock3 className={`h-4 w-4 ${deadlinePassed ? 'text-red-500' : 'text-zinc-400'}`} />

        <p className={`text-sm ${deadlinePassed ? 'font-semibold text-red-600' : 'text-zinc-500'}`}>
          {request.responseDueAt
            ? `${deadlinePassed ? 'Deadline passed' : 'Respond by'} ${formatDate(
                request.responseDueAt,
              )}`
            : 'No response deadline'}
        </p>
      </div>

      <div className="mt-auto pt-6">
        <Link
          to={`/vendor/quotation-requests/${request.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#34282e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4b343e] focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
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
    <div className="animate-pulse rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-sm">
      <div className="flex justify-between">
        <div className="h-6 w-24 rounded-full bg-zinc-200" />
        <div className="h-4 w-16 rounded bg-zinc-200" />
      </div>

      <div className="mt-6 h-3 w-20 rounded bg-zinc-200" />
      <div className="mt-3 h-7 w-3/4 rounded bg-zinc-200" />
      <div className="mt-4 h-4 w-full rounded bg-zinc-200" />
      <div className="mt-2 h-4 w-5/6 rounded bg-zinc-200" />

      <div className="mt-6 space-y-4 rounded-2xl bg-zinc-100 p-4">
        <div className="h-10 rounded bg-zinc-200" />
        <div className="h-10 rounded bg-zinc-200" />
        <div className="h-10 rounded bg-zinc-200" />
      </div>

      <div className="mt-6 h-12 rounded-2xl bg-zinc-200" />
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
    <main className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-5" />
            </Link>

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

            <div className="rounded-2xl border border-white/55 bg-white/28 px-5 py-4">
              <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {quotationRequestsQuery.isLoading ? '—' : totalRequests}
              </p>

              <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">
                Requests across all statuses
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/75 bg-white/70 p-4 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Search events, customers, packages or locations"
                className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={status}
                onChange={(event) =>
                  handleStatusChange(event.target.value as QuotationRequestStatus | 'ALL')
                }
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
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
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
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
            <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/70 p-10 text-center shadow-sm sm:p-14">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
                {searchTerm.trim() ? (
                  <Search className="h-6 w-6 text-rose-700" />
                ) : (
                  <Inbox className="h-6 w-6 text-rose-700" />
                )}
              </div>

              <h2 className="mt-5 text-xl font-semibold text-[#34282e]">
                {searchTerm.trim()
                  ? 'No matching requests'
                  : status === 'ALL'
                    ? 'No customer requests yet'
                    : `No ${statusLabels[status].toLowerCase()} requests`}
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
                {searchTerm.trim()
                  ? 'Try another event, customer, package, location, or requirement keyword.'
                  : status === 'ALL'
                    ? 'New customer requests addressed to your business will appear here.'
                    : 'There are currently no requests under this status.'}
              </p>

              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mt-5 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredRequests.map((request) => (
                  <QuotationRequestCard key={request.id} request={request} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-sm sm:flex-row">
                  <div>
                    <p className="text-sm font-semibold text-zinc-700">
                      Showing {filteredRequests.length} of {pagination.total} requests
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!pagination.hasPreviousPage}
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={!pagination.hasNextPage}
                      onClick={() => setPage((currentPage) => currentPage + 1)}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
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
