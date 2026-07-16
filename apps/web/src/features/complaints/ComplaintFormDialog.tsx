import {
  CircleAlert,
  CreditCard,
  LoaderCircle,
  MessageSquareWarning,
  PackageCheck,
  ReceiptText,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { ComplaintType, CreateComplaintInput } from './complaint.api';

export type ComplaintResourceOption = {
  id: string;
  label: string;
  description?: string | null;
};

type ComplaintFormDialogProps = {
  eventName: string;

  bookingOptions: ComplaintResourceOption[];
  paymentOptions: ComplaintResourceOption[];
  reviewOptions: ComplaintResourceOption[];
  quotationOptions: ComplaintResourceOption[];

  initialType?: ComplaintType;
  initialResourceId?: string | null;

  isPending: boolean;
  errorMessage?: string | null;

  onClose: () => void;
  onSubmit: (input: CreateComplaintInput) => void;
};

type ComplaintTypeOption = {
  value: ComplaintType;
  label: string;
  description: string;
  icon: typeof PackageCheck;
};

const complaintTypeOptions: ComplaintTypeOption[] = [
  {
    value: 'BOOKING',
    label: 'Booking',
    description: 'Report an issue involving a confirmed or completed booking.',
    icon: PackageCheck,
  },
  {
    value: 'PAYMENT',
    label: 'Payment',
    description: 'Raise a concern about a payment, transfer or verification.',
    icon: CreditCard,
  },
  {
    value: 'REVIEW',
    label: 'Review',
    description: 'Report an issue connected to a submitted vendor review.',
    icon: Star,
  },
  {
    value: 'QUOTATION',
    label: 'Quotation',
    description: 'Raise a concern about a quotation request or vendor proposal.',
    icon: ReceiptText,
  },
];

const complaintTypeLabels: Record<ComplaintType, string> = {
  BOOKING: 'Booking',
  PAYMENT: 'Payment',
  REVIEW: 'Review',
  QUOTATION: 'Quotation',
  USER_CONDUCT: 'User conduct',
  PLATFORM: 'Platform',
  OTHER: 'Other',
};

const getRelatedFieldLabel = (type: ComplaintType) => {
  switch (type) {
    case 'BOOKING':
      return 'Related booking';

    case 'PAYMENT':
      return 'Related payment';

    case 'REVIEW':
      return 'Related review';

    case 'QUOTATION':
      return 'Related quotation request';

    case 'OTHER':
    case 'PLATFORM':
    default:
      return null;
  }
};

const getRelatedFieldDescription = (type: ComplaintType) => {
  switch (type) {
    case 'BOOKING':
      return 'Choose the booking connected to this complaint.';

    case 'PAYMENT':
      return 'Choose the payment connected to this complaint.';

    case 'REVIEW':
      return 'Choose the review connected to this complaint.';

    case 'QUOTATION':
      return 'Choose the quotation request connected to this complaint.';

    case 'OTHER':
    case 'PLATFORM':
    default:
      return null;
  }
};

const getEmptyResourceMessage = (type: ComplaintType) => {
  switch (type) {
    case 'BOOKING':
      return 'No bookings are available for this event.';

    case 'PAYMENT':
      return 'No payments are available for this event.';

    case 'REVIEW':
      return 'No reviews are available for this event.';

    case 'QUOTATION':
      return 'No quotation requests are available for this event.';

    case 'OTHER':
    case 'PLATFORM':
    default:
      return '';
  }
};

export function ComplaintFormDialog({
  eventName,
  bookingOptions,
  paymentOptions,
  reviewOptions,
  quotationOptions,
  initialType = 'BOOKING',
  initialResourceId = null,
  isPending,
  errorMessage,
  onClose,
  onSubmit,
}: ComplaintFormDialogProps) {
  const [type, setType] = useState<ComplaintType>(initialType);
  const [resourceId, setResourceId] = useState(initialResourceId ?? '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setType(initialType);
    setResourceId(initialResourceId ?? '');
    setSubject('');
    setDescription('');
    setValidationError(null);
  }, [initialResourceId, initialType]);

  const selectedTypeOption = useMemo(() => {
    return complaintTypeOptions.find((option) => option.value === type)!;
  }, [type]);

  const resourceOptions = useMemo(() => {
    switch (type) {
      case 'BOOKING':
        return bookingOptions;

      case 'PAYMENT':
        return paymentOptions;

      case 'REVIEW':
        return reviewOptions;

      case 'QUOTATION':
        return quotationOptions;

      case 'OTHER':
      case 'PLATFORM':
      default:
        return [];
    }
  }, [bookingOptions, paymentOptions, quotationOptions, reviewOptions, type]);

  const relatedFieldLabel = getRelatedFieldLabel(type);
  const relatedFieldDescription = getRelatedFieldDescription(type);

  const requiresResource =
    type === 'BOOKING' || type === 'PAYMENT' || type === 'REVIEW' || type === 'QUOTATION';

  const SelectedTypeIcon = selectedTypeOption.icon;

  const handleTypeChange = (nextType: ComplaintType) => {
    setType(nextType);
    setResourceId('');
    setValidationError(null);
  };

  const buildComplaintInput = (): CreateComplaintInput | null => {
    const normalizedSubject = subject.trim();
    const normalizedDescription = description.trim();

    if (requiresResource && !resourceId) {
      setValidationError(
        `Choose a ${complaintTypeLabels[type].toLowerCase()} record before submitting.`,
      );

      return null;
    }

    if (normalizedSubject.length < 5) {
      setValidationError('Complaint subject must contain at least 5 characters.');

      return null;
    }

    if (normalizedSubject.length > 150) {
      setValidationError('Complaint subject cannot exceed 150 characters.');

      return null;
    }

    if (normalizedDescription.length < 20) {
      setValidationError('Complaint description must contain at least 20 characters.');

      return null;
    }

    if (normalizedDescription.length > 5000) {
      setValidationError('Complaint description cannot exceed 5000 characters.');

      return null;
    }

    const commonFields = {
      subject: normalizedSubject,
      description: normalizedDescription,
    };

    switch (type) {
      case 'BOOKING':
        return {
          type,
          ...commonFields,
          bookingId: resourceId,
        };

      case 'PAYMENT':
        return {
          type,
          ...commonFields,
          paymentId: resourceId,
        };

      case 'REVIEW':
        return {
          type,
          ...commonFields,
          reviewId: resourceId,
        };

      case 'QUOTATION':
        return {
          type,
          ...commonFields,
          quotationRequestId: resourceId,
        };

      case 'PLATFORM':
        return {
          type,
          ...commonFields,
        };

      case 'OTHER':
        return {
          type,
          ...commonFields,
        };

      case 'USER_CONDUCT':
        setValidationError(
          'User conduct complaints are not available from the event workspace yet.',
        );

        return null;
    }
  };

  const handleSubmit = () => {
    setValidationError(null);

    const input = buildComplaintInput();

    if (!input) {
      return;
    }

    onSubmit(input);
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-form-title"
    >
      <div className="mx-auto max-w-4xl">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                <MessageSquareWarning className="size-7" />
              </div>

              <h2
                id="complaint-form-title"
                className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
              >
                Submit a complaint
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-[var(--color-charcoal)]/66">
                Report a concern connected to <strong>{eventName}</strong>. Provide clear details so
                the support team can review the issue properly.
              </p>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
              aria-label="Close complaint form"
              disabled={isPending}
              onClick={onClose}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-white/55 bg-white/20 p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                <SelectedTypeIcon className="size-5" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/44">
                  Selected complaint type
                </p>

                <p className="mt-1 font-black text-[var(--color-near-black)]">
                  {selectedTypeOption.label}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
              {selectedTypeOption.description}
            </p>
          </div>

          <section className="mt-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
              Choose complaint type
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {complaintTypeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = option.value === type;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-[1.4rem] border p-4 text-left transition ${
                      isSelected
                        ? 'border-[rgba(93,58,85,0.28)] bg-[rgba(93,58,85,0.10)]'
                        : 'border-white/55 bg-white/20 hover:bg-white/32'
                    }`}
                    disabled={isPending}
                    aria-pressed={isSelected}
                    onClick={() => {
                      handleTypeChange(option.value);
                    }}
                  >
                    <div
                      className={`grid size-10 place-items-center rounded-2xl ${
                        isSelected
                          ? 'bg-[rgba(93,58,85,0.14)] text-[var(--color-deep-plum)]'
                          : 'bg-white/28 text-[var(--color-charcoal)]/54'
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>

                    <p className="mt-4 font-black text-[var(--color-near-black)]">{option.label}</p>

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/54">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {relatedFieldLabel ? (
            <section className="mt-6 rounded-[1.6rem] border border-white/55 bg-white/20 p-5">
              <label className="block">
                <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                  {relatedFieldLabel}
                  {requiresResource ? (
                    <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                  ) : null}
                </span>

                {relatedFieldDescription ? (
                  <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    {relatedFieldDescription}
                  </span>
                ) : null}

                {resourceOptions.length > 0 ? (
                  <select
                    className="form-field mt-4 min-h-12"
                    value={resourceId}
                    disabled={isPending}
                    onChange={(event) => {
                      setValidationError(null);
                      setResourceId(event.target.value);
                    }}
                  >
                    <option value="">
                      {type === 'OTHER'
                        ? 'No related person'
                        : `Choose ${complaintTypeLabels[type].toLowerCase()}`}
                    </option>

                    {resourceOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                        {option.description ? ` — ${option.description}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/70 bg-white/18 p-5">
                    <CircleAlert className="size-5 text-[var(--color-deep-plum)]" />

                    <p className="mt-3 text-sm font-black text-[var(--color-near-black)]">
                      No related records found
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                      {getEmptyResourceMessage(type)}
                    </p>
                  </div>
                )}
              </label>
            </section>
          ) : null}
          <section className="mt-6 grid gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Complaint subject
                <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
              </span>

              <input
                className="form-field"
                type="text"
                maxLength={150}
                value={subject}
                disabled={isPending}
                placeholder="Summarize the issue clearly."
                onChange={(event) => {
                  setValidationError(null);
                  setSubject(event.target.value);
                }}
              />

              <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/46">
                Minimum 5 characters. {subject.length}/150
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Complaint description
                <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
              </span>

              <textarea
                className="form-field min-h-52 resize-y"
                maxLength={5000}
                value={description}
                disabled={isPending}
                placeholder="Explain what happened, when it happened and what outcome you expect."
                onChange={(event) => {
                  setValidationError(null);
                  setDescription(event.target.value);
                }}
              />

              <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/46">
                Minimum 20 characters. {description.length}/5000
              </p>
            </label>
          </section>

          {validationError || errorMessage ? (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
            >
              {validationError ?? errorMessage}
            </div>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/55 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary justify-center text-sm font-bold"
              disabled={isPending}
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary justify-center text-sm font-bold"
              disabled={isPending || (requiresResource && resourceOptions.length === 0)}
              onClick={handleSubmit}
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <MessageSquareWarning className="size-4" />
              )}

              {isPending ? 'Submitting complaint...' : 'Submit complaint'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
