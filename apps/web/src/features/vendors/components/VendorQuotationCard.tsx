import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  Eye,
  FileText,
  MapPin,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { VendorQuotationRequest } from '../../quotationRequests/quotationRequest.api';

type VendorQuotationCardProps = {
  quotationRequest: VendorQuotationRequest;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

const getDeadlineLabel = (value: string | null) => {
  if (!value) {
    return 'No response deadline';
  }

  const deadline = new Date(value);
  const now = new Date();
  const difference = deadline.getTime() - now.getTime();
  const days = Math.ceil(difference / (1000 * 60 * 60 * 24));

  if (difference <= 0) {
    return 'Response deadline passed';
  }

  if (days === 1) {
    return 'Respond within 1 day';
  }

  return `Respond within ${days} days`;
};

const getStatusTone = (status: VendorQuotationRequest['status']) => {
  switch (status) {
    case 'ACCEPTED':
      return 'success';

    case 'VIEWED':
    case 'QUOTED':
      return 'plum';

    case 'CLARIFICATION_REQUESTED':
      return 'warning';

    case 'DECLINED':
    case 'CLOSED':
      return 'danger';

    case 'SENT':
    default:
      return 'neutral';
  }
};

const getCustomerName = (quotationRequest: VendorQuotationRequest) => {
  const firstName = quotationRequest.event.owner.firstName.trim();
  const lastName = quotationRequest.event.owner.lastName.trim();

  return [firstName, lastName].filter(Boolean).join(' ');
};

export function VendorQuotationCard({ quotationRequest }: VendorQuotationCardProps) {
  const deadlinePassed =
    quotationRequest.responseDueAt !== null &&
    new Date(quotationRequest.responseDueAt).getTime() <= Date.now();

  return (
    <article className="rounded-[1.75rem] border border-white/55 bg-white/24 p-5 shadow-[0_16px_45px_rgba(31,27,29,0.08)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-white/32">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
            <FileText className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
              {quotationRequest.package?.category?.name ?? 'Service request'}
            </p>

            <h3 className="mt-2 truncate text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              {quotationRequest.package?.title ?? 'Custom event service'}
            </h3>

            <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/58">
              {quotationRequest.event.name}
            </p>
          </div>
        </div>

        <span
          className="status-chip w-fit shrink-0"
          data-tone={getStatusTone(quotationRequest.status)}
        >
          {quotationRequest.status.replaceAll('_', ' ')}
        </span>
      </div>

      <p className="mt-5 line-clamp-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
        {quotationRequest.requirements}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-white/26 px-4 py-3">
          <UserRound className="size-4 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Customer</p>

            <p className="truncate text-sm font-black text-[var(--color-near-black)]">
              {getCustomerName(quotationRequest)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/26 px-4 py-3">
          <MapPin className="size-4 shrink-0 text-[var(--color-deep-plum)]" />

          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Location</p>

            <p className="truncate text-sm font-black text-[var(--color-near-black)]">
              {quotationRequest.event.location ?? 'Not specified'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="soft-chip text-xs font-bold">
          <CalendarClock className="size-4" />
          Event on {formatDate(quotationRequest.event.eventDate)}
        </span>

        <span
          className={
            deadlinePassed
              ? 'inline-flex items-center gap-2 rounded-full bg-[rgba(124,74,90,0.12)] px-3 py-2 text-xs font-black text-[var(--color-muted-burgundy)]'
              : 'soft-chip text-xs font-bold'
          }
        >
          {deadlinePassed ? <CircleAlert className="size-4" /> : <Eye className="size-4" />}

          {getDeadlineLabel(quotationRequest.responseDueAt)}
        </span>
      </div>

      <div className="mt-6 flex flex-col justify-between gap-3 border-t border-white/45 pt-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Received</p>

          <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
            {formatDate(quotationRequest.createdAt)}
          </p>
        </div>

        <Link
          to={`/vendor/quotation-requests/${quotationRequest.id}`}
          className="btn-secondary text-sm font-bold"
        >
          View request
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
