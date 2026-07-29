import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Package,
  Star,
  UserRound,
} from 'lucide-react';
import {
  getPublicVendorReviews,
  getVendorOnboardingProfile,
  vendorReviewSortOptions,
  type VendorReview,
  type VendorReviewSort,
} from '../features/vendors/vendor.api';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';
import { Link } from 'react-router-dom';

const PAGE_LIMIT = 8;

const sortLabels: Record<VendorReviewSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  rating_highest: 'Highest rated',
  rating_lowest: 'Lowest rated',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatAverage(value: number | null) {
  return value === null ? '—' : value.toFixed(1);
}

function getCustomerName(review: VendorReview) {
  return [review.customer.firstName, review.customer.lastNameInitial].filter(Boolean).join(' ');
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const responseData = error.response.data;

    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'message' in responseData &&
      typeof responseData.message === 'string'
    ) {
      return responseData.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to load vendor reviews right now.';
}

function RatingStars({ rating, size = 'small' }: { rating: number; size?: 'small' | 'large' }) {
  const iconClassName = size === 'large' ? 'h-6 w-6' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < rating;

        return (
          <Star
            key={index}
            className={`${iconClassName} ${
              filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-zinc-300'
            }`}
          />
        );
      })}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="glass-card group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(64,42,51,0.1)]">
      <div className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl transition duration-300 group-hover:bg-[rgba(183,167,200,0.2)]" />

      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
          {label}
        </p>

        <p className="mt-4 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
          {value}
        </p>

        <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/58">{description}</p>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: VendorReview }) {
  return (
    <article className="glass-card group relative overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(64,42,51,0.1)]">
      <div className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl transition duration-300 group-hover:bg-[rgba(183,167,200,0.2)]" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
            <UserRound className="size-5" />
          </div>

          <div>
            <p className="font-black tracking-[-0.02em] text-[var(--color-near-black)]">
              {getCustomerName(review) || 'Verified customer'}
            </p>

            <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/42">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-white/65 bg-white/45 px-3.5 py-2 shadow-sm backdrop-blur-xl">
          <RatingStars rating={review.overallRating} />

          <span className="text-sm font-black text-[var(--color-near-black)]">
            {review.overallRating}.0
          </span>
        </div>
      </div>

      {review.comment ? (
        <div className="relative mt-5 rounded-[1.35rem] border border-white/65 bg-white/45 p-5 shadow-inner">
          <MessageSquareText className="size-5 text-[var(--color-rosewood)]" />

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--color-charcoal)]/64">
            {review.comment}
          </p>
        </div>
      ) : (
        <div className="relative mt-5 rounded-[1.35rem] border border-dashed border-white/80 bg-white/35 p-5">
          <p className="text-sm leading-6 text-[var(--color-charcoal)]/54">
            The customer submitted ratings without a written comment.
          </p>
        </div>
      )}

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/65 bg-white/48 p-4 shadow-inner">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
            Overall
          </p>

          <p className="mt-2 text-lg font-black text-[var(--color-near-black)]">
            {review.overallRating}/5
          </p>
        </div>

        <div className="rounded-2xl border border-white/65 bg-white/48 p-4 shadow-inner">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
            Service
          </p>

          <p className="mt-2 text-lg font-black text-[var(--color-near-black)]">
            {review.serviceRating === null ? 'Not rated' : `${review.serviceRating}/5`}
          </p>
        </div>

        <div className="rounded-2xl border border-white/65 bg-white/48 p-4 shadow-inner">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
            Communication
          </p>

          <p className="mt-2 text-lg font-black text-[var(--color-near-black)]">
            {review.communicationRating === null ? 'Not rated' : `${review.communicationRating}/5`}
          </p>
        </div>
      </div>

      {review.package && (
        <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-white/65 bg-white/48 p-4 shadow-inner">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(122,80,99,0.1)] text-[var(--color-rosewood)]">
            <Package className="size-4" />
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--color-charcoal)]/42">
              Reviewed package
            </p>

            <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
              {review.package.title}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function ReviewSkeleton() {
  return (
    <div className="glass-card animate-pulse p-6">
      <div className="flex justify-between gap-4">
        <div className="flex gap-4">
          <div className="size-11 rounded-2xl bg-white/60" />

          <div>
            <div className="h-4 w-28 rounded-full bg-white/65" />
            <div className="mt-2 h-3 w-20 rounded-full bg-white/50" />
          </div>
        </div>

        <div className="h-9 w-28 rounded-full bg-white/55" />
      </div>

      <div className="mt-6 h-28 rounded-[1.35rem] bg-white/45" />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="h-20 rounded-2xl bg-white/45" />
        <div className="h-20 rounded-2xl bg-white/45" />
        <div className="h-20 rounded-2xl bg-white/45" />
      </div>

      <div className="mt-5 h-16 rounded-2xl bg-white/45" />
    </div>
  );
}

export function VendorReviewsPage() {
  const [sort, setSort] = useState<VendorReviewSort>('newest');
  const [page, setPage] = useState(1);

  const onboardingQuery = useQuery({
    queryKey: ['vendor-onboarding'],
    queryFn: getVendorOnboardingProfile,
  });

  const vendorSlug = onboardingQuery.data?.profile.slug;

  const reviewsQuery = useQuery({
    queryKey: ['vendor-reviews', vendorSlug, sort, page],
    queryFn: () =>
      getPublicVendorReviews(vendorSlug as string, {
        page,
        limit: PAGE_LIMIT,
        sort,
      }),
    enabled: Boolean(vendorSlug),
  });

  const reviews = reviewsQuery.data?.reviews ?? [];
  const summary = reviewsQuery.data?.summary;
  const pagination = reviewsQuery.data?.pagination;

  const totalReviews = summary?.totalReviews ?? 0;
  const maximumBreakdownValue = summary
    ? Math.max(...Object.values(summary.ratingBreakdown), 1)
    : 1;

  function handleSortChange(nextSort: VendorReviewSort) {
    setSort(nextSort);
    setPage(1);
  }

  return (
    <main className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <p className="mt-1 font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                Customer reviews
              </p>
            </div>
          </div>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <section className="glass-card relative mt-10 overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/42 px-4 py-2 text-sm font-black text-[var(--color-rosewood)] shadow-sm backdrop-blur-xl">
                <Star className="size-4 fill-current" />
                Reviews
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl lg:text-5xl">
                Customer feedback
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                See how customers rate your completed work, monitor feedback trends, and understand
                where your service creates the strongest impression.
              </p>
            </div>

            <div className="relative min-w-[230px] overflow-hidden rounded-[1.6rem] border border-white/65 bg-white/42 p-5 shadow-[0_18px_46px_rgba(64,42,51,0.08)] backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[rgba(183,167,200,0.18)] blur-2xl" />

              <div className="relative flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]">
                  <MessageSquareText className="size-5" />
                </div>

                <div>
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {onboardingQuery.isLoading || reviewsQuery.isLoading ? '—' : totalReviews}
                  </p>

                  <p className="mt-1 text-xs font-bold leading-5 text-[var(--color-charcoal)]/52">
                    Verified customer reviews
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {onboardingQuery.isError ? (
          <section className="glass-card relative mt-6 overflow-hidden p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-red-100/70 blur-3xl" />

            <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="size-6" />
            </div>

            <h2 className="relative mt-5 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              Vendor profile could not be loaded
            </h2>

            <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--color-charcoal)]/62">
              {getErrorMessage(onboardingQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => onboardingQuery.refetch()}
              className="relative mt-6 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
            >
              Try again
            </button>
          </section>
        ) : onboardingQuery.isLoading || reviewsQuery.isLoading ? (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="glass-card h-36 animate-pulse" />
              ))}
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <ReviewSkeleton key={index} />
              ))}
            </section>
          </>
        ) : reviewsQuery.isError ? (
          <section className="glass-card relative mt-6 overflow-hidden p-8 text-center sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-red-100/70 blur-3xl" />

            <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="size-6" />
            </div>

            <h2 className="relative mt-5 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              Reviews could not be loaded
            </h2>

            <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--color-charcoal)]/62">
              {getErrorMessage(reviewsQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => reviewsQuery.refetch()}
              className="relative mt-6 rounded-2xl bg-[var(--color-deep-plum)] px-5 py-3 text-sm font-black text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)]"
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Overall rating"
                value={formatAverage(summary?.averageOverallRating ?? null)}
                description="Average verified customer score"
              />

              <MetricCard
                label="Service rating"
                value={formatAverage(summary?.averageServiceRating ?? null)}
                description="Average quality-of-service score"
              />

              <MetricCard
                label="Communication"
                value={formatAverage(summary?.averageCommunicationRating ?? null)}
                description="Average customer communication score"
              />

              <MetricCard
                label="Verified reviews"
                value={String(totalReviews)}
                description="Reviews from completed bookings"
              />
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
              <div className="glass-card relative overflow-hidden p-6 sm:p-7">
                <div className="pointer-events-none absolute -left-16 -top-20 size-48 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl" />

                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42">
                    Rating breakdown
                  </p>

                  <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                    <p className="text-5xl font-black tracking-[-0.055em] text-[var(--color-near-black)]">
                      {formatAverage(summary?.averageOverallRating ?? null)}
                    </p>

                    <div>
                      {summary?.averageOverallRating ? (
                        <RatingStars
                          rating={Math.round(summary.averageOverallRating)}
                          size="large"
                        />
                      ) : (
                        <RatingStars rating={0} size="large" />
                      )}

                      <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/52">
                        Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 space-y-4">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = summary?.ratingBreakdown[rating as 1 | 2 | 3 | 4 | 5] ?? 0;
                      const widthPercentage = (count / maximumBreakdownValue) * 100;

                      return (
                        <div
                          key={rating}
                          className="grid grid-cols-[52px_1fr_34px] items-center gap-3"
                        >
                          <div className="flex items-center gap-1 text-sm font-black text-[var(--color-near-black)]">
                            {rating}
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          </div>

                          <div className="h-2.5 overflow-hidden rounded-full bg-white/55 shadow-inner">
                            <div
                              className="h-full rounded-full bg-[var(--color-deep-plum)] transition-all duration-500"
                              style={{
                                width: `${widthPercentage}%`,
                              }}
                            />
                          </div>

                          <p className="text-right text-sm font-semibold text-[var(--color-charcoal)]/52">
                            {count}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="glass-card relative overflow-hidden p-6 sm:p-7">
                <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />

                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42">
                      Review insights
                    </p>

                    <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                      Understanding your feedback
                    </h2>
                  </div>

                  <select
                    value={sort}
                    onChange={(event) => handleSortChange(event.target.value as VendorReviewSort)}
                    className="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm font-black text-[var(--color-near-black)] outline-none shadow-sm transition duration-300 focus:border-[rgba(183,167,200,0.75)] focus:bg-white focus:ring-4 focus:ring-[rgba(183,167,200,0.18)]"
                  >
                    {vendorReviewSortOptions.map((sortOption) => (
                      <option key={sortOption} value={sortOption}>
                        {sortLabels[sortOption]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-white/65 bg-white/45 p-5 shadow-inner">
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Verified feedback only
                    </p>

                    <p className="mt-2 text-sm leading-7 text-[var(--color-charcoal)]/60">
                      Reviews shown here come from customers with completed bookings and exclude
                      hidden moderation records.
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] border border-white/65 bg-white/45 p-5 shadow-inner">
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Read-only vendor view
                    </p>

                    <p className="mt-2 text-sm leading-7 text-[var(--color-charcoal)]/60">
                      The current backend does not yet support vendor replies, editing, or removal
                      of customer feedback.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6">
              {reviews.length === 0 ? (
                <div className="glass-card relative overflow-hidden p-10 text-center sm:p-14">
                  <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-[rgba(214,190,177,0.12)] blur-3xl" />

                  <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-deep-plum)] text-white shadow-[0_14px_34px_rgba(91,61,82,0.2)]">
                    <Star className="size-6" />
                  </div>

                  <h2 className="relative mt-5 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                    No verified reviews yet
                  </h2>

                  <p className="relative mx-auto mt-3 max-w-lg text-sm leading-7 text-[var(--color-charcoal)]/60">
                    Customer reviews will appear here after completed bookings are reviewed and
                    remain publicly visible.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 xl:grid-cols-2">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="glass-card relative mt-8 flex flex-col items-center justify-between gap-4 overflow-hidden px-5 py-4 sm:flex-row">
                      <div className="pointer-events-none absolute -right-12 -top-14 size-32 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl" />

                      <div className="relative">
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Showing {reviews.length} of {pagination.total} reviews
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                          Page {pagination.page} of {pagination.totalPages}
                        </p>
                      </div>

                      <div className="relative flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!pagination.hasPreviousPage}
                          onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/65 px-4 py-2.5 text-sm font-black text-[var(--color-near-black)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                        >
                          <ChevronLeft className="size-4" />
                          Previous
                        </button>

                        <button
                          type="button"
                          disabled={!pagination.hasNextPage}
                          onClick={() => setPage((currentPage) => currentPage + 1)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-deep-plum)] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_28px_rgba(91,61,82,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                        >
                          Next
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
