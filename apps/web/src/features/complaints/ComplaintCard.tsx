import {
  CalendarDays,
  CircleAlert,
  Clock3,
  CreditCard,
  FileWarning,
  MessageSquareText,
  PackageCheck,
  ReceiptText,
  ShieldAlert,
  Star,
  Store,
  UserRound,
} from 'lucide-react';

import type { Complaint, ComplaintPriority, ComplaintStatus, ComplaintType } from './complaint.api';

type ComplaintCardProps = {
  complaint: Complaint;
  onView: (complaint: Complaint) => void;
};

const complaintTypeLabels: Record<ComplaintType, string> = {
  BOOKING: 'Booking',
  PAYMENT: 'Payment',
  REVIEW: 'Review',
  QUOTATION: 'Quotation',
  USER_CONDUCT: 'User conduct',
  PLATFORM: 'Platform',
  OTHER: 'Other',
};

const complaintStatusLabels: Record<ComplaintStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under review',
  AWAITING_CUSTOMER_RESPONSE: 'Awaiting your response',
  AWAITING_VENDOR_RESPONSE: 'Awaiting vendor response',
  UNDER_INVESTIGATION: 'Under investigation',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
  CLOSED: 'Closed',
};

const complaintPriorityLabels: Record<ComplaintPriority, string> = {
  LOW: 'Low priority',
  MEDIUM: 'Medium priority',
  HIGH: 'High priority',
  URGENT: 'Urgent',
};

const getStatusTone = (status: ComplaintStatus) => {
  switch (status) {
    case 'RESOLVED':
      return 'green';

    case 'DISMISSED':
    case 'CLOSED':
      return 'gray';

    case 'AWAITING_CUSTOMER_RESPONSE':
    case 'AWAITING_VENDOR_RESPONSE':
      return 'rose';

    case 'UNDER_REVIEW':
    case 'UNDER_INVESTIGATION':
      return 'plum';

    case 'OPEN':
    default:
      return 'blue';
  }
};

const getPriorityTone = (priority: ComplaintPriority) => {
  switch (priority) {
    case 'URGENT':
    case 'HIGH':
      return 'rose';

    case 'MEDIUM':
      return 'plum';

    case 'LOW':
    default:
      return 'gray';
  }
};

const getTypeIcon = (type: ComplaintType) => {
  switch (type) {
    case 'BOOKING':
      return PackageCheck;

    case 'PAYMENT':
      return CreditCard;

    case 'REVIEW':
      return Star;

    case 'QUOTATION':
      return ReceiptText;

    case 'USER_CONDUCT':
      return UserRound;

    case 'PLATFORM':
      return ShieldAlert;

    case 'OTHER':
    default:
      return FileWarning;
  }
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const getParticipantName = (complaint: Complaint) => {
  if (!complaint.respondent) {
    return 'Platform support';
  }

  if (complaint.respondent.vendor) {
    return complaint.respondent.vendor.businessName;
  }

  return `${complaint.respondent.firstName} ${complaint.respondent.lastName}`;
};

const getRelatedContext = (complaint: Complaint) => {
  if (complaint.booking) {
    return {
      label: complaint.booking.event.name,
      detail: `${complaint.booking.vendor.businessName} booking`,
      icon: PackageCheck,
    };
  }

  if (complaint.payment) {
    return {
      label: complaint.payment.referenceNumber,
      detail: `Payment of LKR ${Number(complaint.payment.amount).toLocaleString('en-LK')}`,
      icon: CreditCard,
    };
  }

  if (complaint.review) {
    return {
      label: complaint.review.vendor.businessName,
      detail: `${complaint.review.overallRating}/5 vendor review`,
      icon: Star,
    };
  }

  if (complaint.quotationRequest) {
    return {
      label: complaint.quotationRequest.event.name,
      detail: `${complaint.quotationRequest.vendor.businessName} quotation`,
      icon: ReceiptText,
    };
  }

  if (complaint.respondent) {
    return {
      label: getParticipantName(complaint),
      detail: 'Account-related complaint',
      icon: UserRound,
    };
  }

  return {
    label: 'Eventure platform',
    detail: 'Platform support request',
    icon: ShieldAlert,
  };
};

export function ComplaintCard({ complaint, onView }: ComplaintCardProps) {
  const TypeIcon = getTypeIcon(complaint.type);
  const relatedContext = getRelatedContext(complaint);
  const RelatedIcon = relatedContext.icon;

  return (
    <article className="group/complaint-card relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.42),rgba(255,255,255,0.20))] p-5 shadow-[0_18px_50px_rgba(31,27,29,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/90 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(235,225,242,0.58))] hover:shadow-[0_30px_72px_rgba(31,27,29,0.12)] sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(183,167,200,0.16)] opacity-60 blur-3xl transition duration-500 group-hover/complaint-card:scale-125 group-hover/complaint-card:bg-[rgba(183,167,200,0.30)] group-hover/complaint-card:opacity-100"
      />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="status-chip transition duration-300 group-hover/complaint-card:-translate-y-0.5 group-hover/complaint-card:scale-[1.02] group-hover/complaint-card:shadow-[0_8px_20px_rgba(31,27,29,0.08)]"
              data-tone={getStatusTone(complaint.status)}
            >
              <CircleAlert aria-hidden="true" className="size-3.5" />
              {complaintStatusLabels[complaint.status]}
            </span>

            <span
              className="status-chip transition duration-300 group-hover/complaint-card:-translate-y-0.5 group-hover/complaint-card:shadow-[0_8px_20px_rgba(31,27,29,0.08)]"
              data-tone={getPriorityTone(complaint.priority)}
            >
              <ShieldAlert aria-hidden="true" className="size-3.5" />
              {complaintPriorityLabels[complaint.priority]}
            </span>

            <span
              className="status-chip transition duration-300 group-hover/complaint-card:-translate-y-0.5 group-hover/complaint-card:bg-white/54"
              data-tone="gray"
            >
              <TypeIcon aria-hidden="true" className="size-3.5" />
              {complaintTypeLabels[complaint.type]}
            </span>
          </div>

          <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] transition duration-300 group-hover/complaint-card:translate-x-0.5 group-hover/complaint-card:text-[var(--color-deep-plum)]">
            {complaint.subject}
          </h2>

          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66 transition duration-300 group-hover/complaint-card:text-[var(--color-charcoal)]/76">
            {complaint.description}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <section className="rounded-[1.35rem] border border-white/48 bg-white/30 p-4 transition duration-300 group-hover/complaint-card:border-white/74 group-hover/complaint-card:bg-white/44">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/44 transition duration-300 group-hover/complaint-card:text-[var(--color-rosewood)]/72">
                Related to
              </p>

              <div className="mt-3 flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/complaint-card:-translate-y-0.5 group-hover/complaint-card:scale-105">
                  <RelatedIcon aria-hidden="true" className="size-5" />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-[var(--color-near-black)] transition duration-300 group-hover/complaint-card:text-[var(--color-deep-plum)]">
                    {relatedContext.label}
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/54">
                    {relatedContext.detail}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.35rem] border border-white/48 bg-white/30 p-4 transition duration-300 group-hover/complaint-card:border-white/74 group-hover/complaint-card:bg-white/44">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/44 transition duration-300 group-hover/complaint-card:text-[var(--color-rosewood)]/72">
                Participant
              </p>

              <div className="mt-3 flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/complaint-card:-translate-y-0.5 group-hover/complaint-card:scale-105">
                  {complaint.respondent?.vendor ? (
                    <Store aria-hidden="true" className="size-5" />
                  ) : (
                    <UserRound aria-hidden="true" className="size-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-[var(--color-near-black)] transition duration-300 group-hover/complaint-card:text-[var(--color-deep-plum)]">
                    {getParticipantName(complaint)}
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/54">
                    {complaint.assignedAdmin
                      ? `Assigned to ${complaint.assignedAdmin.firstName} ${complaint.assignedAdmin.lastName}`
                      : 'Awaiting administrator assignment'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {complaint.resolutionSummary ? (
            <section className="mt-5 rounded-[1.35rem] border border-[rgba(89,133,113,0.18)] bg-[rgba(222,238,228,0.32)] p-4 transition duration-300 group-hover/complaint-card:bg-[rgba(222,238,228,0.44)]">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(89,133,113,0.14)] text-[#3f735d]">
                  <MessageSquareText aria-hidden="true" className="size-4" />
                </span>

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#3f735d]">
                    Resolution summary
                  </p>

                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                    {complaint.resolutionSummary}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/48 bg-white/28 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/54 transition duration-300 group-hover/complaint-card:border-white/72 group-hover/complaint-card:bg-white/42">
              <CalendarDays aria-hidden="true" className="size-4 text-[var(--color-rosewood)]" />
              Created {formatDateTime(complaint.createdAt)}
            </span>

            <span className="inline-flex items-center gap-2 rounded-xl border border-white/48 bg-white/28 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/54 transition duration-300 group-hover/complaint-card:border-white/72 group-hover/complaint-card:bg-white/42">
              <Clock3 aria-hidden="true" className="size-4 text-[var(--color-deep-plum)]" />
              Updated {formatDateTime(complaint.updatedAt)}
            </span>

            <span className="inline-flex items-center gap-2 rounded-xl border border-white/48 bg-white/28 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/54 transition duration-300 group-hover/complaint-card:border-white/72 group-hover/complaint-card:bg-white/42">
              <MessageSquareText
                aria-hidden="true"
                className="size-4 text-[var(--color-deep-plum)]"
              />
              Case #{complaint.id.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 border-t border-white/50 pt-5 xl:min-w-44 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <button
            type="button"
            className="group/view-complaint btn-secondary w-full justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.24)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.10)]"
            onClick={() => {
              onView(complaint);
            }}
          >
            <MessageSquareText
              aria-hidden="true"
              className="size-4 transition duration-300 group-hover/view-complaint:rotate-[3deg] group-hover/view-complaint:scale-105"
            />
            View complaint
          </button>
        </div>
      </div>
    </article>
  );
}
