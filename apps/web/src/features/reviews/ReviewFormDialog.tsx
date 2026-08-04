import { CircleAlert, LoaderCircle, MessageSquareText, Sparkles, Star, X } from 'lucide-react';
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
        <legend className="text-sm font-black text-[var(--color-charcoal)]/76">
          {label}

          {required ? <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span> : null}
        </legend>

        <p className="text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
          {description}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }, (_, index) => {
          const rating = index + 1;
          const isSelected = value !== null && rating <= value;
          const isActiveRating = value === rating;

          return (
            <button
              key={rating}
              type="button"
              className={`group/rating-star grid size-11 place-items-center rounded-2xl border shadow-[0_8px_22px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)] disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? 'border-[rgba(130,72,77,0.28)] bg-[linear-gradient(145deg,rgba(248,226,215,0.88),rgba(255,255,255,0.56))] text-[var(--color-rosewood)]'
                  : 'border-white/58 bg-white/30 text-[var(--color-charcoal)]/24 hover:border-[rgba(130,72,77,0.20)] hover:bg-white/48 hover:text-[var(--color-rosewood)]'
              } ${isActiveRating ? 'ring-2 ring-[rgba(130,72,77,0.14)]' : ''}`}
              aria-label={`${rating} out of 5`}
              aria-pressed={isActiveRating}
              disabled={disabled}
              onClick={() => {
                onChange(rating);
              }}
            >
              <Star
                aria-hidden="true"
                className={`size-5 transition duration-300 group-hover/rating-star:scale-110 group-hover/rating-star:rotate-[4deg] ${
                  isSelected ? 'fill-current' : ''
                }`}
              />
            </button>
          );
        })}

        {!required && value !== null ? (
          <button
            type="button"
            className="ml-1 rounded-xl border border-[rgba(124,74,90,0.14)] bg-[rgba(124,74,90,0.07)] px-3 py-2 text-xs font-black text-[var(--color-muted-burgundy)] transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(124,74,90,0.13)]"
            disabled={disabled}
            onClick={() => {
              onChange(null);
            }}
          >
            Clear
          </button>
        ) : null}

        <span className="ml-1 rounded-xl border border-white/54 bg-white/34 px-3 py-2 text-xs font-black text-[var(--color-near-black)]">
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
      className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.58)] px-4 py-6 backdrop-blur-xl sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-form-title"
      onClick={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <div className="grid min-h-full place-items-center">
        <div
          className="relative w-full max-w-2xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(249,235,229,0.82))] p-6 shadow-[0_40px_110px_rgba(31,27,29,0.24)] backdrop-blur-3xl sm:p-8"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[rgba(220,183,150,0.22)] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative">
            <div className="flex items-start justify-between gap-5 border-b border-[rgba(130,72,77,0.10)] pb-6">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(130,72,77,0.13)] text-[var(--color-rosewood)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                    <Star aria-hidden="true" className="size-6 fill-current" />
                  </div>

                  <span className="rounded-full border border-[rgba(130,72,77,0.18)] bg-[rgba(130,72,77,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                    {mode === 'create' ? 'Completed service' : 'Review update'}
                  </span>
                </div>

                <h2
                  id="review-form-title"
                  className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                >
                  {title}
                </h2>

                <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                  Share your experience with{' '}
                  <strong className="font-black text-[var(--color-near-black)]">
                    {vendorName}
                  </strong>
                  {packageTitle ? (
                    <>
                      {' '}
                      for{' '}
                      <strong className="font-black text-[var(--color-near-black)]">
                        {packageTitle}
                      </strong>
                    </>
                  ) : null}
                  .
                </p>
              </div>

              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(130,72,77,0.22)] hover:bg-white/56 hover:text-[var(--color-rosewood)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close review form"
                disabled={isPending}
                onClick={onClose}
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="mt-7 space-y-5">
              <section className="group/overall-rating relative overflow-hidden rounded-[1.6rem] border border-[rgba(130,72,77,0.16)] bg-[linear-gradient(145deg,rgba(250,238,232,0.68),rgba(255,255,255,0.42))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.05)] transition duration-300 hover:border-[rgba(130,72,77,0.24)] hover:shadow-[0_18px_44px_rgba(130,72,77,0.08)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-[rgba(220,183,150,0.18)] blur-3xl transition duration-500 group-hover/overall-rating:scale-125"
                />

                <div className="relative">
                  <div className="mb-4 flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
                      <Sparkles aria-hidden="true" className="size-4" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Main rating
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                        This score represents your complete experience.
                      </p>
                    </div>
                  </div>

                  <RatingField
                    label="Overall rating"
                    description="Your overall impression of the completed vendor service."
                    value={overallRating}
                    required
                    disabled={isPending}
                    onChange={(value) => {
                      setValidationError(null);
                      setOverallRating(value);
                    }}
                  />
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-[1.5rem] border border-white/58 bg-white/30 p-5 shadow-[0_12px_30px_rgba(31,27,29,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-white/42 hover:shadow-[0_16px_38px_rgba(31,27,29,0.07)]">
                  <RatingField
                    label="Service quality"
                    description="How satisfied were you with the delivered service?"
                    value={serviceRating}
                    disabled={isPending}
                    onChange={(value) => {
                      setValidationError(null);
                      setServiceRating(value);
                    }}
                  />
                </section>

                <section className="rounded-[1.5rem] border border-white/58 bg-white/30 p-5 shadow-[0_12px_30px_rgba(31,27,29,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-white/42 hover:shadow-[0_16px_38px_rgba(31,27,29,0.07)]">
                  <RatingField
                    label="Communication"
                    description="How clearly and reliably did the vendor communicate?"
                    value={communicationRating}
                    disabled={isPending}
                    onChange={(value) => {
                      setValidationError(null);
                      setCommunicationRating(value);
                    }}
                  />
                </section>
              </div>

              <label className="block rounded-[1.5rem] border border-white/58 bg-white/30 p-5 shadow-[0_12px_30px_rgba(31,27,29,0.04)]">
                <span className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                    <MessageSquareText aria-hidden="true" className="size-4" />
                  </span>

                  <span>
                    <span className="block text-sm font-black text-[var(--color-near-black)]">
                      Written feedback
                    </span>

                    <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                      Add context about the service, quality and communication.
                    </span>
                  </span>
                </span>

                <textarea
                  className="form-field mt-4 min-h-40 resize-y transition duration-300 focus:bg-white/52"
                  maxLength={2000}
                  value={comment}
                  disabled={isPending}
                  placeholder="Describe your experience with the vendor, service quality and communication."
                  onChange={(event) => {
                    setValidationError(null);
                    setComment(event.target.value);
                  }}
                />

                <div className="mt-2 flex flex-col gap-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48 sm:flex-row sm:items-center sm:justify-between">
                  <span>Optional. Minimum 3 characters when provided.</span>

                  <span className="font-black tabular-nums text-[var(--color-deep-plum)]/60">
                    {comment.length.toLocaleString('en-LK')} / 2,000
                  </span>
                </div>
              </label>
            </div>

            {validationError || errorMessage ? (
              <div
                role="alert"
                className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                    <CircleAlert aria-hidden="true" className="size-4" />
                  </span>

                  <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                    {validationError ?? errorMessage}
                  </p>
                </div>
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
                className="group/submit-review btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                disabled={isPending}
                onClick={handleSubmit}
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Star
                    aria-hidden="true"
                    className="size-4 fill-current transition duration-300 group-hover/submit-review:scale-110 group-hover/submit-review:rotate-[4deg]"
                  />
                )}

                {isPending ? pendingLabel : submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
