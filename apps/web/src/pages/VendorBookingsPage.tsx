import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
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
  bookingSortOptions,
  bookingStatuses,
  getVendorBookings,
  type BookingSort,
  type BookingStatus,
  type VendorBooking,
} from '../features/bookings/booking.api';

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
  const name =
    `${booking.event.owner.firstName} ${booking.event.owner.lastName}`.trim();

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
    booking.acceptedQuotation.quotationRequest.package?.title ??
    'Custom service';

  const categoryName =
    booking.acceptedQuotation.quotationRequest.package?.category?.name ??
    'Event service';

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.55rem] border border-white/60 bg-white/42 p-4 shadow-[0_14px_38px_rgba(35,24,30,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/52 hover:shadow-[0_20px_48px_rgba(35,24,30,0.09)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-36 rounded-full bg-[rgba(183,167,200,0.12)] opacity-70 blur-3xl transition duration-500 group-hover:scale-125"
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-black ${
              bookingStatusStyles[booking.status]
            }`}
          >
            {bookingStatusLabels[booking.status]}
          </span>

          <span className="shrink-0 text-[0.62rem] font-bold text-[var(--color-charcoal)]/38">
            {formatDateTime(booking.createdAt)}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-[0.61rem] font-black uppercase tracking-[0.15em] text-[var(--color-rosewood)]">
            {booking.event.eventType}
          </p>

          <h2 className="mt-1.5 line-clamp-1 text-lg font-black leading-tight tracking-[-0.035em] text-[var(--color-near-black)]">
            {booking.event.name}
          </h2>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[rgba(183,167,200,0.16)] px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-[var(--color-deep-plum)]">
              {packageTitle}
            </span>

            <span className="rounded-full bg-[rgba(175,201,216,0.20)] px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#405d69]">
              {categoryName}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-white/55 bg-white/28 px-3 py-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(142,92,103,0.09)] text-[var(--color-rosewood)]">
              <CalendarDays className="size-3.5" />
            </span>

            <div className="min-w-0">
              <p className="text-[0.55rem] font-black uppercase tracking-[0.1em] text-[var(--color-charcoal)]/38">
                Service start
              </p>

              <p className="mt-0.5 text-[0.7rem] font-black leading-4 text-[var(--color-near-black)]">
                {formatDateTime(booking.serviceStart)}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-white/55 bg-white/28 px-3 py-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(142,92,103,0.09)] text-[var(--color-rosewood)]">
              <CircleDollarSign className="size-3.5" />
            </span>

            <div className="min-w-0">
              <p className="text-[0.55rem] font-black uppercase tracking-[0.1em] text-[var(--color-charcoal)]/38">
                Agreed cost
              </p>

              <p className="mt-0.5 truncate text-[0.7rem] font-black leading-4 text-[var(--color-near-black)]">
                {formatMoney(booking.agreedCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/55 bg-white/24 px-3 py-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
              <MapPin className="size-3.5" />
            </span>

            <div className="min-w-0">
              <p className="text-[0.54rem] font-black uppercase tracking-[0.1em] text-[var(--color-charcoal)]/38">
                Location
              </p>

              <p className="mt-0.5 truncate text-xs font-black text-[var(--color-near-black)]">
                {booking.event.location || 'Location not provided'}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/55 bg-white/24 px-3 py-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[rgba(175,201,216,0.18)] text-[#405d69]">
              <UserRound className="size-3.5" />
            </span>

            <div className="min-w-0">
              <p className="text-[0.54rem] font-black uppercase tracking-[0.1em] text-[var(--color-charcoal)]/38">
                Customer
              </p>

              <p className="mt-0.5 truncate text-xs font-black text-[var(--color-near-black)]">
                {getCustomerName(booking)}
              </p>
            </div>
          </div>
        </div>

        {booking.serviceEnd ? (
          <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-white/55 bg-white/20 px-3 py-2">
            <Clock3 className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />

            <p className="min-w-0 text-[0.66rem] font-bold text-[var(--color-charcoal)]/55">
              <span className="font-black text-[var(--color-near-black)]">
                Service end:
              </span>{' '}
              {formatDateTime(booking.serviceEnd)}
            </p>
          </div>
        ) : null}

        {booking.status === 'AWAITING_VENDOR_CONFIRMATION' ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2">
            <Clock3 className="size-3.5 shrink-0 text-amber-700" />

            <p className="text-[0.68rem] font-bold leading-4 text-amber-800">
              Confirmation or rejection required.
            </p>
          </div>
        ) : null}

        {booking.status === 'ACTIVE' ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-200/80 bg-violet-50/70 px-3 py-2">
            <Clock3 className="size-3.5 shrink-0 text-violet-700" />

            <p className="text-[0.68rem] font-bold leading-4 text-violet-800">
              Service currently in progress.
            </p>
          </div>
        ) : null}

        <div className="mt-auto pt-3">
          <Link
            to={`/vendor/bookings/${booking.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-deep-plum)] px-4 py-2.5 text-xs font-black !text-white shadow-[0_8px_20px_rgba(91,61,82,0.14)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white"
          >
            <span className="text-white">Manage booking</span>
            <ArrowUpRight className="size-3.5 text-white" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function BookingSkeleton() {
  return (
    <div className="glass-card animate-pulse p-4">
      <div className="flex justify-between">
        <div className="h-5 w-32 rounded-full bg-zinc-200" />
        <div className="h-3 w-20 rounded bg-zinc-200" />
      </div>

      <div className="mt-4 h-3 w-20 rounded bg-zinc-200" />
      <div className="mt-2 h-6 w-3/4 rounded bg-zinc-200" />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-14 rounded-xl bg-zinc-200" />
        <div className="h-14 rounded-xl bg-zinc-200" />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="h-12 rounded-xl bg-zinc-200" />
        <div className="h-12 rounded-xl bg-zinc-200" />
      </div>

      <div className="mt-3 h-10 rounded-xl bg-zinc-200" />
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
      const packageDetails =
        booking.acceptedQuotation.quotationRequest.package;

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

      return searchableValues.some((value) =>
        value?.toLowerCase().includes(normalizedSearch),
      );
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
    <main className="workspace-shell relative">
      <div className="workspace-container w-full max-w-7xl">
        <div className="pb-8 pt-3">
          <section className="relative isolate overflow-hidden rounded-[1.9rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_20px_58px_rgba(64,42,51,0.09)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 left-[32%] size-64 rounded-full bg-[rgba(142,92,103,0.08)] blur-3xl"
            />

            <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-center lg:gap-6 lg:p-7">
              <div>
                <div className="soft-chip w-fit text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                  <BriefcaseBusiness className="size-3.5" />
                  Service bookings
                </div>

                <h1 className="mt-4 max-w-3xl text-balance text-3xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl">
                  Manage every confirmed customer commitment in one place.
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/62">
                  Review new booking requests, prepare for upcoming services,
                  and follow confirmed work from acceptance through completion.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="soft-chip text-[0.68rem] font-black">
                    <BriefcaseBusiness className="size-3.5" />
                    {bookingsQuery.isLoading ? '—' : totalBookings} bookings
                  </span>

                  <span className="soft-chip text-[0.68rem] font-black">
                    <FileText className="size-3.5" />
                    {status === 'ALL'
                      ? 'All statuses'
                      : bookingStatusLabels[status]}
                  </span>

                  <span className="soft-chip text-[0.68rem] font-black">
                    <CalendarDays className="size-3.5" />
                    Service schedule
                  </span>
                </div>
              </div>

              <article className="relative overflow-hidden rounded-[1.45rem] border border-white/70 bg-white/46 p-4 shadow-[0_14px_36px_rgba(31,27,29,0.07)] backdrop-blur-2xl">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.61rem] font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                        Booking pipeline
                      </p>

                      <h2 className="mt-1 text-lg font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        Current commitments
                      </h2>
                    </div>

                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <BriefcaseBusiness className="size-4" />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/62 bg-white/30 px-3 py-2.5">
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.1em] text-[var(--color-charcoal)]/38">
                        Total bookings
                      </p>

                      <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {bookingsQuery.isLoading ? '—' : totalBookings}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/62 bg-white/30 px-3 py-2.5">
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.1em] text-[var(--color-charcoal)]/38">
                        Visible now
                      </p>

                      <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {bookingsQuery.isLoading
                          ? '—'
                          : filteredBookings.length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-white/58 bg-white/26 px-3 py-2.5">
                    <Clock3 className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />

                    <p className="text-[0.65rem] font-bold leading-4 text-[var(--color-charcoal)]/52">
                      Status and service timing stay visible on every booking.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="mt-5">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-eyebrow">Customer commitments</p>

                <h2 className="section-title">Your bookings</h2>

                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                  Search by event, customer, package, location, or status.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <span className="soft-chip text-[0.68rem] font-black">
                  <BriefcaseBusiness className="size-3.5" />
                  {totalBookings} total
                </span>

                {pagination ? (
                  <span className="soft-chip text-[0.68rem] font-black">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.4rem] border border-white/58 bg-white/40 p-3 shadow-[0_12px_34px_rgba(35,24,30,0.055)] backdrop-blur-xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 size-40 rounded-full bg-[rgba(183,167,200,0.10)] blur-3xl"
              />

              <div className="relative grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <label className="relative block">
                  <span className="sr-only">Search bookings</span>

                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search events, customers, packages or locations"
                    className="form-field min-h-0 bg-white/34 py-2.5 pl-10 text-sm"
                  />
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={status}
                    onChange={(event) =>
                      handleStatusChange(
                        event.target.value as BookingStatus | 'ALL',
                      )
                    }
                    className="rounded-xl border border-white/60 bg-white/34 px-3.5 py-2.5 text-xs font-black text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(91,61,82,0.28)] focus:bg-white/56 focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
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
                    onChange={(event) =>
                      handleSortChange(event.target.value as BookingSort)
                    }
                    className="rounded-xl border border-white/60 bg-white/34 px-3.5 py-2.5 text-xs font-black text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(91,61,82,0.28)] focus:bg-white/56 focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
                  >
                    {bookingSortOptions.map((bookingSort) => (
                      <option key={bookingSort} value={bookingSort}>
                        {bookingSortLabels[bookingSort]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-4">
            {bookingsQuery.isLoading ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <BookingSkeleton key={index} />
                ))}
              </div>
            ) : bookingsQuery.isError ? (
              <div className="grid min-h-60 place-items-center rounded-[1.6rem] border border-red-200/70 bg-red-50/55 p-6 text-center shadow-[0_14px_38px_rgba(35,24,30,0.05)]">
                <div className="max-w-lg">
                  <div className="mx-auto grid size-11 place-items-center rounded-xl bg-red-100 text-red-600">
                    <AlertCircle className="size-5" />
                  </div>

                  <h2 className="mt-4 text-xl font-black tracking-[-0.035em] text-red-900">
                    Bookings could not be loaded
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-red-700">
                    {getErrorMessage(bookingsQuery.error)}
                  </p>

                  <button
                    type="button"
                    onClick={() => bookingsQuery.refetch()}
                    className="mt-4 rounded-full bg-red-700 px-4 py-2.5 text-sm font-black !text-white"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="grid min-h-60 place-items-center rounded-[1.6rem] border border-white/60 bg-white/42 p-6 text-center shadow-[0_14px_38px_rgba(35,24,30,0.06)] backdrop-blur-xl">
                <div className="max-w-lg">
                  <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                    {searchTerm.trim() ? (
                      <Search className="size-5" />
                    ) : (
                      <Inbox className="size-5" />
                    )}
                  </div>

                  <h2 className="mt-4 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                    {searchTerm.trim()
                      ? 'No matching bookings'
                      : status === 'ALL'
                        ? 'No customer bookings yet'
                        : `No ${bookingStatusLabels[status].toLowerCase()} bookings`}
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-charcoal)]/58">
                    {searchTerm.trim()
                      ? 'Try another event, customer, package, location, or requirement keyword.'
                      : status === 'ALL'
                        ? 'Bookings created from accepted quotations will appear here.'
                        : 'There are currently no bookings under this status.'}
                  </p>

                  {searchTerm.trim() ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="btn-secondary mt-4 text-sm font-bold"
                    >
                      Clear search
                    </button>
                  ) : (
                    <div className="soft-chip mx-auto mt-4 w-fit text-xs font-black">
                      <BriefcaseBusiness className="size-4" />
                      Bookings appear automatically
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>

                {pagination && pagination.totalPages > 1 ? (
                  <div className="mt-4 flex flex-col gap-3 rounded-[1.4rem] border border-white/58 bg-white/40 p-3.5 shadow-[0_12px_34px_rgba(35,24,30,0.05)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black text-[var(--color-near-black)]">
                        Showing {filteredBookings.length} of {pagination.total}{' '}
                        bookings
                      </p>

                      <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/46">
                        Page {pagination.page} of {pagination.totalPages}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!pagination.hasPreviousPage}
                        onClick={() =>
                          setPage((currentPage) =>
                            Math.max(1, currentPage - 1),
                          )
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/60 bg-white/34 px-3 py-2 text-xs font-black text-[var(--color-charcoal)] transition hover:bg-white/56 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ChevronLeft className="size-3.5" />
                        Previous
                      </button>

                      <span className="grid min-w-9 place-items-center rounded-xl bg-[var(--color-deep-plum)] px-3 py-2 text-xs font-black text-white">
                        {pagination.page}
                      </span>

                      <button
                        type="button"
                        disabled={!pagination.hasNextPage}
                        onClick={() =>
                          setPage((currentPage) => currentPage + 1)
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/60 bg-white/34 px-3 py-2 text-xs font-black text-[var(--color-charcoal)] transition hover:bg-white/56 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Next
                        <ChevronRight className="size-3.5" />
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