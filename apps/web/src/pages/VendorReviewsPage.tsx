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
    <div className="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-[0_14px_45px_rgba(64,42,51,0.06)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">{label}</p>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#34282e]">{value}</p>

      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function ReviewCard({ review }: { review: VendorReview }) {
  return (
    <article className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
            <UserRound className="h-5 w-5" />
          </div>

          <div>
            <p className="font-semibold text-[#34282e]">
              {getCustomerName(review) || 'Verified customer'}
            </p>

            <p className="mt-1 text-xs font-medium text-zinc-400">{formatDate(review.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RatingStars rating={review.overallRating} />

          <span className="text-sm font-semibold text-zinc-700">{review.overallRating}.0</span>
        </div>
      </div>

      {review.comment ? (
        <div className="mt-5 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-5">
          <MessageSquareText className="h-5 w-5 text-rose-700" />

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600">
            {review.comment}
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-[#faf8f7] p-5">
          <p className="text-sm text-zinc-500">
            The customer submitted ratings without a written comment.
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Overall</p>

          <p className="mt-2 text-lg font-semibold text-[#34282e]">{review.overallRating}/5</p>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Service</p>

          <p className="mt-2 text-lg font-semibold text-[#34282e]">
            {review.serviceRating === null ? 'Not rated' : `${review.serviceRating}/5`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Communication
          </p>

          <p className="mt-2 text-lg font-semibold text-[#34282e]">
            {review.communicationRating === null ? 'Not rated' : `${review.communicationRating}/5`}
          </p>
        </div>
      </div>

      {review.package && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4">
          <Package className="h-4 w-4 shrink-0 text-rose-700" />

          <div>
            <p className="text-xs font-medium text-zinc-400">Reviewed package</p>

            <p className="mt-1 text-sm font-semibold text-zinc-700">{review.package.title}</p>
          </div>
        </div>
      )}
    </article>
  );
}

function ReviewSkeleton() {
  return (
    <div className="animate-pulse rounded-[28px] border border-white/80 bg-white/80 p-6">
      <div className="flex justify-between gap-4">
        <div className="flex gap-3">
          <div className="h-11 w-11 rounded-2xl bg-zinc-200" />

          <div>
            <div className="h-4 w-28 rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-20 rounded bg-zinc-200" />
          </div>
        </div>

        <div className="h-4 w-24 rounded bg-zinc-200" />
      </div>

      <div className="mt-6 h-28 rounded-2xl bg-zinc-100" />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="h-20 rounded-2xl bg-zinc-100" />
        <div className="h-20 rounded-2xl bg-zinc-100" />
        <div className="h-20 rounded-2xl bg-zinc-100" />
      </div>
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

        <section className="glass-card mt-10 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                <Star className="h-4 w-4 fill-current" />
                Reviews
              </div>

              <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[#2e2529] sm:text-4xl">
                Customer feedback
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
                See how customers rate your completed work, monitor trends over time, and understand
                where your service stands out.
              </p>
            </div>

            <div className="rounded-2xl border border-white/55 bg-white/28 px-5 py-4">
              <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                {onboardingQuery.isLoading || reviewsQuery.isLoading ? '—' : totalReviews}
              </p>

              <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">
                Verified customer reviews
              </p>
            </div>
          </div>
        </section>

        {onboardingQuery.isError ? (
          <section className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h2 className="mt-4 text-lg font-semibold text-red-900">
              Vendor profile could not be loaded
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
              {getErrorMessage(onboardingQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => onboardingQuery.refetch()}
              className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Try again
            </button>
          </section>
        ) : onboardingQuery.isLoading || reviewsQuery.isLoading ? (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-[24px] border border-white/80 bg-white/75"
                />
              ))}
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <ReviewSkeleton key={index} />
              ))}
            </section>
          </>
        ) : reviewsQuery.isError ? (
          <section className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h2 className="mt-4 text-lg font-semibold text-red-900">Reviews could not be loaded</h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
              {getErrorMessage(reviewsQuery.error)}
            </p>

            <button
              type="button"
              onClick={() => reviewsQuery.refetch()}
              className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
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

            <section className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
              <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Rating Breakdown
                </p>

                <div className="mt-5 flex items-center gap-4">
                  <p className="text-5xl font-semibold tracking-tight text-[#34282e]">
                    {formatAverage(summary?.averageOverallRating ?? null)}
                  </p>

                  <div>
                    {summary?.averageOverallRating ? (
                      <RatingStars rating={Math.round(summary.averageOverallRating)} size="large" />
                    ) : (
                      <RatingStars rating={0} size="large" />
                    )}

                    <p className="mt-2 text-sm text-zinc-500">
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
                        className="grid grid-cols-[50px_1fr_32px] items-center gap-3"
                      >
                        <div className="flex items-center gap-1 text-sm font-semibold text-zinc-600">
                          {rating}
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-[#7a5063] transition-all"
                            style={{
                              width: `${widthPercentage}%`,
                            }}
                          />
                        </div>

                        <p className="text-right text-sm font-medium text-zinc-500">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      Review insights
                    </p>

                    <h2 className="mt-2 text-xl font-semibold text-[#34282e]">
                      Understanding your feedback
                    </h2>
                  </div>

                  <select
                    value={sort}
                    onChange={(event) => handleSortChange(event.target.value as VendorReviewSort)}
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                  >
                    {vendorReviewSortOptions.map((sortOption) => (
                      <option key={sortOption} value={sortOption}>
                        {sortLabels[sortOption]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-100 bg-[#faf8f7] p-5">
                    <p className="text-sm font-semibold text-zinc-700">Verified feedback only</p>

                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Reviews shown here come from customers with completed bookings and exclude
                      hidden moderation records.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-100 bg-[#faf8f7] p-5">
                    <p className="text-sm font-semibold text-zinc-700">Read-only vendor view</p>

                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      The current backend does not yet support vendor replies, editing, or removal
                      of customer feedback.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6">
              {reviews.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white/70 p-10 text-center shadow-sm sm:p-14">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
                    <Star className="h-6 w-6 text-rose-700" />
                  </div>

                  <h2 className="mt-5 text-xl font-semibold text-[#34282e]">
                    No verified reviews yet
                  </h2>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
                    Customer reviews will appear after completed bookings are reviewed and remain
                    publicly visible.
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
                    <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-sm sm:flex-row">
                      <div>
                        <p className="text-sm font-semibold text-zinc-700">
                          Showing {reviews.length} of {pagination.total} reviews
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          Page {pagination.page} of {pagination.totalPages}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!pagination.hasPreviousPage}
                          onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>

                        <button
                          type="button"
                          disabled={!pagination.hasNextPage}
                          onClick={() => setPage((currentPage) => currentPage + 1)}
                          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-rose-200 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
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
