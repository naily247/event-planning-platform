import { LoaderCircle, MessageSquareText, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { CustomerReview, UpdateCustomerReviewInput } from './review.api';

export type ReviewFormInput = {
  overallRating: number;
  serviceRating?: number | null;
  communicationRating?: number | null;
  comment?: string | null;
};

type ReviewFormDialogProps = {
  mode: 'create' | 'edit';
  review?: CustomerReview | null;
  vendorName: string;
  packageTitle?: string | null;
  isPending: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: ReviewFormInput | UpdateCustomerReviewInput) => void;
};

type RatingFieldProps = {
  label: string;
  description: string;
  value: number | null;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: number | null) => void;
};

function RatingField({
  label,
  description,
  value,
  required = false,
  disabled = false,
  onChange,
}: RatingFieldProps) {
  return (
    <fieldset disabled={disabled}>
      <div className="flex flex-col gap-1">
        <legend className="text-sm font-black text-[var(--color-charcoal)]/74">
          {label}
          {required ? <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span> : null}
        </legend>

        <p className="text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
          {description}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }, (_, index) => {
          const rating = index + 1;
          const isSelected = value !== null && rating <= value;

          return (
            <button
              key={rating}
              type="button"
              className={`grid size-11 place-items-center rounded-2xl border transition ${
                isSelected
                  ? 'border-[rgba(130,72,77,0.28)] bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]'
                  : 'border-white/55 bg-white/24 text-[var(--color-charcoal)]/24 hover:bg-white/36 hover:text-[var(--color-rosewood)]'
              }`}
              aria-label={`${rating} out of 5`}
              aria-pressed={value === rating}
              disabled={disabled}
              onClick={() => {
                onChange(rating);
              }}
            >
              <Star className={`size-5 ${isSelected ? 'fill-current' : ''}`} />
            </button>
          );
        })}

        {!required && value !== null ? (
          <button
            type="button"
            className="ml-1 text-sm font-black text-[var(--color-muted-burgundy)]"
            disabled={disabled}
            onClick={() => {
              onChange(null);
            }}
          >
            Clear
          </button>
        ) : null}

        <span className="ml-1 text-sm font-black text-[var(--color-near-black)]">
          {value === null ? 'Not rated' : `${value}/5`}
        </span>
      </div>
    </fieldset>
  );
}

export function ReviewFormDialog({
  mode,
  review = null,
  vendorName,
  packageTitle,
  isPending,
  errorMessage,
  onClose,
  onSubmit,
}: ReviewFormDialogProps) {
  const [overallRating, setOverallRating] = useState<number | null>(review?.overallRating ?? null);
  const [serviceRating, setServiceRating] = useState<number | null>(review?.serviceRating ?? null);
  const [communicationRating, setCommunicationRating] = useState<number | null>(
    review?.communicationRating ?? null,
  );
  const [comment, setComment] = useState(review?.comment ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setOverallRating(review?.overallRating ?? null);
    setServiceRating(review?.serviceRating ?? null);
    setCommunicationRating(review?.communicationRating ?? null);
    setComment(review?.comment ?? '');
    setValidationError(null);
  }, [review, mode]);

  const title = mode === 'create' ? 'Write your review' : 'Edit your review';

  const submitLabel = mode === 'create' ? 'Submit review' : 'Save changes';

  const pendingLabel = mode === 'create' ? 'Submitting review...' : 'Saving changes...';

  const handleSubmit = () => {
    setValidationError(null);

    if (overallRating === null) {
      setValidationError('Overall rating is required.');
      return;
    }

    const normalizedComment = comment.trim();

    if (normalizedComment.length > 0 && normalizedComment.length < 3) {
      setValidationError('Review comment must contain at least 3 characters.');
      return;
    }

    if (normalizedComment.length > 2000) {
      setValidationError('Review comment cannot exceed 2000 characters.');
      return;
    }

    onSubmit({
      overallRating,
      serviceRating,
      communicationRating,
      comment: normalizedComment.length > 0 ? normalizedComment : null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-form-title"
    >
      <div className="glass-card w-full max-w-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <Star className="size-7 fill-current" />
            </div>

            <h2
              id="review-form-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              {title}
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              Share your experience with <strong>{vendorName}</strong>
              {packageTitle ? (
                <>
                  {' '}
                  for <strong>{packageTitle}</strong>
                </>
              ) : null}
              .
            </p>
          </div>

          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
            aria-label="Close review form"
            disabled={isPending}
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-7 space-y-6">
          <div className="rounded-[1.5rem] border border-white/55 bg-white/22 p-5">
            <RatingField
              label="Overall rating"
              description="Your overall impression of the completed vendor service."
              value={overallRating}
              required
              disabled={isPending}
              onChange={setOverallRating}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/55 bg-white/22 p-5">
              <RatingField
                label="Service quality"
                description="How satisfied were you with the delivered service?"
                value={serviceRating}
                disabled={isPending}
                onChange={setServiceRating}
              />
            </div>

            <div className="rounded-[1.5rem] border border-white/55 bg-white/22 p-5">
              <RatingField
                label="Communication"
                description="How clearly and reliably did the vendor communicate?"
                value={communicationRating}
                disabled={isPending}
                onChange={setCommunicationRating}
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-[var(--color-charcoal)]/74">
              <MessageSquareText className="size-4 text-[var(--color-rosewood)]" />
              Written feedback
            </span>

            <textarea
              className="form-field min-h-40 resize-y"
              maxLength={2000}
              value={comment}
              disabled={isPending}
              placeholder="Describe your experience with the vendor, service quality and communication."
              onChange={(event) => {
                setValidationError(null);
                setComment(event.target.value);
              }}
            />

            <p className="mt-2 text-xs font-semibold text-[var(--color-charcoal)]/48">
              Optional. Minimum 3 characters when provided. {comment.length}
              /2000
            </p>
          </label>
        </div>

        {validationError || errorMessage ? (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
          >
            {validationError ?? errorMessage}
          </div>
        ) : null}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Star className="size-4 fill-current" />
            )}

            {isPending ? pendingLabel : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
