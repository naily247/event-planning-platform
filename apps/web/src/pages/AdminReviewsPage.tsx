import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  History,
  LoaderCircle,
  MessageSquareText,
  Package,
  RotateCcw,
  Star,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import {
  adminReviewSortOptions,
  adminReviewVisibilityOptions,
  getAdminReviewById,
  getAdminReviews,
  moderateAdminReview,
  type AdminReview,
  type AdminReviewSort,
  type AdminReviewVisibility,
} from '../features/admin/admin.api';
import { AdminWorkspaceNav } from '../features/admin/components/AdminWorkspaceNav';

const PAGE_LIMIT = 20;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

const reviewSortLabels: Record<AdminReviewSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  rating_highest: 'Highest rating',
  rating_lowest: 'Lowest rating',
  recently_moderated: 'Recently moderated',
};

const reviewVisibilityLabels: Record<AdminReviewVisibility, string> = {
  all: 'All reviews',
  visible: 'Visible reviews',
  hidden: 'Hidden reviews',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={
            index < value
              ? 'size-4 fill-[#b1843f] text-[#b1843f]'
              : 'size-4 text-[var(--color-charcoal)]/18'
          }
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  onView,
}: {
  review: AdminReview;
  onView: (reviewId: string) => void;
}) {
  return (
    <article className="group flex h-full flex-col rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/76 p-4 shadow-[0_14px_36px_rgba(64,42,51,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(91,61,82,0.16)] hover:shadow-[0_18px_42px_rgba(64,42,51,0.09)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <StarRating value={review.overallRating} />

          <h3 className="mt-3 text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
            {review.vendor.businessName}
          </h3>

          <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/52">
            Reviewed by {review.customer.firstName} {review.customer.lastName}
          </p>
        </div>

        <span
          className="status-chip shrink-0"
          data-tone={review.isHidden ? 'danger' : 'success'}
        >
          {review.isHidden ? 'Hidden' : 'Visible'}
        </span>
      </div>

      <div className="mt-3 flex-1 rounded-[1rem] border border-[rgba(91,61,82,0.07)] bg-[rgba(248,246,248,0.72)] px-3.5 py-3">
        <p className="line-clamp-3 text-xs font-medium leading-5 text-[var(--color-charcoal)]/66">
          {review.comment ?? 'No written review was provided.'}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[0.95rem] bg-[rgba(248,246,248,0.78)] px-3 py-2.5">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/40">
            Package
          </p>

          <p className="mt-1 truncate text-xs font-bold text-[var(--color-near-black)]">
            {review.package?.title ?? 'No package linked'}
          </p>
        </div>

        <div className="rounded-[0.95rem] bg-[rgba(248,246,248,0.78)] px-3 py-2.5">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/40">
            Submitted
          </p>

          <p className="mt-1 text-xs font-bold text-[var(--color-near-black)]">
            {formatDate(review.createdAt)}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-[rgba(91,61,82,0.12)] bg-[rgba(183,167,200,0.09)] px-4 text-xs font-black text-[var(--color-deep-plum)] transition hover:border-[rgba(91,61,82,0.20)] hover:bg-[rgba(183,167,200,0.16)]"
        onClick={() => onView(review.id)}
      >
        Review moderation
      </button>
    </article>
  );
}

function DetailCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Star;
}) {
  return (
    <div className="rounded-[1rem] bg-[rgba(248,246,248,0.78)] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
          <Icon className="size-3.5" />
        </div>

        <div className="min-w-0">
          <p className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/40">
            {label}
          </p>

          <p className="mt-0.5 truncate text-xs font-bold leading-5 text-[var(--color-near-black)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminReviewsPage() {
  const queryClient = useQueryClient();

  const [visibility, setVisibility] = useState<AdminReviewVisibility>('all');
  const [rating, setRating] = useState<number | 'ALL'>('ALL');
  const [sort, setSort] = useState<AdminReviewSort>('newest');
  const [page, setPage] = useState(1);

  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [moderationReason, setModerationReason] = useState('');

  const reviewsQuery = useQuery({
    queryKey: [
      'admin',
      'reviews',
      {
        page,
        visibility,
        rating,
        sort,
      },
    ],
    queryFn: () =>
      getAdminReviews({
        page,
        limit: PAGE_LIMIT,
        visibility,
        overallRating: rating === 'ALL' ? undefined : rating,
        sort,
      }),
  });

  const reviewDetailQuery = useQuery({
    queryKey: ['admin', 'reviews', selectedReviewId],
    queryFn: () => getAdminReviewById(selectedReviewId as string),
    enabled: Boolean(selectedReviewId),
  });

  const moderationMutation = useMutation({
    mutationFn: ({
      reviewId,
      action,
      reason,
    }: {
      reviewId: string;
      action: 'HIDE' | 'RESTORE';
      reason: string;
    }) =>
      moderateAdminReview(reviewId, {
        action,
        reason,
      }),

    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'reviews'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'reviews', variables.reviewId],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'dashboard', 'summary'],
      });

      setShowModerationDialog(false);
      setModerationReason('');
    },
  });

  const reviews = reviewsQuery.data?.reviews ?? [];
  const pagination = reviewsQuery.data?.pagination;
  const selectedReview = reviewDetailQuery.data;

  const summary = useMemo(() => {
    return {
      total: pagination?.total ?? reviews.length,
      visible: reviews.filter((review) => !review.isHidden).length,
      hidden: reviews.filter((review) => review.isHidden).length,
      fiveStar: reviews.filter((review) => review.overallRating === 5).length,
    };
  }, [pagination?.total, reviews]);

  function openReview(reviewId: string) {
    moderationMutation.reset();
    setSelectedReviewId(reviewId);
  }

  function closeReview() {
    if (moderationMutation.isPending) {
      return;
    }

    moderationMutation.reset();
    setSelectedReviewId(null);
    setShowModerationDialog(false);
    setModerationReason('');
  }

  function openModerationDialog() {
    moderationMutation.reset();
    setModerationReason('');
    setShowModerationDialog(true);
  }

  function submitModeration() {
    if (!selectedReview || moderationReason.trim().length < 10) {
      return;
    }

    moderationMutation.mutate({
      reviewId: selectedReview.id,
      action: selectedReview.isHidden ? 'RESTORE' : 'HIDE',
      reason: moderationReason.trim(),
    });
  }

  function clearFilters() {
    setVisibility('all');
    setRating('ALL');
    setSort('newest');
    setPage(1);
  }

  const filtersAreActive = visibility !== 'all' || rating !== 'ALL' || sort !== 'newest';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(183,167,200,0.12),transparent_30%),linear-gradient(135deg,#fbf9fa_0%,#f7f3f6_48%,#f5f3f8_100%)]">
  <div className="workspace-container">
    <AdminWorkspaceNav />

    <main className="py-4">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(91,61,82,0.10)] bg-[linear-gradient(135deg,rgba(255,255,255,0.90),rgba(247,242,247,0.90),rgba(241,237,246,0.82))] px-6 py-5 shadow-[0_18px_50px_rgba(64,42,51,0.07)] sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full border border-[rgba(91,61,82,0.06)]" />
        <div className="pointer-events-none absolute -right-6 -top-12 size-40 rounded-full border border-[rgba(91,61,82,0.05)]" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(91,61,82,0.10)] bg-white/72 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.19em] text-[var(--color-deep-plum)]">
              <Star className="size-3.5" />
              Review moderation
            </div>

            <h1 className="mt-3 max-w-4xl text-balance text-[2.25rem] font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.7rem]">
              Keep marketplace reviews fair and useful.
            </h1>

            <p className="mt-2.5 max-w-2xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/62">
              Inspect customer feedback, ratings, moderation history, and linked booking details
              before hiding or restoring a review.
            </p>
          </div>

          <div className="w-full shrink-0 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-white/72 px-4 py-3.5 shadow-[0_10px_26px_rgba(64,42,51,0.05)] lg:w-[180px]">
            <p className="text-[0.58rem] font-black uppercase tracking-[0.15em] text-slate-400">
              Matching reviews
            </p>

            <div className="mt-1.5 flex items-center justify-between gap-3">
              <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                {reviewsQuery.isLoading ? '—' : summary.total}
              </p>

              <div className="grid size-8 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                <MessageSquareText className="size-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {reviewsQuery.isLoading ? (
        <section className="state-surface mt-4">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading review records
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
              Preparing customer feedback and moderation information.
            </p>
          </div>
        </section>
      ) : reviewsQuery.isError ? (
        <section className="state-surface mt-4">
          <div className="max-w-lg">
            <div className="icon-tile mx-auto">
              <AlertCircle className="size-6" />
            </div>

            <h2 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Reviews could not be loaded
            </h2>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(
                reviewsQuery.error,
                'We could not load the review directory.',
              )}
            </p>

            <button
              type="button"
              className="btn-primary mt-6 text-sm"
              onClick={() => reviewsQuery.refetch()}
            >
              Try again
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_36px_rgba(64,42,51,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                  <MessageSquareText className="size-4" />
                </div>

                <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  {summary.total}
                </p>
              </div>

              <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                Total matching
              </p>
            </article>

            <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_36px_rgba(64,42,51,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Eye className="size-4" />
                </div>

                <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  {summary.visible}
                </p>
              </div>

              <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                Visible on this page
              </p>
            </article>

            <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_36px_rgba(64,42,51,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-700">
                  <EyeOff className="size-4" />
                </div>

                <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  {summary.hidden}
                </p>
              </div>

              <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                Hidden on this page
              </p>
            </article>

            <article className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3.5 shadow-[0_14px_36px_rgba(64,42,51,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                </div>

                <p className="text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  {summary.fiveStar}
                </p>
              </div>

              <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                Five-star on this page
              </p>
            </article>
          </section>

          <section className="mt-4 rounded-[1.75rem] border border-[rgba(91,61,82,0.09)] bg-white/80 p-4 shadow-[0_18px_50px_rgba(64,42,51,0.06)] backdrop-blur sm:p-5">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div>
                <p className="section-eyebrow">Review directory</p>

                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                  Filter marketplace feedback
                </h2>

                <p className="mt-1 text-xs font-medium leading-5 text-[var(--color-charcoal)]/54">
                  Narrow review records by visibility, overall rating, or moderation order.
                </p>
              </div>

              {filtersAreActive ? (
                <button
                  type="button"
                  className="btn-secondary min-h-0 px-4 py-2 text-xs"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <select
                className="form-field min-h-10 py-2 text-sm"
                value={visibility}
                onChange={(event) => {
                  setVisibility(event.target.value as AdminReviewVisibility);
                  setPage(1);
                }}
              >
                {adminReviewVisibilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {reviewVisibilityLabels[option]}
                  </option>
                ))}
              </select>

              <select
                className="form-field min-h-10 py-2 text-sm"
                value={rating}
                onChange={(event) => {
                  const value = event.target.value;

                  setRating(value === 'ALL' ? 'ALL' : Number(value));
                  setPage(1);
                }}
              >
                <option value="ALL">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>

              <select
                className="form-field min-h-10 py-2 text-sm"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as AdminReviewSort);
                  setPage(1);
                }}
              >
                {adminReviewSortOptions.map((option) => (
                  <option key={option} value={option}>
                    {reviewSortLabels[option]}
                  </option>
                ))}
              </select>
            </div>

            {reviews.length > 0 ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} onView={openReview} />
                ))}
              </div>
            ) : (
              <div className="empty-surface mt-4">
                <Star className="mx-auto size-9 text-[var(--color-deep-plum)]/64" />

                <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                  No reviews match these filters
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                  Change the rating, visibility, or sort order to explore other review records.
                </p>

                {filtersAreActive ? (
                  <button
                    type="button"
                    className="btn-secondary mt-5 text-sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            )}

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-[rgba(91,61,82,0.08)] bg-[rgba(183,167,200,0.07)] px-4 py-3 sm:flex-row">
                <p className="text-xs font-semibold text-[var(--color-charcoal)]/58">
                  Page{' '}
                  <span className="font-black text-[var(--color-near-black)]">
                    {pagination.page}
                  </span>{' '}
                  of{' '}
                  <span className="font-black text-[var(--color-near-black)]">
                    {pagination.totalPages}
                  </span>
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary min-h-0 px-3.5 py-2 text-xs"
                    disabled={!pagination.hasPreviousPage || reviewsQuery.isFetching}
                    onClick={() =>
                      setPage((currentPage) => Math.max(1, currentPage - 1))
                    }
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    className="btn-secondary min-h-0 px-3.5 py-2 text-xs"
                    disabled={!pagination.hasNextPage || reviewsQuery.isFetching}
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}
    </main>
  </div>

      {selectedReviewId ? (
  <div
    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-5 backdrop-blur-md"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        closeReview();
      }
    }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-review-detail-title"
      className="max-h-[94vh] w-full max-w-[76rem] overflow-y-auto rounded-[1.8rem] border border-[rgba(91,61,82,0.10)] bg-[#fdfbfc] p-4 shadow-[0_28px_90px_rgba(64,42,51,0.20)] sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">Review record</p>

          <h2
            id="admin-review-detail-title"
            className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
          >
            Review moderation
          </h2>
        </div>

        <button
          type="button"
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-[rgba(91,61,82,0.10)] bg-white text-zinc-600 transition hover:bg-[rgba(183,167,200,0.08)] hover:text-[var(--color-deep-plum)]"
          onClick={closeReview}
          aria-label="Close review details"
        >
          <X className="size-4" />
        </button>
      </div>

      {reviewDetailQuery.isLoading ? (
        <div className="state-surface mt-4 min-h-64">
          <div>
            <LoaderCircle className="mx-auto size-9 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-4 font-black text-[var(--color-near-black)]">
              Loading review details
            </p>
          </div>
        </div>
      ) : reviewDetailQuery.isError ? (
        <div className="feedback-surface mt-4" data-tone="danger">
          {getErrorMessage(
            reviewDetailQuery.error,
            'We could not load this review record.',
          )}
        </div>
      ) : selectedReview ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.25rem] border border-[rgba(91,61,82,0.09)] bg-white/78 px-4 py-3">
            <div className="flex min-w-0 items-center gap-4">
              <StarRating value={selectedReview.overallRating} />

              <div className="min-w-0 border-l border-[rgba(91,61,82,0.10)] pl-4">
                <h3 className="truncate text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                  {selectedReview.vendor.businessName}
                </h3>

                <p className="mt-0.5 text-xs font-semibold text-[var(--color-charcoal)]/52">
                  Reviewed by {selectedReview.customer.firstName}{' '}
                  {selectedReview.customer.lastName}
                </p>
              </div>
            </div>

            <span
              className="status-chip shrink-0"
              data-tone={selectedReview.isHidden ? 'danger' : 'success'}
            >
              {selectedReview.isHidden ? 'Hidden' : 'Visible'}
            </span>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <section className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/78 p-4">
              <p className="section-eyebrow">Customer feedback</p>

              <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                Review content
              </h3>

              <div className="mt-3 rounded-[1rem] bg-[rgba(248,246,248,0.78)] px-3.5 py-3">
                <p className="whitespace-pre-wrap text-xs font-medium leading-5 text-[var(--color-charcoal)]/68">
                  {selectedReview.comment ?? 'No written review was provided.'}
                </p>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <DetailCard
                  icon={Star}
                  label="Overall rating"
                  value={`${selectedReview.overallRating}/5`}
                />

                <DetailCard
                  icon={Star}
                  label="Service rating"
                  value={
                    selectedReview.serviceRating === null
                      ? 'Not provided'
                      : `${selectedReview.serviceRating}/5`
                  }
                />

                <DetailCard
                  icon={Star}
                  label="Communication rating"
                  value={
                    selectedReview.communicationRating === null
                      ? 'Not provided'
                      : `${selectedReview.communicationRating}/5`
                  }
                />

                <DetailCard
                  icon={UserRound}
                  label="Customer"
                  value={`${selectedReview.customer.firstName} ${selectedReview.customer.lastName}`}
                />

                <DetailCard
                  icon={Store}
                  label="Vendor"
                  value={selectedReview.vendor.businessName}
                />

                <DetailCard
                  icon={Package}
                  label="Package"
                  value={selectedReview.package?.title ?? 'No package linked'}
                />
              </div>
            </section>

            <section className="rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/78 p-4">
              <p className="section-eyebrow">Booking context</p>

              <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                Linked service
              </h3>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <DetailCard
                  icon={CheckCircle2}
                  label="Booking status"
                  value={selectedReview.booking.status.replaceAll('_', ' ')}
                />

                <DetailCard
                  icon={History}
                  label="Service start"
                  value={formatDateTime(selectedReview.booking.serviceStart)}
                />

                <DetailCard
                  icon={History}
                  label="Service end"
                  value={formatDateTime(selectedReview.booking.serviceEnd)}
                />

                <DetailCard
                  icon={History}
                  label="Review created"
                  value={formatDateTime(selectedReview.createdAt)}
                />

                <DetailCard
                  icon={History}
                  label="Last updated"
                  value={formatDateTime(selectedReview.updatedAt)}
                />

                <DetailCard
                  icon={History}
                  label="Last moderated"
                  value={formatDateTime(selectedReview.moderatedAt)}
                />
              </div>

              {selectedReview.moderationReason ? (
                <div
                  className="mt-3 rounded-[1rem] border px-3.5 py-2.5"
                  data-tone={selectedReview.isHidden ? 'warning' : 'info'}
                  style={{
                    background: selectedReview.isHidden
                      ? 'rgba(255,247,226,0.72)'
                      : 'rgba(239,246,255,0.72)',
                    borderColor: selectedReview.isHidden
                      ? 'rgba(180,130,40,0.18)'
                      : 'rgba(59,130,246,0.14)',
                  }}
                >
                  <p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                    Current moderation reason
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/68">
                    {selectedReview.moderationReason}
                  </p>
                </div>
              ) : null}
            </section>
          </div>

          <section className="mt-3 rounded-[1.35rem] border border-[rgba(91,61,82,0.09)] bg-white/78 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-eyebrow">Moderation history</p>

                <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                  Previous actions
                </h3>
              </div>

              {selectedReview.moderationActions.length > 0 ? (
                <span className="rounded-full bg-[rgba(183,167,200,0.12)] px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--color-deep-plum)]">
                  {selectedReview.moderationActions.length}{' '}
                  {selectedReview.moderationActions.length === 1
                    ? 'action'
                    : 'actions'}
                </span>
              ) : null}
            </div>

            {selectedReview.moderationActions.length > 0 ? (
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {selectedReview.moderationActions.map((action) => (
                  <article
                    key={action.id}
                    className="rounded-[1rem] bg-[rgba(248,246,248,0.78)] px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[var(--color-near-black)]">
                          Review {action.action.toLowerCase()}
                        </p>

                        <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/52">
                          By {action.moderator.firstName}{' '}
                          {action.moderator.lastName}
                        </p>
                      </div>

                      <p className="shrink-0 text-[0.64rem] font-semibold text-[var(--color-charcoal)]/44">
                        {formatDateTime(action.createdAt)}
                      </p>
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-[var(--color-charcoal)]/66">
                      {action.reason}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-3 rounded-[1rem] bg-[rgba(248,246,248,0.78)] px-3.5 py-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                  <History className="size-3.5" />
                </div>

                <p className="text-xs font-semibold text-[var(--color-charcoal)]/56">
                  This review has no previous moderation actions.
                </p>
              </div>
            )}
          </section>

          {moderationMutation.isError ? (
            <div
              className="feedback-surface mt-3"
              data-tone="danger"
              role="alert"
            >
              {getErrorMessage(
                moderationMutation.error,
                'We could not moderate this review.',
              )}
            </div>
          ) : null}

          <div className="mt-3 flex flex-col justify-between gap-3 border-t border-[rgba(91,61,82,0.10)] pt-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black text-[var(--color-near-black)]">
                Moderation control
              </p>

              <p className="mt-0.5 max-w-2xl text-[0.68rem] font-medium leading-4 text-[var(--color-charcoal)]/52">
                {selectedReview.isHidden
                  ? 'Restoring makes the review publicly visible again.'
                  : 'Hiding removes the review from public vendor profiles while preserving its moderation history.'}
              </p>
            </div>

            <button
              type="button"
              className={
                selectedReview.isHidden
                  ? 'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-92'
                  : 'btn-danger min-h-10 shrink-0 text-sm'
              }
              disabled={moderationMutation.isPending}
              onClick={openModerationDialog}
            >
              {selectedReview.isHidden ? (
                <>
                  <RotateCcw className="size-4" />
                  Restore review
                </>
              ) : (
                <>
                  <EyeOff className="size-4" />
                  Hide review
                </>
              )}
            </button>
          </div>
        </>
      ) : null}
    </section>
  </div>
) : null}

      {showModerationDialog && selectedReview ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !moderationMutation.isPending) {
              setShowModerationDialog(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-review-moderation-title"
            className="w-full max-w-lg rounded-[2rem] border border-violet-100 bg-[#fdfaff] p-6 shadow-[0_28px_90px_rgba(88,28,135,0.18)]"
          >
            <div
              className={
                selectedReview.isHidden
                  ? 'grid size-12 place-items-center rounded-2xl bg-green-50 text-green-700'
                  : 'grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700'
              }
            >
              {selectedReview.isHidden ? (
                <RotateCcw className="size-5" />
              ) : (
                <EyeOff className="size-5" />
              )}
            </div>

            <h2
              id="admin-review-moderation-title"
              className="mt-5 text-2xl font-black text-[var(--color-near-black)]"
            >
              {selectedReview.isHidden ? 'Restore this review?' : 'Hide this review?'}
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/64">
              {selectedReview.isHidden
                ? 'Explain why this review is suitable to return to the public vendor profile.'
                : 'Explain why this review should no longer be publicly visible.'}
            </p>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                Moderation reason
              </span>

              <textarea
                className="form-field min-h-32"
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
                placeholder={
                  selectedReview.isHidden
                    ? 'Explain why the review is being restored.'
                    : 'Explain why the review is being hidden.'
                }
                aria-invalid={moderationReason.length > 0 && moderationReason.trim().length < 10}
                disabled={moderationMutation.isPending}
              />

              <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/48">
                Minimum 10 characters.
              </span>
            </label>

            {moderationMutation.isError ? (
              <div className="feedback-surface mt-5" data-tone="danger" role="alert">
                {getErrorMessage(moderationMutation.error, 'We could not update this review.')}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={moderationMutation.isPending}
                onClick={() => {
                  setShowModerationDialog(false);
                  setModerationReason('');
                }}
              >
                Cancel
              </button>

              <button
  type="button"
  className={
    selectedReview.isHidden
      ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-50'
      : 'btn-danger text-sm'
  }
  disabled={moderationMutation.isPending || moderationReason.trim().length < 10}
  onClick={submitModeration}
>
  {moderationMutation.isPending ? (
    <LoaderCircle className="size-4 animate-spin" />
  ) : selectedReview.isHidden ? (
    <RotateCcw className="size-4" />
  ) : (
    <EyeOff className="size-4" />
  )}

  {moderationMutation.isPending
    ? 'Updating...'
    : selectedReview.isHidden
      ? 'Restore review'
      : 'Hide review'}
</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
