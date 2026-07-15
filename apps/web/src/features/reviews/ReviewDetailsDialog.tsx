import {
  CalendarDays,
  Eye,
  EyeOff,
  MessageSquareText,
  PackageCheck,
  Star,
  Store,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { CustomerReview } from './review.api';

type ReviewDetailsDialogProps = {
  review: CustomerReview;
  onClose: () => void;
  onEdit: (review: CustomerReview) => void;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

function RatingSummary({ label, rating }: { label: string; rating: number | null }) {
  return (
    <div className="rounded-2xl bg-white/28 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
        {label}
      </p>

      {rating === null ? (
        <p className="mt-3 text-sm font-bold text-[var(--color-charcoal)]/48">Not rated</p>
      ) : (
        <div
          className="mt-3 flex flex-wrap items-center gap-1"
          aria-label={`${label}: ${rating} out of 5`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              className={`size-5 ${
                index < rating
                  ? 'fill-[var(--color-rosewood)] text-[var(--color-rosewood)]'
                  : 'text-[var(--color-charcoal)]/20'
              }`}
            />
          ))}

          <span className="ml-2 text-sm font-black text-[var(--color-near-black)]">{rating}/5</span>
        </div>
      )}
    </div>
  );
}

export function ReviewDetailsDialog({ review, onClose, onEdit }: ReviewDetailsDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.52)] px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-details-title"
    >
      <div className="mx-auto max-w-4xl">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                <MessageSquareText className="size-4" />
                Review overview
              </div>

              <h2
                id="review-details-title"
                className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
              >
                Your vendor review
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-[var(--color-charcoal)]/66">
                Review the ratings and feedback you submitted for this completed booking.
              </p>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
              aria-label="Close review details"
              onClick={onClose}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="status-chip" data-tone={review.isHidden ? 'rose' : 'green'}>
              {review.isHidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}

              {review.isHidden ? 'Hidden by moderation' : 'Published'}
            </span>

            <span className="status-chip" data-tone="plum">
              <Star className="size-3.5 fill-current" />
              {review.overallRating}/5 overall
            </span>

            {review.package ? (
              <span className="status-chip" data-tone="gray">
                <PackageCheck className="size-3.5" />
                {review.package.title}
              </span>
            ) : null}
          </div>

          <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
            <article className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
              <Store className="size-6 text-[var(--color-deep-plum)]" />

              <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                Vendor
              </p>

              <h3 className="mt-3 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                {review.vendor.businessName}
              </h3>

              <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/58">
                {review.package?.title ?? 'Custom vendor service'}
              </p>

              <Link
                to={`/vendors/${review.vendor.slug}`}
                className="btn-secondary mt-5 w-fit text-sm font-bold"
              >
                View vendor profile
              </Link>
            </article>

            <article className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
              <CalendarDays className="size-6 text-[var(--color-deep-plum)]" />

              <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                Review activity
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-white/28 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                    Submitted
                  </p>

                  <p className="mt-2 font-black text-[var(--color-near-black)]">
                    {formatDateTime(review.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/28 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                    Last updated
                  </p>

                  <p className="mt-2 font-black text-[var(--color-near-black)]">
                    {formatDateTime(review.updatedAt)}
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section className="mt-5 rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
              Ratings
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <RatingSummary label="Overall" rating={review.overallRating} />

              <RatingSummary label="Service" rating={review.serviceRating} />

              <RatingSummary label="Communication" rating={review.communicationRating} />
            </div>
          </section>

          <section className="mt-5 rounded-[1.65rem] border border-white/55 bg-white/24 p-5 sm:p-6">
            <MessageSquareText className="size-6 text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
              Written feedback
            </p>

            {review.comment ? (
              <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                {review.comment}
              </p>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/70 bg-white/18 p-5">
                <p className="text-sm font-semibold text-[var(--color-charcoal)]/54">
                  No written feedback was included with this review.
                </p>
              </div>
            )}
          </section>

          {review.isHidden ? (
            <section className="mt-5 rounded-[1.65rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.09)] p-5 sm:p-6">
              <EyeOff className="size-6 text-[var(--color-muted-burgundy)]" />

              <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
                Moderation notice
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                {review.moderationReason ?? 'This review was hidden by a platform moderator.'}
              </p>

              {review.moderatedAt ? (
                <p className="mt-3 text-xs font-bold text-[var(--color-charcoal)]/46">
                  Moderated {formatDateTime(review.moderatedAt)}
                </p>
              ) : null}
            </section>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary justify-center text-sm font-bold"
              onClick={onClose}
            >
              Close
            </button>

            <button
              type="button"
              className="btn-primary justify-center text-sm font-bold"
              onClick={() => {
                onEdit(review);
              }}
            >
              Edit review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
