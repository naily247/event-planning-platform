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
      className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-form-title"
      onClick={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-full max-w-4xl items-start justify-center">
        <div
          className="relative w-full overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(249,237,243,0.84))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(210,146,160,0.20)] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[22%] top-[-7rem] size-64 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
          />

          <div className="relative">
            <div className="flex flex-col gap-6 border-b border-[rgba(124,74,90,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                    <MessageSquareWarning aria-hidden="true" className="size-6" />
                  </div>

                  <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                    New support case
                  </span>
                </div>

                <h2
                  id="complaint-form-title"
                  className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                >
                  Submit a complaint
                </h2>

                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                  Report a concern connected to{' '}
                  <strong className="font-black text-[var(--color-near-black)]">{eventName}</strong>
                  . Provide clear details so the support team can review the issue properly.
                </p>
              </div>

              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.22)] hover:bg-white/56 hover:text-[var(--color-muted-burgundy)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close complaint form"
                disabled={isPending}
                onClick={onClose}
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <div className="group/selected-type relative mt-8 overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(240,231,246,0.46))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition duration-500 group-hover/selected-type:scale-125 group-hover/selected-type:bg-[rgba(183,167,200,0.28)]"
              />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/selected-type:-translate-y-0.5 group-hover/selected-type:scale-105">
                    <SelectedTypeIcon aria-hidden="true" className="size-6" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Selected complaint type
                    </p>

                    <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/selected-type:text-[var(--color-deep-plum)]">
                      {selectedTypeOption.label}
                    </h3>

                    <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                      {selectedTypeOption.description}
                    </p>
                  </div>
                </div>

                <span className="status-chip w-fit" data-tone="plum">
                  Active selection
                </span>
              </div>
            </div>

            <section className="mt-7">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  Complaint category
                </p>

                <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  Choose what this complaint is about.
                </h3>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                  Select the workflow most closely connected to your concern so the right record can
                  be attached.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {complaintTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = option.value === type;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`group/type-option relative overflow-hidden rounded-[1.5rem] border p-5 text-left shadow-[0_14px_36px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(31,27,29,0.08)] disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? 'border-[rgba(93,58,85,0.30)] bg-[linear-gradient(145deg,rgba(239,229,244,0.76),rgba(255,255,255,0.48))]'
                          : 'border-white/58 bg-white/28 hover:border-white/84 hover:bg-white/42'
                      }`}
                      disabled={isPending}
                      aria-pressed={isSelected}
                      onClick={() => {
                        handleTypeChange(option.value);
                      }}
                    >
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute -right-12 -top-12 size-32 rounded-full blur-3xl transition duration-500 group-hover/type-option:scale-125 ${
                          isSelected
                            ? 'bg-[rgba(183,167,200,0.24)]'
                            : 'bg-[rgba(175,201,216,0.12)] group-hover/type-option:bg-[rgba(175,201,216,0.22)]'
                        }`}
                      />

                      <div className="relative">
                        <div className="flex items-start justify-between gap-4">
                          <div
                            className={`grid size-11 place-items-center rounded-2xl shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/type-option:-translate-y-0.5 group-hover/type-option:scale-105 ${
                              isSelected
                                ? 'bg-[rgba(93,58,85,0.14)] text-[var(--color-deep-plum)]'
                                : 'bg-white/36 text-[var(--color-charcoal)]/58'
                            }`}
                          >
                            <Icon aria-hidden="true" className="size-5" />
                          </div>

                          {isSelected ? (
                            <span className="status-chip" data-tone="plum">
                              Selected
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-5 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)] transition duration-300 group-hover/type-option:text-[var(--color-deep-plum)]">
                          {option.label}
                        </p>

                        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {relatedFieldLabel ? (
              <section className="group/related-resource relative mt-7 overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(220,235,242,0.44))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/related-resource:scale-125"
                />

                <div className="relative">
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/related-resource:-translate-y-0.5 group-hover/related-resource:scale-105">
                      <SelectedTypeIcon aria-hidden="true" className="size-5" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Connected record
                      </p>

                      <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/related-resource:text-[var(--color-deep-plum)]">
                        {relatedFieldLabel}
                        {requiresResource ? (
                          <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                        ) : null}
                      </h3>

                      {relatedFieldDescription ? (
                        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                          {relatedFieldDescription}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {resourceOptions.length > 0 ? (
                    <label className="mt-5 block">
                      <span className="sr-only">{relatedFieldLabel}</span>

                      <select
                        className="form-field min-h-12 transition duration-300 focus:bg-white/52"
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

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        Select the exact record connected to this complaint.
                      </p>
                    </label>
                  ) : (
                    <div className="mt-5 rounded-[1.45rem] border border-dashed border-white/72 bg-white/24 p-6 text-center">
                      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                        <CircleAlert aria-hidden="true" className="size-5" />
                      </span>

                      <p className="mt-4 text-sm font-black text-[var(--color-near-black)]">
                        No related records found
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        {getEmptyResourceMessage(type)}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            ) : null}
            <section className="mt-7 grid gap-5 rounded-[1.65rem] border border-white/60 bg-white/28 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  Complaint details
                </p>

                <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  Explain the issue clearly.
                </h3>

                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                  Give the support team enough context to understand what happened and what outcome
                  you expect.
                </p>
              </div>

              <label className="block">
                <span className="flex items-center justify-between gap-4">
                  <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                    Complaint subject
                    <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                  </span>

                  <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                    {subject.length.toLocaleString('en-LK')} / 150
                  </span>
                </span>

                <input
                  className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
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

                <div className="mt-2 flex flex-col gap-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48 sm:flex-row sm:items-center sm:justify-between">
                  <span>Use a short and specific title.</span>

                  <span
                    className={
                      subject.trim().length > 0 && subject.trim().length < 5
                        ? 'font-black text-[var(--color-muted-burgundy)]'
                        : 'font-black text-[var(--color-deep-plum)]/60'
                    }
                  >
                    Minimum 5 characters
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="flex items-center justify-between gap-4">
                  <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                    Complaint description
                    <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                  </span>

                  <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                    {description.length.toLocaleString('en-LK')} / 5,000
                  </span>
                </span>

                <textarea
                  className="form-field mt-2 min-h-52 resize-y transition duration-300 focus:bg-white/52"
                  maxLength={5000}
                  value={description}
                  disabled={isPending}
                  placeholder="Explain what happened, when it happened and what outcome you expect."
                  onChange={(event) => {
                    setValidationError(null);
                    setDescription(event.target.value);
                  }}
                />

                <div className="mt-2 flex flex-col gap-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48 sm:flex-row sm:items-center sm:justify-between">
                  <span>Include dates, actions taken and the resolution you are seeking.</span>

                  <span
                    className={
                      description.trim().length > 0 && description.trim().length < 20
                        ? 'font-black text-[var(--color-muted-burgundy)]'
                        : 'font-black text-[var(--color-deep-plum)]/60'
                    }
                  >
                    Minimum 20 characters
                  </span>
                </div>
              </label>
            </section>

            {validationError || errorMessage ? (
              <div
                role="alert"
                className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                    <CircleAlert aria-hidden="true" className="size-4" />
                  </span>

                  <div>
                    <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                      Complaint could not be submitted
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                      {validationError ?? errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-7 flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                  <MessageSquareWarning aria-hidden="true" className="size-4" />
                </span>

                <p className="max-w-md text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                  Your complaint will be added to this event’s support history and reviewed by the
                  administration team.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                  className="group/submit-complaint btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                  disabled={isPending || (requiresResource && resourceOptions.length === 0)}
                  onClick={handleSubmit}
                >
                  {isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <MessageSquareWarning
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/submit-complaint:scale-105 group-hover/submit-complaint:rotate-[3deg]"
                    />
                  )}

                  {isPending ? 'Submitting complaint...' : 'Submit complaint'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
