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
      className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-details-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <MessageSquareText className="size-4" />
                Support case
              </div>

              <h2
                id="complaint-details-title"
                className="max-w-3xl text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
              >
                {complaint.subject}
              </h2>

              <p className="mt-3 text-sm font-bold text-[var(--color-charcoal)]/48">
                Case #{complaint.id.slice(-8).toUpperCase()}
              </p>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
              aria-label="Close complaint details"
              disabled={isReplyPending || isClosePending}
              onClick={onClose}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2">
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

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[1.7rem] border border-white/45 bg-white/18 p-6">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                Complaint overview
              </h3>

              <p className="mt-5 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                {complaint.description}
              </p>

              {complaint.resolutionSummary ? (
                <div className="mt-6 rounded-2xl border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                    Resolution
                  </p>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                    {complaint.resolutionSummary}
                  </p>
                </div>
              ) : null}

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/26 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                    Created
                  </p>

                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-near-black)]">
                    <CalendarDays className="size-4" />
                    {formatDateTime(complaint.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/26 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                    Last updated
                  </p>

                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-near-black)]">
                    <Clock3 className="size-4" />
                    {formatDateTime(complaint.updatedAt)}
                  </p>
                </div>

                {complaint.resolvedAt ? (
                  <div className="rounded-2xl bg-white/26 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                      Resolved
                    </p>

                    <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-near-black)]">
                      <CheckCircle2 className="size-4" />
                      {formatDateTime(complaint.resolvedAt)}
                    </p>
                  </div>
                ) : null}

                {complaint.closedAt ? (
                  <div className="rounded-2xl bg-white/26 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                      Closed
                    </p>

                    <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-near-black)]">
                      <ShieldAlert className="size-4" />
                      {formatDateTime(complaint.closedAt)}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-[1.7rem] border border-white/45 bg-white/18 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/44">
                  Respondent
                </p>

                <div className="mt-4 flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                    {complaint.respondent?.vendor ? (
                      <Store className="size-5" />
                    ) : (
                      <UserRound className="size-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-black text-[var(--color-near-black)]">
                      {participantName}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/52">
                      {complaint.respondent?.role ?? 'SYSTEM'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.7rem] border border-white/45 bg-white/18 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/44">
                  Assigned administrator
                </p>

                {complaint.assignedAdmin ? (
                  <div className="mt-4">
                    <p className="font-black text-[var(--color-near-black)]">
                      {complaint.assignedAdmin.firstName} {complaint.assignedAdmin.lastName}
                    </p>

                    <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/52">
                      Managing this support case
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-semibold text-[var(--color-charcoal)]/58">
                    Awaiting administrator assignment.
                  </p>
                )}
              </section>

              {complaint.booking ? (
                <section className="rounded-[1.7rem] border border-white/45 bg-white/18 p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.22)] text-[var(--color-deep-plum)]">
                      <PackageCheck className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/44">
                        Related booking
                      </p>

                      <p className="mt-1 font-black text-[var(--color-near-black)]">
                        {complaint.booking.event.name}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl bg-white/26 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                        Vendor
                      </p>

                      <p className="mt-2 font-black text-[var(--color-near-black)]">
                        {complaint.booking.vendor.businessName}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/26 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                        Service
                      </p>

                      <p className="mt-2 font-black text-[var(--color-near-black)]">
                        {formatDateTime(complaint.booking.serviceStart)}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/52">
                        {formatCurrency(complaint.booking.agreedCost)}
                      </p>
                    </div>

                    <Link
                      to={`/events/${complaint.booking.event.id}/bookings`}
                      className="btn-secondary w-full justify-center text-sm font-bold"
                    >
                      View booking workspace
                    </Link>
                  </div>
                </section>
              ) : null}

              {complaint.payment ? (
                <section className="rounded-[1.7rem] border border-white/45 bg-white/18 p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.22)] text-[var(--color-deep-plum)]">
                      <CreditCard className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/44">
                        Related payment
                      </p>

                      <p className="mt-1 font-black text-[var(--color-near-black)]">
                        {formatCurrency(complaint.payment.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl bg-white/26 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                        Method
                      </p>

                      <p className="mt-2 font-black text-[var(--color-near-black)]">
                        {complaint.payment.method.replaceAll('_', ' ')}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/26 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                        Reference
                      </p>

                      <p className="mt-2 break-all font-black text-[var(--color-near-black)]">
                        {complaint.payment.referenceNumber || 'Not available'}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {complaint.review ? (
                <section className="rounded-[1.7rem] border border-white/45 bg-white/18 p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                      <Star className="size-5 fill-current" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/44">
                        Related review
                      </p>

                      <p className="mt-1 font-black text-[var(--color-near-black)]">
                        {complaint.review.vendor.businessName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white/26 p-4">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
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
                      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                        {complaint.review.comment}
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {complaint.quotationRequest ? (
                <section className="rounded-[1.7rem] border border-white/45 bg-white/18 p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.22)] text-[var(--color-deep-plum)]">
                      <ReceiptText className="size-5" />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/44">
                        Related quotation
                      </p>

                      <p className="mt-1 font-black text-[var(--color-near-black)]">
                        {complaint.quotationRequest.vendor.businessName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white/26 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                      Event
                    </p>

                    <p className="mt-2 font-black text-[var(--color-near-black)]">
                      {complaint.quotationRequest.event.name}
                    </p>

                    <p className="mt-2 line-clamp-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      {complaint.quotationRequest.requirements}
                    </p>
                  </div>

                  <Link
                    to={`/events/${complaint.quotationRequest.event.id}/quotations`}
                    className="btn-secondary mt-4 w-full justify-center text-sm font-bold"
                  >
                    View quotation workspace
                  </Link>
                </section>
              ) : null}
            </aside>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-[1.7rem] border border-white/45 bg-white/18 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                    Conversation
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Public complaint messages
                  </h3>
                </div>

                <span className="status-chip w-fit" data-tone="gray">
                  <MessageSquareText className="size-3.5" />
                  {complaint.messages.length}{' '}
                  {complaint.messages.length === 1 ? 'message' : 'messages'}
                </span>
              </div>

              {complaint.messages.length > 0 ? (
                <div className="mt-6 max-h-[32rem] space-y-4 overflow-y-auto pr-1">
                  {complaint.messages.map((message) => {
                    const isCurrentUser = message.authorId === currentUserId;
                    const authorName = getPartyName(message.author);

                    return (
                      <article
                        key={message.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-[1.4rem] px-4 py-3 sm:max-w-[76%] ${
                            isCurrentUser
                              ? 'bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-white'
                              : 'border border-white/55 bg-white/30 text-[var(--color-charcoal)]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                            <p
                              className={`text-xs font-black uppercase tracking-[0.14em] ${
                                isCurrentUser ? 'text-white/66' : 'text-[var(--color-deep-plum)]'
                              }`}
                            >
                              {isCurrentUser ? 'You' : authorName}
                            </p>

                            <p
                              className={`text-[0.7rem] font-bold ${
                                isCurrentUser ? 'text-white/54' : 'text-[var(--color-charcoal)]/42'
                              }`}
                            >
                              {formatDateTime(message.createdAt)}
                            </p>
                          </div>

                          <p
                            className={`mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 ${
                              isCurrentUser ? 'text-white/82' : 'text-[var(--color-charcoal)]/68'
                            }`}
                          >
                            {message.body}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/70 bg-white/18 p-7 text-center">
                  <MessageSquareText className="mx-auto size-8 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-lg font-black text-[var(--color-near-black)]">
                    No conversation yet
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                    Public messages between participants will appear here.
                  </p>
                </div>
              )}

              {canReply ? (
                <div className="mt-6 border-t border-white/55 pt-6">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Add a message
                    </span>

                    <textarea
                      className="form-field min-h-32 resize-y"
                      maxLength={5000}
                      value={replyBody}
                      disabled={isReplyPending || isClosePending}
                      placeholder="Share additional information or respond to this support case."
                      onChange={(event) => {
                        setReplyValidationError(null);
                        setReplyBody(event.target.value);
                      }}
                    />

                    <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/46">
                      {replyBody.length}/5000
                    </p>
                  </label>

                  {replyValidationError || replyErrorMessage ? (
                    <div
                      role="alert"
                      className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                    >
                      {replyValidationError ?? replyErrorMessage}
                    </div>
                  ) : null}

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="btn-primary justify-center text-sm font-bold"
                      disabled={isReplyPending || isClosePending}
                      onClick={handleReplySubmit}
                    >
                      {isReplyPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}

                      {isReplyPending ? 'Sending message...' : 'Send message'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/55 bg-white/22 p-4">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                    This complaint is complete, so no new messages can be added.
                  </p>
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <section className="rounded-[1.7rem] border border-white/45 bg-white/18 p-5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                  Case timeline
                </p>

                {complaint.actions.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {complaint.actions.map((action, index) => {
                      const ActionIcon = getActionIcon(action.action);
                      const performerName = getPartyName(action.performedBy);

                      return (
                        <div key={action.id} className="relative flex gap-4">
                          {index < complaint.actions.length - 1 ? (
                            <div className="absolute left-[1.15rem] top-10 h-[calc(100%+0.25rem)] w-px bg-[rgba(93,58,85,0.16)]" />
                          ) : null}

                          <div className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-[rgba(183,167,200,0.28)] text-[var(--color-deep-plum)]">
                            <ActionIcon className="size-4" />
                          </div>

                          <div className="min-w-0 pb-1">
                            <p className="font-black text-[var(--color-near-black)]">
                              {getActionLabel(action.action)}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                              {formatDateTime(action.createdAt)}
                            </p>

                            {action.reason ? (
                              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                                {action.reason}
                              </p>
                            ) : null}

                            <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/42">
                              By {performerName}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                    No lifecycle activity is available yet.
                  </p>
                )}
              </section>

              {canClose ? (
                <section className="rounded-[1.7rem] border border-[rgba(124,74,90,0.20)] bg-[rgba(124,74,90,0.08)] p-5">
                  <ShieldAlert className="size-6 text-[var(--color-muted-burgundy)]" />

                  <h3 className="mt-5 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                    Close this complaint
                  </h3>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                    Close the case when you no longer need administrator assistance.
                  </p>

                  {!isCloseFormOpen ? (
                    <button
                      type="button"
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(124,74,90,0.26)] bg-[rgba(124,74,90,0.10)] px-5 py-3 text-sm font-black text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
                      disabled={isReplyPending || isClosePending}
                      onClick={() => {
                        setCloseValidationError(null);
                        setIsCloseFormOpen(true);
                      }}
                    >
                      <ShieldAlert className="size-4" />
                      Close complaint
                    </button>
                  ) : (
                    <div className="mt-5">
                      <label className="block">
                        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                          Reason for closing
                        </span>

                        <textarea
                          className="form-field min-h-28 resize-y"
                          maxLength={500}
                          value={closeReason}
                          disabled={isClosePending}
                          placeholder="Optional reason for closing this complaint."
                          onChange={(event) => {
                            setCloseValidationError(null);
                            setCloseReason(event.target.value);
                          }}
                        />

                        <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/46">
                          Optional. Minimum 5 characters when provided. {closeReason.length}/500
                        </p>
                      </label>

                      {closeValidationError || closeErrorMessage ? (
                        <div
                          role="alert"
                          className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                        >
                          {closeValidationError ?? closeErrorMessage}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-col-reverse gap-3">
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
                          className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isClosePending}
                          onClick={handleCloseSubmit}
                        >
                          {isClosePending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <ShieldAlert className="size-4" />
                          )}

                          {isClosePending ? 'Closing complaint...' : 'Confirm close'}
                        </button>
                      </div>
                    </div>
                  )}
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
  );
}
