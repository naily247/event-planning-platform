import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  Clock3,
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
    return 'Deadline passed';
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
    <article className="group rounded-[1.35rem] border border-white/60 bg-white/30 px-4 py-3.5 shadow-[0_10px_30px_rgba(31,27,29,0.055)] backdrop-blur-2xl transition duration-300 hover:border-white/80 hover:bg-white/42 hover:shadow-[0_14px_36px_rgba(31,27,29,0.08)] sm:px-4.5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
              <FileText className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  {quotationRequest.package?.category?.name ?? 'Service request'}
                </p>

                <span className="hidden size-1 rounded-full bg-[var(--color-charcoal)]/20 sm:block" />

                <p className="truncate text-[0.68rem] font-bold text-[var(--color-charcoal)]/48">
                  {quotationRequest.event.name}
                </p>
              </div>

              <h3 className="mt-1 truncate text-[1.05rem] font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                {quotationRequest.package?.title ?? 'Custom event service'}
              </h3>
            </div>
          </div>

          <p className="mt-2.5 line-clamp-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/60">
            {quotationRequest.requirements}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/45 pt-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <UserRound className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />

              <span className="text-[0.68rem] font-semibold text-[var(--color-charcoal)]/48">
                Customer
              </span>

              <span className="max-w-[10rem] truncate text-[0.7rem] font-black text-[var(--color-near-black)]">
                {getCustomerName(quotationRequest)}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />

              <span className="max-w-[9rem] truncate text-[0.7rem] font-black text-[var(--color-near-black)]">
                {quotationRequest.event.location ?? 'Not specified'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5 shrink-0 text-[var(--color-deep-plum)]" />

              <span className="text-[0.7rem] font-black text-[var(--color-near-black)]">
                {formatDate(quotationRequest.event.eventDate)}
              </span>
            </div>

            <div
              className={
                deadlinePassed
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-[rgba(124,74,90,0.10)] px-2.5 py-1 text-[0.65rem] font-black text-[var(--color-muted-burgundy)]'
                  : 'inline-flex items-center gap-1.5 rounded-full bg-white/42 px-2.5 py-1 text-[0.65rem] font-black text-[var(--color-charcoal)]/64'
              }
            >
              {deadlinePassed ? (
                <CircleAlert className="size-3" />
              ) : (
                <Clock3 className="size-3" />
              )}

              {getDeadlineLabel(quotationRequest.responseDueAt)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/45 pt-3 lg:h-full lg:min-w-[8.5rem] lg:flex-col lg:items-end lg:justify-between lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <span
            className="status-chip w-fit shrink-0"
            data-tone={getStatusTone(quotationRequest.status)}
          >
            {quotationRequest.status.replaceAll('_', ' ')}
          </span>

          <div className="flex items-center gap-3 lg:flex-col lg:items-end lg:gap-2">
            <div className="text-right">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                Received
              </p>

              <p className="mt-0.5 whitespace-nowrap text-[0.68rem] font-black text-[var(--color-near-black)]">
                {formatDate(quotationRequest.createdAt)}
              </p>
            </div>

            <Link
              to={`/vendor/quotation-requests/${quotationRequest.id}`}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[rgba(93,58,85,0.14)] bg-white/56 px-3 text-[0.68rem] font-black text-[var(--color-deep-plum)] shadow-[0_7px_20px_rgba(31,27,29,0.06)] transition hover:-translate-y-0.5 hover:bg-white/82"
            >
              View request
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}