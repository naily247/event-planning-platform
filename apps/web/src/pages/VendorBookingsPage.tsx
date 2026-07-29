import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Inbox,
  MapPin,
  Package,
  Search,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  bookingSortOptions,
  bookingStatuses,
  getVendorBookings,
  type BookingSort,
  type BookingStatus,
  type VendorBooking,
} from '../features/bookings/booking.api';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';

const PAGE_LIMIT = 9;

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

const bookingSortLabels: Record<BookingSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  service_soonest: 'Service soonest',
  service_latest: 'Service latest',
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatMoney(value: string) {
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

function getCustomerName(booking: VendorBooking) {
  const name = `${booking.event.owner.firstName} ${booking.event.owner.lastName}`.trim();

  return name || booking.event.owner.email;
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

  return 'Unable to load vendor bookings right now.';
}

function BookingCard({ booking }: { booking: VendorBooking }) {
  const packageTitle =
    booking.acceptedQuotation.quotationRequest.package?.title ?? 'Custom service';

  const categoryName =
    booking.acceptedQuotation.quotationRequest.package?.category?.name ?? 'Event service';

  return (
    <article className="glass-card group relative flex h-full flex-col overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_75px_rgba(47,31,38,0.14)] sm:p-6">
      <div className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl transition duration-500 group-hover:scale-110" />
      <div className="relative flex items-start justify-between gap-4">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
            bookingStatusStyles[booking.status]
          }`}
        >
          {bookingStatusLabels[booking.status]}
        </span>

        <span className="text-xs font-medium text-zinc-400">
          {formatDateTime(booking.createdAt)}
        </span>
      </div>

      <div className="relative mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700/70">
          {booking.event.eventType}
        </p>

        <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
          {booking.event.name}
        </h2>

        <p className="mt-2 text-sm font-black text-[var(--color-deep-plum)]">{packageTitle}</p>

        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/42">{categoryName}</p>
      </div>

      <div className="relative mt-5 grid gap-4 rounded-[1.35rem] border border-white/65 bg-white/48 p-4 shadow-inner">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-medium text-zinc-400">Service schedule</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-700">
              {formatDateTime(booking.serviceStart)}
            </p>

            {booking.serviceEnd && (
              <p className="mt-1 text-xs text-zinc-500">
                Ends {formatDateTime(booking.serviceEnd)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-medium text-zinc-400">Location</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-700">
              {booking.event.location || 'Location not provided'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-medium text-zinc-400">Customer</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-700">{getCustomerName(booking)}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-medium text-zinc-400">Agreed cost</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-800">
              {formatMoney(booking.agreedCost)}
            </p>
          </div>
        </div>
      </div>

      {booking.status === 'AWAITING_VENDOR_CONFIRMATION' && (
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

          <p className="text-xs font-medium leading-5 text-amber-800">
            This booking is waiting for your confirmation or rejection.
          </p>
        </div>
      )}

      {booking.status === 'ACTIVE' && (
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />

          <p className="text-xs font-medium leading-5 text-violet-800">
            This booking is currently in progress.
          </p>
        </div>
      )}

      <div className="mt-auto pt-6">
        <Link
          to={`/vendor/bookings/${booking.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-deep-plum)] px-4 py-3.5 text-sm font-black text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:shadow-[0_22px_48px_rgba(91,61,82,0.28)] focus:outline-none focus:ring-4 focus:ring-[rgba(183,167,200,0.22)] disabled:hover:translate-y-0"
        >
          Manage booking
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function BookingSkeleton() {
  return (
    <div className="glass-card animate-pulse p-6">
      <div className="flex justify-between">
        <div className="h-6 w-36 rounded-full bg-zinc-200" />
        <div className="h-4 w-20 rounded bg-zinc-200" />
      </div>

      <div className="mt-6 h-3 w-20 rounded bg-zinc-200" />
      <div className="mt-3 h-7 w-3/4 rounded bg-zinc-200" />
      <div className="mt-3 h-4 w-1/2 rounded bg-zinc-200" />

      <div className="mt-6 space-y-4 rounded-2xl bg-zinc-100 p-4">
        <div className="h-10 rounded bg-zinc-200" />
        <div className="h-10 rounded bg-zinc-200" />
        <div className="h-10 rounded bg-zinc-200" />
        <div className="h-10 rounded bg-zinc-200" />
      </div>

      <div className="mt-6 h-12 rounded-2xl bg-zinc-200" />
    </div>
  );
}

export function VendorBookingsPage() {
  const [status, setStatus] = useState<BookingStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState<BookingSort>('service_soonest');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const bookingsQuery = useQuery({
    queryKey: ['vendor-bookings', status, sort, page],
    queryFn: () =>
      getVendorBookings({
        status: status === 'ALL' ? undefined : status,
        sort,
        page,
        limit: PAGE_LIMIT,
      }),
  });

  const filteredBookings = useMemo(() => {
    const bookings = bookingsQuery.data?.bookings ?? [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return bookings;
    }

    return bookings.filter((booking) => {
      const packageDetails = booking.acceptedQuotation.quotationRequest.package;

      const searchableValues = [
        booking.event.name,
        booking.event.eventType,
        booking.event.location,
        booking.event.owner.firstName,
        booking.event.owner.lastName,
        booking.event.owner.email,
        booking.event.owner.phone,
        packageDetails?.title,
        packageDetails?.category?.name,
        booking.acceptedQuotation.quotationRequest.requirements,
        booking.vendorResponseNote,
      ];

      return searchableValues.some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [bookingsQuery.data?.bookings, searchTerm]);

  const pagination = bookingsQuery.data?.pagination;
  const totalBookings = pagination?.total ?? 0;

  function handleStatusChange(nextStatus: BookingStatus | 'ALL') {
    setStatus(nextStatus);
    setPage(1);
  }

  function handleSortChange(nextSort: BookingSort) {
    setSort(nextSort);
    setPage(1);
  }

  return (
    <main className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
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
                Booking management
              </p>
            </div>
          </div>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <section className="glass-card relative mt-10 overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl" />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <BriefcaseBusiness className="size-4" />
                Bookings
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                Manage your confirmed bookings
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--color-charcoal)]/62">
                Review new booking requests, prepare for upcoming services, and manage every
                customer engagement from confirmation through completion.
              </p>
            </div>

            <div className="relative min-w-[220px] overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/38 p-5 shadow-[0_18px_48px_rgba(49,35,42,0.08)] backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[rgba(183,167,200,0.18)] blur-2xl" />

              <div className="relative flex items-center gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.22)]">
                  <BriefcaseBusiness className="size-5" />
                </div>

                <div>
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {bookingsQuery.isLoading ? '—' : totalBookings}
                  </p>

                  <p className="mt-1 text-xs font-bold leading-5 text-[var(--color-charcoal)]/52">
                    Bookings across all statuses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card relative mt-6 overflow-hidden p-4 sm:p-5">
          <div className="pointer-events-none absolute -left-12 -top-16 size-40 rounded-full bg-[rgba(214,190,177,0.12)] blur-3xl" />
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-rosewood)]/70" />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Search events, customers, packages or locations"
                className="w-full rounded-2xl border border-white/70 bg-white/72 py-3.5 pl-11 pr-4 text-sm font-medium text-[var(--color-charcoal)] shadow-sm outline-none transition duration-300 placeholder:text-[var(--color-charcoal)]/38 focus:border-[rgba(91,61,82,0.18)] focus:bg-white focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={status}
                onChange={(event) =>
                  handleStatusChange(event.target.value as BookingStatus | 'ALL')
                }
                className="min-w-[180px] rounded-2xl border border-white/70 bg-white/72 px-4 py-3.5 text-sm font-bold text-[var(--color-charcoal)] shadow-sm outline-none transition duration-300 focus:border-[rgba(91,61,82,0.18)] focus:bg-white focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
              >
                <option value="ALL">All statuses</option>

                {bookingStatuses.map((bookingStatus) => (
                  <option key={bookingStatus} value={bookingStatus}>
                    {bookingStatusLabels[bookingStatus]}
                  </option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(event) => handleSortChange(event.target.value as BookingSort)}
                className="min-w-[180px] rounded-2xl border border-white/70 bg-white/72 px-4 py-3.5 text-sm font-bold text-[var(--color-charcoal)] shadow-sm outline-none transition duration-300 focus:border-[rgba(91,61,82,0.18)] focus:bg-white focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
              >
                {bookingSortOptions.map((bookingSort) => (
                  <option key={bookingSort} value={bookingSort}>
                    {bookingSortLabels[bookingSort]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-6">
          {bookingsQuery.isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <BookingSkeleton key={index} />
              ))}
            </div>
          ) : bookingsQuery.isError ? (
            <div className="glass-card relative overflow-hidden p-8 text-center sm:p-10">
              <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
                <AlertCircle className="size-6" />
              </div>

              <h2 className="relative mt-5 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                Bookings could not be loaded
              </h2>

              <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--color-charcoal)]/62">
                {getErrorMessage(bookingsQuery.error)}
              </p>

              <button
                type="button"
                onClick={() => bookingsQuery.refetch()}
                className="relative mt-6 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
              >
                Try again
              </button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="glass-card relative overflow-hidden p-10 text-center sm:p-14">
              <div className="pointer-events-none absolute -left-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />
              <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.16)] text-[var(--color-deep-plum)]">
                {searchTerm.trim() ? <Search className="size-6" /> : <Inbox className="size-6" />}
              </div>

              <h2 className="relative mt-5 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                {searchTerm.trim()
                  ? 'No matching bookings'
                  : status === 'ALL'
                    ? 'No customer bookings yet'
                    : `No ${bookingStatusLabels[status].toLowerCase()} bookings`}
              </h2>

              <p className="relative mx-auto mt-3 max-w-lg text-sm leading-7 text-[var(--color-charcoal)]/58">
                {searchTerm.trim()
                  ? 'Try another event, customer, package, location, or requirement keyword.'
                  : status === 'ALL'
                    ? 'Bookings created from accepted quotations will appear here.'
                    : 'There are currently no bookings under this status.'}
              </p>

              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="relative mt-6 rounded-2xl border border-white/70 bg-white/72 px-5 py-3 text-sm font-black text-[var(--color-charcoal)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[var(--color-deep-plum)]"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="glass-card mt-8 flex flex-col items-center justify-between gap-4 px-5 py-4 sm:flex-row">
                  <div>
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Showing {filteredBookings.length} of {pagination.total} bookings
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!pagination.hasPreviousPage}
                      onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/72 px-4 py-2.5 text-sm font-black text-[var(--color-charcoal)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={!pagination.hasNextPage}
                      onClick={() => setPage((currentPage) => currentPage + 1)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-deep-plum)] px-4 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(91,61,82,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
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
