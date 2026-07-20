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

import type {
  ComplaintPriority,
  ComplaintStatus,
  ComplaintType,
  Complaint,
} from './complaint.api';

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
    <article className="rounded-[1.7rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl sm:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-chip" data-tone={getStatusTone(complaint.status)}>
              <CircleAlert className="size-3.5" />
              {complaintStatusLabels[complaint.status]}
            </span>

            <span className="status-chip" data-tone={getPriorityTone(complaint.priority)}>
              <ShieldAlert className="size-3.5" />
              {complaintPriorityLabels[complaint.priority]}
            </span>

            <span className="status-chip" data-tone="gray">
              <TypeIcon className="size-3.5" />
              {complaintTypeLabels[complaint.type]}
            </span>
          </div>

          <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
            {complaint.subject}
          </h2>

          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66">
            {complaint.description}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/28 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
                Related to
              </p>

              <div className="mt-3 flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <RelatedIcon className="size-5" />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-[var(--color-near-black)]">
                    {relatedContext.label}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/52">
                    {relatedContext.detail}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/28 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
                Participant
              </p>

              <div className="mt-3 flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.22)] text-[var(--color-deep-plum)]">
                  {complaint.respondent?.vendor ? (
                    <Store className="size-5" />
                  ) : (
                    <UserRound className="size-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-[var(--color-near-black)]">
                    {getParticipantName(complaint)}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/52">
                    {complaint.assignedAdmin
                      ? `Assigned to ${complaint.assignedAdmin.firstName} ${complaint.assignedAdmin.lastName}`
                      : 'Awaiting administrator assignment'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {complaint.resolutionSummary ? (
            <div className="mt-5 rounded-2xl border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                Resolution summary
              </p>

              <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                {complaint.resolutionSummary}
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-[var(--color-charcoal)]/46">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4" />
              Created {formatDateTime(complaint.createdAt)}
            </span>

            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4" />
              Updated {formatDateTime(complaint.updatedAt)}
            </span>

            <span className="inline-flex items-center gap-2">
              <MessageSquareText className="size-4" />
              Case #{complaint.id.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary shrink-0 justify-center text-sm font-bold"
          onClick={() => {
            onView(complaint);
          }}
        >
          <MessageSquareText className="size-4" />
          View complaint
        </button>
      </div>
    </article>
  );
}
