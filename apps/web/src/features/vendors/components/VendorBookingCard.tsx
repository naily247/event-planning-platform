import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  MapPin,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { VendorBooking } from '../../bookings/booking.api';

type VendorBookingCardProps = {
  booking: VendorBooking;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatCurrency = (value: string) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'LKR 0';
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusTone = (status: VendorBooking['status']) => {
  switch (status) {
    case 'COMPLETED':
    case 'ACTIVE':
      return 'success';

    case 'CONFIRMED':
    case 'DEPOSIT_PENDING':
      return 'plum';

    case 'AWAITING_VENDOR_CONFIRMATION':
    case 'DISPUTED':
      return 'warning';

    case 'CANCELLED':
    case 'REJECTED':
      return 'danger';

    default:
      return 'neutral';
  }
};

const getCustomerName = (booking: VendorBooking) => {
  const firstName = booking.event.owner.firstName.trim();
  const lastName = booking.event.owner.lastName.trim();

  return [firstName, lastName].filter(Boolean).join(' ');
};

const getServiceTimeLabel = (booking: VendorBooking) => {
  const start = formatTime(booking.serviceStart);

  if (!booking.serviceEnd) {
    return start;
  }

  return `${start} – ${formatTime(booking.serviceEnd)}`;
};

export function VendorBookingCard({ booking }: VendorBookingCardProps) {
  const packageTitle =
    booking.acceptedQuotation.quotationRequest.package?.title ?? 'Custom event service';

  return (
    <article className="rounded-[1.4rem] border border-white/55 bg-white/24 p-4 shadow-[0_12px_34px_rgba(31,27,29,0.065)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/32">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.34)] text-[#334954]">
            <CalendarDays className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
              {booking.acceptedQuotation.quotationRequest.package?.category?.name ??
                'Vendor booking'}
            </p>

            <h3 className="mt-1 truncate text-lg font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              {packageTitle}
            </h3>

            <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/56">
              {booking.event.name}
            </p>
          </div>
        </div>

        <span className="status-chip w-fit shrink-0" data-tone={getStatusTone(booking.status)}>
          {booking.status.replaceAll('_', ' ')}
        </span>
      </div>

      <div className="mt-3 grid gap-x-5 gap-y-3 border-t border-white/42 pt-3 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserRound className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-[0.62rem] font-bold text-[var(--color-charcoal)]/44">Customer</p>

            <p className="truncate text-xs font-black text-[var(--color-near-black)]">
              {getCustomerName(booking)}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2.5">
          <MapPin className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-[0.62rem] font-bold text-[var(--color-charcoal)]/44">Location</p>

            <p className="truncate text-xs font-black text-[var(--color-near-black)]">
              {booking.event.location ?? 'Not specified'}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2.5">
          <Clock3 className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-[0.62rem] font-bold text-[var(--color-charcoal)]/44">Service time</p>

            <p className="truncate text-xs font-black text-[var(--color-near-black)]">
              {getServiceTimeLabel(booking)}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2.5">
          <CircleDollarSign className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-[0.62rem] font-bold text-[var(--color-charcoal)]/44">Agreed value</p>

            <p className="truncate text-xs font-black text-[var(--color-near-black)]">
              {formatCurrency(booking.agreedCost)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-white/42 pt-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div>
            <p className="text-[0.62rem] font-bold text-[var(--color-charcoal)]/44">Service date</p>

            <p className="mt-0.5 text-xs font-black text-[var(--color-near-black)]">
              {formatDate(booking.serviceStart)}
            </p>
          </div>

          <div>
            <p className="text-[0.62rem] font-bold text-[var(--color-charcoal)]/44">
              Booking created
            </p>

            <p className="mt-0.5 text-xs font-black text-[var(--color-near-black)]">
              {formatDate(booking.createdAt)}
            </p>
          </div>
        </div>

        <Link
          to={`/vendor/bookings/${booking.id}`}
          className="btn-secondary px-3 py-2 text-xs font-bold"
        >
          View booking
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
