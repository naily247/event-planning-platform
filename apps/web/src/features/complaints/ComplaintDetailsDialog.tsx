import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  FileWarning,
  LoaderCircle,
  MessageSquareText,
  PackageCheck,
  ReceiptText,
  Send,
  ShieldAlert,
  Star,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type {
  ComplaintAction,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintType,
  ComplaintDetail,
} from './complaint.api';

type ComplaintDetailsDialogProps = {
  complaint: ComplaintDetail;
  currentUserId: string;
  isReplyPending: boolean;
  isClosePending: boolean;
  replyErrorMessage?: string | null;
  closeErrorMessage?: string | null;
  onClose: () => void;
  onReply: (body: string) => void;
  onCloseComplaint: (reason?: string) => void;
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
  UNDER_INVESTIGATION: 'Under investigation',
  AWAITING_CUSTOMER_RESPONSE: 'Awaiting your response',
  AWAITING_VENDOR_RESPONSE: 'Awaiting vendor response',
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

const finalComplaintStatuses: ComplaintStatus[] = ['RESOLVED', 'DISMISSED', 'CLOSED'];

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

const formatCurrency = (value: string) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const getPartyName = (party: ComplaintDetail['complainant'] | null) => {
  if (!party) {
    return 'Platform support';
  }

  if (party.vendor) {
    return party.vendor.businessName;
  }

  return `${party.firstName} ${party.lastName}`;
};

const getActionLabel = (action: ComplaintAction['action']) => {
  switch (action) {
    case 'CREATED':
      return 'Complaint created';

    case 'STATUS_CHANGED':
      return 'Status updated';

    case 'RESOLVED':
      return 'Complaint resolved';

    case 'DISMISSED':
      return 'Complaint dismissed';

    case 'CLOSED':
      return 'Complaint closed';

    case 'REOPENED':
      return 'Complaint reopened';

    case 'ASSIGNED':
      return 'Administrator assigned';

    case 'UNASSIGNED':
      return 'Administrator unassigned';

    case 'PRIORITY_CHANGED':
      return 'Priority updated';
  }
};

const getActionIcon = (action: ComplaintAction['action']) => {
  switch (action) {
    case 'RESOLVED':
      return CheckCircle2;

    case 'CLOSED':
    case 'DISMISSED':
      return ShieldAlert;

    case 'REOPENED':
    case 'STATUS_CHANGED':
      return CircleAlert;

    case 'CREATED':
    default:
      return Clock3;
  }
};

export function ComplaintDetailsDialog({
  complaint,
  currentUserId,
  isReplyPending,
  isClosePending,
  replyErrorMessage,
  closeErrorMessage,
  onClose,
  onReply,
  onCloseComplaint,
}: ComplaintDetailsDialogProps) {
  const [replyBody, setReplyBody] = useState('');
  const [replyValidationError, setReplyValidationError] = useState<string | null>(null);

  const [isCloseFormOpen, setIsCloseFormOpen] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [closeValidationError, setCloseValidationError] = useState<string | null>(null);

  const TypeIcon = getTypeIcon(complaint.type);

  const isFinalStatus = finalComplaintStatuses.includes(complaint.status);

  const isComplainant = complaint.complainantId === currentUserId;

  const canReply = !isFinalStatus;

  const canClose = isComplainant && !isFinalStatus;

  const participantName = useMemo(() => {
    return getPartyName(complaint.respondent);
  }, [complaint.respondent]);

  const handleReplySubmit = () => {
    setReplyValidationError(null);

    const normalizedBody = replyBody.trim();

    if (!normalizedBody) {
      setReplyValidationError('Enter a message before sending.');
      return;
    }

    if (normalizedBody.length > 5000) {
      setReplyValidationError('Complaint message cannot exceed 5000 characters.');
      return;
    }

    onReply(normalizedBody);
  };

  const handleCloseSubmit = () => {
    setCloseValidationError(null);

    const normalizedReason = closeReason.trim();

    if (normalizedReason.length > 0 && normalizedReason.length < 5) {
      setCloseValidationError('Close reason must contain at least 5 characters.');
      return;
    }

    if (normalizedReason.length > 500) {
      setCloseValidationError('Close reason cannot exceed 500 characters.');
      return;
    }

    onCloseComplaint(normalizedReason || undefined);
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-details-title"
      onClick={() => {
        if (!isReplyPending && !isClosePending) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-6xl items-start justify-center">
        <div
          className="relative w-full overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(245,237,248,0.84))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[24%] top-[-7rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
          />

          <div className="relative">
            <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <MessageSquareText aria-hidden="true" className="size-4" />
                  Support case
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="status-chip" data-tone={getStatusTone(complaint.status)}>
                    <CircleAlert aria-hidden="true" className="size-3.5" />
                    {complaintStatusLabels[complaint.status]}
                  </span>

                  <span className="status-chip" data-tone={getPriorityTone(complaint.priority)}>
                    <ShieldAlert aria-hidden="true" className="size-3.5" />
                    {complaintPriorityLabels[complaint.priority]}
                  </span>

                  <span className="status-chip" data-tone="gray">
                    <TypeIcon aria-hidden="true" className="size-3.5" />
                    {complaintTypeLabels[complaint.type]}
                  </span>
                </div>

                <h2
                  id="complaint-details-title"
                  className="mt-5 max-w-4xl text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                >
                  {complaint.subject}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/52 bg-white/34 px-3 py-2 text-xs font-black text-[var(--color-charcoal)]/58">
                    <MessageSquareText
                      aria-hidden="true"
                      className="size-4 text-[var(--color-deep-plum)]"
                    />
                    Case #{complaint.id.slice(-8).toUpperCase()}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/52 bg-white/34 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/58">
                    <CalendarDays
                      aria-hidden="true"
                      className="size-4 text-[var(--color-rosewood)]"
                    />
                    Created {formatDateTime(complaint.createdAt)}
                  </span>
                </div>

                <p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/62 sm:text-base">
                  Review the complaint details, connected records, support conversation and complete
                  case timeline from one workspace.
                </p>
              </div>

              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close complaint details"
                disabled={isReplyPending || isClosePending}
                onClick={onClose}
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="group/complaint-overview relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(240,231,246,0.48))] p-6 shadow-[0_18px_48px_rgba(31,27,29,0.06)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/88 hover:shadow-[0_26px_66px_rgba(31,27,29,0.10)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl transition duration-500 group-hover/complaint-overview:scale-125 group-hover/complaint-overview:bg-[rgba(183,167,200,0.30)]"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 left-[16%] size-52 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/complaint-overview:-translate-y-0.5 group-hover/complaint-overview:scale-105">
                      <MessageSquareText aria-hidden="true" className="size-6" />
                    </div>

                    <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50 backdrop-blur-xl">
                      Case summary
                    </span>
                  </div>

                  <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Complaint overview
                  </p>

                  <h3 className="mt-3 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/complaint-overview:text-[var(--color-deep-plum)]">
                    Reported concern
                  </h3>

                  <div className="mt-5 rounded-[1.45rem] border border-white/52 bg-white/34 p-5 transition duration-300 group-hover/complaint-overview:border-white/74 group-hover/complaint-overview:bg-white/46">
                    <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                      {complaint.description}
                    </p>
                  </div>

                  {complaint.resolutionSummary ? (
                    <div className="mt-5 rounded-[1.45rem] border border-[rgba(89,133,113,0.18)] bg-[rgba(222,238,228,0.34)] p-5 transition duration-300 group-hover/complaint-overview:bg-[rgba(222,238,228,0.46)]">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(89,133,113,0.14)] text-[#3f735d]">
                          <CheckCircle2 aria-hidden="true" className="size-4" />
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#3f735d]">
                            Resolution
                          </p>

                          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                            {complaint.resolutionSummary}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/48 bg-white/30 p-4 transition duration-300 group-hover/complaint-overview:border-white/74 group-hover/complaint-overview:bg-white/44">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44 transition duration-300 group-hover/complaint-overview:text-[var(--color-rosewood)]/72">
                          Created
                        </p>

                        <span className="grid size-8 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)] transition duration-300 group-hover/complaint-overview:-translate-y-0.5 group-hover/complaint-overview:scale-105">
                          <CalendarDays aria-hidden="true" className="size-4" />
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-black leading-6 text-[var(--color-near-black)]">
                        {formatDateTime(complaint.createdAt)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/48 bg-white/30 p-4 transition duration-300 group-hover/complaint-overview:border-white/74 group-hover/complaint-overview:bg-white/44">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44 transition duration-300 group-hover/complaint-overview:text-[var(--color-rosewood)]/72">
                          Last updated
                        </p>

                        <span className="grid size-8 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[var(--color-deep-plum)] transition duration-300 group-hover/complaint-overview:-translate-y-0.5 group-hover/complaint-overview:scale-105">
                          <Clock3 aria-hidden="true" className="size-4" />
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-black leading-6 text-[var(--color-near-black)]">
                        {formatDateTime(complaint.updatedAt)}
                      </p>
                    </div>

                    {complaint.resolvedAt ? (
                      <div className="rounded-2xl border border-[rgba(89,133,113,0.16)] bg-[rgba(222,238,228,0.30)] p-4 transition duration-300 group-hover/complaint-overview:bg-[rgba(222,238,228,0.42)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#3f735d]">
                            Resolved
                          </p>

                          <span className="grid size-8 place-items-center rounded-xl bg-[rgba(89,133,113,0.14)] text-[#3f735d]">
                            <CheckCircle2 aria-hidden="true" className="size-4" />
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-black leading-6 text-[var(--color-near-black)]">
                          {formatDateTime(complaint.resolvedAt)}
                        </p>
                      </div>
                    ) : null}

                    {complaint.closedAt ? (
                      <div className="rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(245,225,230,0.28)] p-4 transition duration-300 group-hover/complaint-overview:bg-[rgba(245,225,230,0.40)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-muted-burgundy)]">
                            Closed
                          </p>

                          <span className="grid size-8 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                            <ShieldAlert aria-hidden="true" className="size-4" />
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-black leading-6 text-[var(--color-near-black)]">
                          {formatDateTime(complaint.closedAt)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <aside className="space-y-5">
                <section className="group/respondent-card relative overflow-hidden rounded-[1.7rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.70),rgba(240,231,246,0.44))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition duration-500 group-hover/respondent-card:scale-125 group-hover/respondent-card:bg-[rgba(183,167,200,0.28)]"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/respondent-card:-translate-y-0.5 group-hover/respondent-card:scale-105">
                        {complaint.respondent?.vendor ? (
                          <Store aria-hidden="true" className="size-5" />
                        ) : (
                          <UserRound aria-hidden="true" className="size-5" />
                        )}
                      </div>

                      <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50 backdrop-blur-xl">
                        Respondent
                      </span>
                    </div>

                    <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Involved party
                    </p>

                    <h3 className="mt-3 truncate text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/respondent-card:text-[var(--color-deep-plum)]">
                      {participantName}
                    </h3>

                    <div className="mt-4 rounded-2xl border border-white/50 bg-white/32 p-4 transition duration-300 group-hover/respondent-card:border-white/72 group-hover/respondent-card:bg-white/44">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                        Account role
                      </p>

                      <p className="mt-2 text-sm font-black text-[var(--color-near-black)]">
                        {complaint.respondent?.role ?? 'SYSTEM'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="group/admin-card relative overflow-hidden rounded-[1.7rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.70),rgba(220,235,242,0.42))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-16 -left-14 size-40 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/admin-card:scale-125"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/admin-card:-translate-y-0.5 group-hover/admin-card:scale-105">
                        <ShieldAlert aria-hidden="true" className="size-5" />
                      </div>

                      <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50 backdrop-blur-xl">
                        Support
                      </span>
                    </div>

                    <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Assigned administrator
                    </p>

                    {complaint.assignedAdmin ? (
                      <>
                        <h3 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/admin-card:text-[var(--color-deep-plum)]">
                          {complaint.assignedAdmin.firstName} {complaint.assignedAdmin.lastName}
                        </h3>

                        <div className="mt-4 rounded-2xl border border-white/50 bg-white/32 p-4 transition duration-300 group-hover/admin-card:border-white/72 group-hover/admin-card:bg-white/44">
                          <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                            Managing this support case and coordinating the resolution process.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-white/70 bg-white/24 p-4">
                        <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                          Awaiting administrator assignment.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {complaint.booking ? (
                  <section className="group/related-booking relative overflow-hidden rounded-[1.7rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.70),rgba(220,235,242,0.42))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)]">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/related-booking:scale-125"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/related-booking:-translate-y-0.5 group-hover/related-booking:scale-105">
                          <PackageCheck aria-hidden="true" className="size-5" />
                        </div>

                        <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50 backdrop-blur-xl">
                          Booking
                        </span>
                      </div>

                      <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Related booking
                      </p>

                      <h3 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/related-booking:text-[var(--color-deep-plum)]">
                        {complaint.booking.event.name}
                      </h3>

                      <div className="mt-5 space-y-3">
                        <div className="rounded-2xl border border-white/50 bg-white/32 p-4 transition duration-300 group-hover/related-booking:border-white/72 group-hover/related-booking:bg-white/44">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                            Vendor
                          </p>

                          <p className="mt-2 font-black text-[var(--color-near-black)]">
                            {complaint.booking.vendor.businessName}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/50 bg-white/32 p-4 transition duration-300 group-hover/related-booking:border-white/72 group-hover/related-booking:bg-white/44">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                              Service
                            </p>

                            <CalendarDays
                              aria-hidden="true"
                              className="size-4 text-[var(--color-deep-plum)]"
                            />
                          </div>

                          <p className="mt-2 font-black leading-6 text-[var(--color-near-black)]">
                            {formatDateTime(complaint.booking.serviceStart)}
                          </p>

                          <p className="mt-2 text-sm font-black text-[var(--color-rosewood)]">
                            {formatCurrency(complaint.booking.agreedCost)}
                          </p>
                        </div>

                        <Link
                          to={`/events/${complaint.booking.event.id}/bookings`}
                          className="group/open-related-booking btn-secondary w-full justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                        >
                          <PackageCheck
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/open-related-booking:scale-105"
                          />
                          View booking workspace
                        </Link>
                      </div>
                    </div>
                  </section>
                ) : null}

                {complaint.payment ? (
                  <section className="group/related-payment relative overflow-hidden rounded-[1.7rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.70),rgba(220,235,242,0.42))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)]">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/related-payment:scale-125"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/related-payment:-translate-y-0.5 group-hover/related-payment:scale-105">
                          <CreditCard aria-hidden="true" className="size-5" />
                        </div>

                        <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50 backdrop-blur-xl">
                          Payment
                        </span>
                      </div>

                      <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Related payment
                      </p>

                      <h3 className="mt-3 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/related-payment:text-[var(--color-deep-plum)]">
                        {formatCurrency(complaint.payment.amount)}
                      </h3>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-2xl border border-white/50 bg-white/32 p-4 transition duration-300 group-hover/related-payment:border-white/72 group-hover/related-payment:bg-white/44">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                            Method
                          </p>

                          <p className="mt-2 font-black capitalize text-[var(--color-near-black)]">
                            {complaint.payment.method.replaceAll('_', ' ').toLowerCase()}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/50 bg-white/32 p-4 transition duration-300 group-hover/related-payment:border-white/72 group-hover/related-payment:bg-white/44">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                            Reference
                          </p>

                          <p className="mt-2 break-all font-black leading-6 text-[var(--color-near-black)]">
                            {complaint.payment.referenceNumber || 'Not available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

                {complaint.review ? (
                  <section className="group/related-review relative overflow-hidden rounded-[1.7rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.70),rgba(249,235,229,0.44))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)]">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(220,183,150,0.20)] blur-3xl transition duration-500 group-hover/related-review:scale-125"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/related-review:-translate-y-0.5 group-hover/related-review:scale-105">
                          <Star aria-hidden="true" className="size-5 fill-current" />
                        </div>

                        <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50 backdrop-blur-xl">
                          Review
                        </span>
                      </div>

                      <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Related review
                      </p>

                      <h3 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/related-review:text-[var(--color-rosewood)]">
                        {complaint.review.vendor.businessName}
                      </h3>

                      <div className="mt-5 rounded-[1.35rem] border border-white/50 bg-white/32 p-4 transition duration-300 group-hover/related-review:border-white/72 group-hover/related-review:bg-white/44">
                        <div className="flex flex-wrap items-center gap-1">
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              key={index}
                              aria-hidden="true"
                              className={`size-4 ${
                                index < complaint.review!.overallRating
                                  ? 'fill-[var(--color-rosewood)] text-[var(--color-rosewood)]'
                                  : 'text-[var(--color-charcoal)]/20'
                              }`}
                            />
                          ))}

                          <span className="ml-2 text-sm font-black text-[var(--color-near-black)]">
                            {complaint.review.overallRating}/5
                          </span>
                        </div>

                        {complaint.review.comment ? (
                          <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
                            {complaint.review.comment}
                          </p>
                        ) : (
                          <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/50">
                            No written review comment.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                ) : null}

                {complaint.quotationRequest ? (
                  <section className="group/related-quotation relative overflow-hidden rounded-[1.7rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.70),rgba(240,231,246,0.44))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)]">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl transition duration-500 group-hover/related-quotation:scale-125"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/related-quotation:-translate-y-0.5 group-hover/related-quotation:scale-105">
                          <ReceiptText aria-hidden="true" className="size-5" />
                        </div>

                        <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50 backdrop-blur-xl">
                          Quotation
                        </span>
                      </div>

                      <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Related quotation
                      </p>

                      <h3 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/related-quotation:text-[var(--color-deep-plum)]">
                        {complaint.quotationRequest.vendor.businessName}
                      </h3>

                      <div className="mt-5 rounded-[1.35rem] border border-white/50 bg-white/32 p-4 transition duration-300 group-hover/related-quotation:border-white/72 group-hover/related-quotation:bg-white/44">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                          Event
                        </p>

                        <p className="mt-2 font-black text-[var(--color-near-black)]">
                          {complaint.quotationRequest.event.name}
                        </p>

                        <p className="mt-3 line-clamp-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                          {complaint.quotationRequest.requirements}
                        </p>
                      </div>

                      <Link
                        to={`/events/${complaint.quotationRequest.event.id}/quotations`}
                        className="group/open-related-quotation btn-secondary mt-4 w-full justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                      >
                        <ReceiptText
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/open-related-quotation:scale-105"
                        />
                        View quotation workspace
                      </Link>
                    </div>
                  </section>
                ) : null}
              </aside>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <section className="group/conversation relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(240,231,246,0.46))] p-5 shadow-[0_18px_48px_rgba(31,27,29,0.06)] backdrop-blur-2xl transition-all duration-300 hover:border-white/88 hover:shadow-[0_26px_66px_rgba(31,27,29,0.10)] sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition duration-500 group-hover/conversation:scale-125 group-hover/conversation:bg-[rgba(183,167,200,0.28)]"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 left-[12%] size-52 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/conversation:-translate-y-0.5 group-hover/conversation:scale-105">
                          <MessageSquareText aria-hidden="true" className="size-6" />
                        </div>

                        <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50 backdrop-blur-xl">
                          {complaint.messages.length}{' '}
                          {complaint.messages.length === 1 ? 'message' : 'messages'}
                        </span>
                      </div>

                      <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Conversation
                      </p>

                      <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] transition duration-300 group-hover/conversation:text-[var(--color-deep-plum)]">
                        Public complaint messages
                      </h3>

                      <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/58">
                        Follow messages shared between participants and support while this case is
                        being reviewed.
                      </p>
                    </div>

                    <span className="status-chip w-fit" data-tone={canReply ? 'plum' : 'gray'}>
                      {canReply ? (
                        <Send aria-hidden="true" className="size-3.5" />
                      ) : (
                        <ShieldAlert aria-hidden="true" className="size-3.5" />
                      )}

                      {canReply ? 'Replies open' : 'Conversation closed'}
                    </span>
                  </div>

                  {complaint.messages.length > 0 ? (
                    <div className="mt-7 max-h-[32rem] space-y-4 overflow-y-auto rounded-[1.5rem] border border-white/50 bg-white/22 p-4 pr-2 sm:p-5 sm:pr-3">
                      {complaint.messages.map((message) => {
                        const isCurrentUser = message.authorId === currentUserId;
                        const authorName = getPartyName(message.author);

                        return (
                          <article
                            key={message.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`relative max-w-[92%] overflow-hidden rounded-[1.45rem] px-4 py-4 shadow-[0_12px_30px_rgba(31,27,29,0.06)] sm:max-w-[78%] ${
                                isCurrentUser
                                  ? 'bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-white'
                                  : 'border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.74),rgba(232,225,240,0.44))] text-[var(--color-charcoal)]'
                              }`}
                            >
                              <div
                                aria-hidden="true"
                                className={`pointer-events-none absolute -right-8 -top-10 size-24 rounded-full blur-2xl ${
                                  isCurrentUser ? 'bg-white/10' : 'bg-[rgba(183,167,200,0.16)]'
                                }`}
                              />

                              <div className="relative">
                                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                                  <p
                                    className={`text-xs font-black uppercase tracking-[0.14em] ${
                                      isCurrentUser
                                        ? 'text-white/66'
                                        : 'text-[var(--color-deep-plum)]'
                                    }`}
                                  >
                                    {isCurrentUser ? 'You' : authorName}
                                  </p>

                                  <p
                                    className={`text-[0.7rem] font-bold ${
                                      isCurrentUser
                                        ? 'text-white/54'
                                        : 'text-[var(--color-charcoal)]/42'
                                    }`}
                                  >
                                    {formatDateTime(message.createdAt)}
                                  </p>
                                </div>

                                <p
                                  className={`mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 ${
                                    isCurrentUser
                                      ? 'text-white/84'
                                      : 'text-[var(--color-charcoal)]/70'
                                  }`}
                                >
                                  {message.body}
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-7 rounded-[1.5rem] border border-dashed border-white/72 bg-white/24 p-8 text-center">
                      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(31,27,29,0.05)]">
                        <MessageSquareText aria-hidden="true" className="size-7" />
                      </div>

                      <p className="mt-5 text-lg font-black text-[var(--color-near-black)]">
                        No conversation yet
                      </p>

                      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        Public messages between participants will appear here.
                      </p>
                    </div>
                  )}

                  {canReply ? (
                    <div className="mt-7 rounded-[1.5rem] border border-white/52 bg-white/30 p-5">
                      <label className="block">
                        <span className="flex items-center justify-between gap-4">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Add a message
                          </span>

                          <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                            {replyBody.length.toLocaleString('en-LK')} / 5,000
                          </span>
                        </span>

                        <textarea
                          className="form-field mt-2 min-h-32 resize-y transition duration-300 focus:bg-white/52"
                          maxLength={5000}
                          value={replyBody}
                          disabled={isReplyPending || isClosePending}
                          placeholder="Share additional information or respond to this support case."
                          onChange={(event) => {
                            setReplyValidationError(null);
                            setReplyBody(event.target.value);
                          }}
                        />

                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Keep your message clear and include any details that may help resolve the
                          case.
                        </p>
                      </label>

                      {replyValidationError || replyErrorMessage ? (
                        <div
                          role="alert"
                          className="mt-4 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                              <CircleAlert aria-hidden="true" className="size-4" />
                            </span>

                            <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                              {replyValidationError ?? replyErrorMessage}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          className="group/send-complaint-message btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                          disabled={isReplyPending || isClosePending}
                          onClick={handleReplySubmit}
                        >
                          {isReplyPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Send
                              aria-hidden="true"
                              className="size-4 transition duration-300 group-hover/send-complaint-message:translate-x-0.5"
                            />
                          )}

                          {isReplyPending ? 'Sending message...' : 'Send message'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-7 rounded-[1.4rem] border border-white/55 bg-white/28 p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                          <ShieldAlert aria-hidden="true" className="size-4" />
                        </span>

                        <p className="text-sm font-bold leading-6 text-[var(--color-charcoal)]/60">
                          This complaint is complete, so no new messages can be added.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-5">
                <section className="group/case-timeline relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(220,235,242,0.44))] p-5 shadow-[0_18px_48px_rgba(31,27,29,0.06)] backdrop-blur-2xl transition-all duration-300 hover:border-white/88 hover:shadow-[0_26px_66px_rgba(31,27,29,0.10)] sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl transition duration-500 group-hover/case-timeline:scale-125"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/case-timeline:-translate-y-0.5 group-hover/case-timeline:scale-105">
                        <Clock3 aria-hidden="true" className="size-6" />
                      </div>

                      <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/50 backdrop-blur-xl">
                        {complaint.actions.length}{' '}
                        {complaint.actions.length === 1 ? 'update' : 'updates'}
                      </span>
                    </div>

                    <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Case timeline
                    </p>

                    <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] transition duration-300 group-hover/case-timeline:text-[var(--color-deep-plum)]">
                      Support activity
                    </h3>

                    <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/58">
                      Follow status changes, assignments and resolution activity recorded for this
                      case.
                    </p>

                    {complaint.actions.length > 0 ? (
                      <div className="mt-7 space-y-5">
                        {complaint.actions.map((action, index) => {
                          const ActionIcon = getActionIcon(action.action);
                          const performerName = getPartyName(action.performedBy);

                          return (
                            <article
                              key={action.id}
                              className="group/timeline-item relative flex gap-4"
                            >
                              {index < complaint.actions.length - 1 ? (
                                <div
                                  aria-hidden="true"
                                  className="absolute left-[1.2rem] top-11 h-[calc(100%+0.25rem)] w-px bg-[linear-gradient(180deg,rgba(93,58,85,0.24),rgba(175,201,216,0.18))]"
                                />
                              ) : null}

                              <div className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.78),rgba(220,235,242,0.60))] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.06)] transition duration-300 group-hover/timeline-item:-translate-y-0.5 group-hover/timeline-item:scale-105">
                                <ActionIcon aria-hidden="true" className="size-4" />
                              </div>

                              <div className="min-w-0 flex-1 rounded-[1.35rem] border border-white/48 bg-white/30 p-4 transition duration-300 group-hover/timeline-item:border-white/72 group-hover/timeline-item:bg-white/44">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <p className="font-black text-[var(--color-near-black)] transition duration-300 group-hover/timeline-item:text-[var(--color-deep-plum)]">
                                    {getActionLabel(action.action)}
                                  </p>

                                  <span className="shrink-0 text-xs font-bold text-[var(--color-charcoal)]/46">
                                    {formatDateTime(action.createdAt)}
                                  </span>
                                </div>

                                {action.reason ? (
                                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
                                    {action.reason}
                                  </p>
                                ) : null}

                                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--color-charcoal)]/46">
                                  <UserRound
                                    aria-hidden="true"
                                    className="size-3.5 text-[var(--color-rosewood)]"
                                  />
                                  By {performerName}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-7 rounded-[1.45rem] border border-dashed border-white/72 bg-white/24 p-6 text-center">
                        <Clock3 className="mx-auto size-7 text-[var(--color-deep-plum)]" />

                        <p className="mt-4 text-sm font-black text-[var(--color-near-black)]">
                          No timeline activity yet
                        </p>

                        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                          Status and administrative updates will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {canClose ? (
                  <section className="group/close-complaint relative overflow-hidden rounded-[1.75rem] border border-[rgba(124,74,90,0.22)] bg-[linear-gradient(145deg,rgba(249,238,242,0.72),rgba(255,255,255,0.42))] p-5 shadow-[0_18px_48px_rgba(31,27,29,0.06)] backdrop-blur-2xl transition-all duration-300 hover:border-[rgba(124,74,90,0.32)] hover:shadow-[0_26px_66px_rgba(124,74,90,0.12)] sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(210,146,160,0.20)] blur-3xl transition duration-500 group-hover/close-complaint:scale-125"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/close-complaint:-translate-y-0.5 group-hover/close-complaint:scale-105">
                          <ShieldAlert aria-hidden="true" className="size-6" />
                        </div>

                        <span className="rounded-full border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                          Case action
                        </span>
                      </div>

                      <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
                        Close complaint
                      </p>

                      <h3 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/close-complaint:text-[var(--color-muted-burgundy)]">
                        No longer need support?
                      </h3>

                      <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/62">
                        Close the case when the concern has been addressed or administrator
                        assistance is no longer required.
                      </p>

                      {!isCloseFormOpen ? (
                        <button
                          type="button"
                          className="group/open-close-form mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(124,74,90,0.26)] bg-[rgba(124,74,90,0.10)] px-5 py-3 text-sm font-black text-[var(--color-muted-burgundy)] shadow-[0_10px_24px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.36)] hover:bg-[rgba(124,74,90,0.16)] hover:shadow-[0_16px_34px_rgba(124,74,90,0.14)]"
                          disabled={isReplyPending || isClosePending}
                          onClick={() => {
                            setCloseValidationError(null);
                            setIsCloseFormOpen(true);
                          }}
                        >
                          <ShieldAlert
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/open-close-form:scale-105"
                          />
                          Close complaint
                        </button>
                      ) : (
                        <div className="mt-6 rounded-[1.45rem] border border-white/52 bg-white/34 p-5">
                          <label className="block">
                            <span className="flex items-center justify-between gap-4">
                              <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                                Reason for closing
                              </span>

                              <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                                {closeReason.length.toLocaleString('en-LK')} / 500
                              </span>
                            </span>

                            <textarea
                              className="form-field mt-2 min-h-28 resize-y transition duration-300 focus:bg-white/52"
                              maxLength={500}
                              value={closeReason}
                              disabled={isClosePending}
                              placeholder="Optional reason for closing this complaint."
                              onChange={(event) => {
                                setCloseValidationError(null);
                                setCloseReason(event.target.value);
                              }}
                            />

                            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                              Optional. Minimum 5 characters when a reason is provided.
                            </p>
                          </label>

                          {closeValidationError || closeErrorMessage ? (
                            <div
                              role="alert"
                              className="mt-4 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                            >
                              <div className="flex items-start gap-3">
                                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                                  <CircleAlert aria-hidden="true" className="size-4" />
                                </span>

                                <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                                  {closeValidationError ?? closeErrorMessage}
                                </p>
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-5 flex flex-col-reverse gap-3">
                            <button
                              type="button"
                              className="btn-secondary justify-center text-sm font-bold"
                              disabled={isClosePending}
                              onClick={() => {
                                setCloseValidationError(null);
                                setCloseReason('');
                                setIsCloseFormOpen(false);
                              }}
                            >
                              Keep complaint open
                            </button>

                            <button
                              type="button"
                              className="group/confirm-close flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={isClosePending}
                              onClick={handleCloseSubmit}
                            >
                              {isClosePending ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <ShieldAlert
                                  aria-hidden="true"
                                  className="size-4 transition duration-300 group-hover/confirm-close:scale-105"
                                />
                              )}

                              {isClosePending ? 'Closing complaint...' : 'Confirm close'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                ) : null}
              </aside>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-[var(--color-charcoal)]/44">
                Last updated {formatDateTime(complaint.updatedAt)}
              </p>

              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={isReplyPending || isClosePending}
                onClick={onClose}
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
