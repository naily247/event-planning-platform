import {
  CalendarDays,
  Eye,
  EyeOff,
  MessageSquareText,
  PackageCheck,
  Pencil,
  Star,
  Store,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { CustomerReview } from './review.api';

type ReviewCardProps = {
  review: CustomerReview;
  onView: (review: CustomerReview) => void;
  onEdit: (review: CustomerReview) => void;
  onDelete: (review: CustomerReview) => void;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
  }).format(new Date(value));

function RatingStars({ rating, label }: { rating: number | null; label: string }) {
  return (
    <div className="rounded-2xl bg-white/28 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
        {label}
      </p>

      {rating === null ? (
        <p className="mt-2 text-sm font-bold text-[var(--color-charcoal)]/48">Not rated</p>
      ) : (
        <div className="mt-2 flex items-center gap-1" aria-label={`${label}: ${rating} out of 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              className={`size-4 ${
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

export function ReviewCard({ review, onView, onEdit, onDelete }: ReviewCardProps) {
  return (
    <article className="rounded-[1.65rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl sm:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
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

          <Link
            to={`/vendors/${review.vendor.slug}`}
            className="mt-5 inline-flex items-center gap-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] transition hover:text-[var(--color-deep-plum)]"
          >
            <Store className="size-5 text-[var(--color-deep-plum)]" />
            {review.vendor.businessName}
          </Link>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <RatingStars rating={review.overallRating} label="Overall" />

            <RatingStars rating={review.serviceRating} label="Service" />

            <RatingStars rating={review.communicationRating} label="Communication" />
          </div>

          {review.comment ? (
            <div className="mt-5 rounded-2xl bg-white/24 p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-rosewood)]">
                <MessageSquareText className="size-4" />
                Your feedback
              </p>

              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                {review.comment}
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/65 bg-white/18 p-4">
              <p className="text-sm font-semibold text-[var(--color-charcoal)]/52">
                No written feedback was included with this review.
              </p>
            </div>
          )}

          {review.isHidden ? (
            <div className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.09)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                Moderation notice
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                {review.moderationReason ?? 'This review was hidden by a platform moderator.'}
              </p>

              {review.moderatedAt ? (
                <p className="mt-3 text-xs font-bold text-[var(--color-charcoal)]/46">
                  Moderated {formatDate(review.moderatedAt)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-[var(--color-charcoal)]/48">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4" />
              Reviewed {formatDate(review.createdAt)}
            </span>

            {review.updatedAt !== review.createdAt ? (
              <span>Updated {formatDate(review.updatedAt)}</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:flex-col">
          <button
            type="button"
            className="btn-secondary justify-center text-sm font-bold"
            onClick={() => {
              onView(review);
            }}
          >
            <Eye className="size-4" />
            View details
          </button>

          <button
            type="button"
            className="btn-secondary justify-center text-sm font-bold"
            onClick={() => {
              onEdit(review);
            }}
          >
            <Pencil className="size-4" />
            Edit review
          </button>

          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-2xl border border-[rgba(124,74,90,0.26)] bg-[rgba(124,74,90,0.10)] px-5 py-3 text-sm font-black text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
            onClick={() => {
              onDelete(review);
            }}
          >
            <Trash2 className="size-4" />
            Delete review
          </button>
        </div>
      </div>
    </article>
  );
}
