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
    <article className="rounded-[1.75rem] border border-white/55 bg-white/24 p-5 shadow-[0_16px_45px_rgba(31,27,29,0.08)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-white/32">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.34)] text-[#334954]">
            <CalendarDays className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
              {booking.acceptedQuotation.quotationRequest.package?.category?.name ??
                'Vendor booking'}
            </p>

            <h3 className="mt-2 truncate text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              {packageTitle}
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/58">
              {booking.event.name}
            </p>
          </div>
        </div>

        <span className="status-chip w-fit shrink-0" data-tone={getStatusTone(booking.status)}>
          {booking.status.replaceAll('_', ' ')}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-white/26 px-4 py-3">
          <UserRound className="size-4 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Customer</p>

            <p className="truncate text-sm font-black text-[var(--color-near-black)]">
              {getCustomerName(booking)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/26 px-4 py-3">
          <MapPin className="size-4 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Location</p>

            <p className="truncate text-sm font-black text-[var(--color-near-black)]">
              {booking.event.location ?? 'Not specified'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/26 px-4 py-3">
          <Clock3 className="size-4 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Service time</p>

            <p className="truncate text-sm font-black text-[var(--color-near-black)]">
              {getServiceTimeLabel(booking)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/26 px-4 py-3">
          <CircleDollarSign className="size-4 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Agreed value</p>

            <p className="truncate text-sm font-black text-[var(--color-near-black)]">
              {formatCurrency(booking.agreedCost)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/45 bg-white/22 px-4 py-3">
        <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Service date</p>

        <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
          {formatDate(booking.serviceStart)}
        </p>
      </div>

      <div className="mt-6 flex flex-col justify-between gap-3 border-t border-white/45 pt-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Booking created</p>

          <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
            {formatDate(booking.createdAt)}
          </p>
        </div>

        <Link to={`/vendor/bookings/${booking.id}`} className="btn-secondary text-sm font-bold">
          View booking
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
