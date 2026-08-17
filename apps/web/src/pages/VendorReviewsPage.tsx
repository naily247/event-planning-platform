import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
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
import { PageBackButton } from '../components/navigation/PageBackButton';

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
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-white/60 bg-white/44 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_62px_rgba(35,24,30,0.11)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
            <UserRound className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate font-black tracking-[-0.02em] text-[var(--color-near-black)]">
              {getCustomerName(review) || 'Verified customer'}
            </p>

            <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/42">
              Reviewed {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-[1.1rem] border border-white/60 bg-white/34 px-3 py-2">
          <div className="flex items-center gap-2">
            <RatingStars rating={review.overallRating} />

            <span className="text-sm font-black text-[var(--color-near-black)]">
              {review.overallRating}.0
            </span>
          </div>
        </div>
      </div>

      {review.comment ? (
        <div className="mt-5 rounded-[1.35rem] border border-white/58 bg-white/28 p-5">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-[var(--color-rosewood)]" />

            <p className="text-[0.63rem] font-black uppercase tracking-[0.13em] text-[var(--color-rosewood)]">
              Customer feedback
            </p>
          </div>

          <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--color-charcoal)]/64">
            {review.comment}
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.35rem] border border-dashed border-[rgba(93,58,85,0.14)] bg-white/20 p-5">
          <p className="text-sm font-medium leading-6 text-[var(--color-charcoal)]/52">
            The customer submitted ratings without a written comment.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-[1.15rem] border border-white/58 bg-white/28 p-3.5">
          <p className="text-[0.59rem] font-black uppercase tracking-[0.11em] text-[var(--color-charcoal)]/38">
            Overall
          </p>

          <p className="mt-2 text-lg font-black text-[var(--color-near-black)]">
            {review.overallRating}/5
          </p>
        </div>

        <div className="rounded-[1.15rem] border border-white/58 bg-white/28 p-3.5">
          <p className="text-[0.59rem] font-black uppercase tracking-[0.11em] text-[var(--color-charcoal)]/38">
            Service
          </p>

          <p className="mt-2 text-lg font-black text-[var(--color-near-black)]">
            {review.serviceRating === null ? '—' : `${review.serviceRating}/5`}
          </p>
        </div>

        <div className="rounded-[1.15rem] border border-white/58 bg-white/28 p-3.5">
          <p className="text-[0.59rem] font-black uppercase tracking-[0.11em] text-[var(--color-charcoal)]/38">
            Communication
          </p>

          <p className="mt-2 text-lg font-black text-[var(--color-near-black)]">
            {review.communicationRating === null ? '—' : `${review.communicationRating}/5`}
          </p>
        </div>
      </div>

      {review.package ? (
        <div className="mt-4 flex items-start gap-3 rounded-[1.2rem] border border-white/58 bg-white/28 p-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.20)] text-[#405d69]">
            <Package className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
              Reviewed service
            </p>

            <p className="mt-1 truncate text-sm font-black text-[var(--color-near-black)]">
              {review.package.title}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        <div className="flex items-center gap-2 border-t border-[rgba(93,58,85,0.08)] pt-4">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Star className="size-3.5 fill-current" />
          </span>

          <p className="text-xs font-bold text-[var(--color-charcoal)]/46">
            Verified feedback from a completed booking
          </p>
        </div>
      </div>
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
    <main className="workspace-shell relative">
      <div className="workspace-container w-full max-w-7xl">
        <header className="relative overflow-visible rounded-[1.75rem] border border-white/55 bg-white/34 p-4 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative flex items-center gap-4">
            <PageBackButton fallback="/vendor/dashboard" label="Dashboard" className="shrink-0" />

            <div className="min-w-0 border-l border-[rgba(93,58,85,0.12)] pl-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <h1 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-2xl">
                Customer reviews
              </h1>
            </div>
          </div>
        </header>

        <div className="pb-10 pt-6">
          <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_24px_70px_rgba(64,42,51,0.10)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-[rgba(183,167,200,0.23)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 left-[30%] size-72 rounded-full bg-[rgba(214,190,177,0.12)] blur-3xl"
            />

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-10 lg:p-10">
              <div>
                <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <Star className="size-4 fill-current" />
                  Reputation
                </div>

                <h2 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                  Understand the experience customers remember.
                </h2>

                <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66">
                  Review verified feedback from completed bookings, track service quality, and see
                  where your customer experience creates the strongest impression.
                </p>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  <span className="soft-chip text-xs font-black">
                    <MessageSquareText className="size-4" />
                    {onboardingQuery.isLoading || reviewsQuery.isLoading ? '—' : totalReviews}{' '}
                    reviews
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <Star className="size-4 fill-current" />
                    {formatAverage(summary?.averageOverallRating ?? null)} overall
                  </span>

                  <span className="soft-chip text-xs font-black">Verified customers</span>
                </div>
              </div>

              <article className="relative overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/52 p-5 shadow-[0_18px_52px_rgba(31,27,29,0.08)] backdrop-blur-2xl sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.17)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                        Reputation summary
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Customer trust at a glance
                      </h3>
                    </div>

                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <Star className="size-5 fill-current" />
                    </div>
                  </div>

                  <div className="mt-6 flex items-end gap-4">
                    <p className="text-5xl font-black tracking-[-0.065em] text-[var(--color-near-black)]">
                      {onboardingQuery.isLoading || reviewsQuery.isLoading
                        ? '—'
                        : formatAverage(summary?.averageOverallRating ?? null)}
                    </p>

                    <div className="pb-1">
                      <RatingStars
                        rating={
                          summary?.averageOverallRating
                            ? Math.round(summary.averageOverallRating)
                            : 0
                        }
                        size="large"
                      />

                      <p className="mt-2 text-xs font-bold text-[var(--color-charcoal)]/46">
                        {totalReviews} verified {totalReviews === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                      <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                        Overall
                      </p>

                      <p className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                        {formatAverage(summary?.averageOverallRating ?? null)}
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                      <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                        Service
                      </p>

                      <p className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                        {formatAverage(summary?.averageServiceRating ?? null)}
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] border border-white/60 bg-white/34 p-4">
                      <p className="text-[0.61rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                        Communication
                      </p>

                      <p className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                        {formatAverage(summary?.averageCommunicationRating ?? null)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>

          {onboardingQuery.isError ? (
            <section className="mt-6 grid min-h-72 place-items-center rounded-[2rem] border border-red-200/70 bg-red-50/55 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.06)]">
              <div className="max-w-lg">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-red-900">
                  Vendor profile could not be loaded
                </h2>

                <p className="mt-3 text-sm leading-7 text-red-700">
                  {getErrorMessage(onboardingQuery.error)}
                </p>

                <button
                  type="button"
                  onClick={() => onboardingQuery.refetch()}
                  className="mt-6 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white"
                >
                  Try again
                </button>
              </div>
            </section>
          ) : onboardingQuery.isLoading || reviewsQuery.isLoading ? (
            <>
              <section className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
                <div className="h-80 animate-pulse rounded-[2rem] border border-white/58 bg-white/42" />
                <div className="h-80 animate-pulse rounded-[2rem] border border-white/58 bg-white/42" />
              </section>

              <section className="mt-6 grid gap-5 xl:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ReviewSkeleton key={index} />
                ))}
              </section>
            </>
          ) : reviewsQuery.isError ? (
            <section className="mt-6 grid min-h-72 place-items-center rounded-[2rem] border border-red-200/70 bg-red-50/55 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.06)]">
              <div className="max-w-lg">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-red-900">
                  Reviews could not be loaded
                </h2>

                <p className="mt-3 text-sm leading-7 text-red-700">
                  {getErrorMessage(reviewsQuery.error)}
                </p>

                <button
                  type="button"
                  onClick={() => reviewsQuery.refetch()}
                  className="mt-6 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white"
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
                <article className="relative overflow-hidden rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-16 -top-20 size-48 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl"
                  />

                  <div className="relative">
                    <p className="section-eyebrow">Rating distribution</p>

                    <h2 className="section-title">How customers rate you</h2>

                    <p className="section-description">
                      See how your verified overall ratings are distributed across the five-star
                      scale.
                    </p>

                    <div className="mt-7 space-y-4">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = summary?.ratingBreakdown[rating as 1 | 2 | 3 | 4 | 5] ?? 0;

                        const widthPercentage = (count / maximumBreakdownValue) * 100;

                        return (
                          <div
                            key={rating}
                            className="grid grid-cols-[46px_1fr_32px] items-center gap-3"
                          >
                            <div className="flex items-center gap-1 text-sm font-black text-[var(--color-near-black)]">
                              {rating}

                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            </div>

                            <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(91,61,82,0.08)]">
                              <div
                                className="h-full rounded-full bg-[var(--color-deep-plum)] transition-all duration-500"
                                style={{ width: `${widthPercentage}%` }}
                              />
                            </div>

                            <p className="text-right text-sm font-black text-[var(--color-charcoal)]/48">
                              {count}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </article>

                <article className="relative overflow-hidden rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                  />

                  <div className="relative">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="section-eyebrow">Review insights</p>

                        <h2 className="section-title">What this feedback means</h2>

                        <p className="section-description max-w-xl">
                          Reviews are verified against completed bookings and remain read-only for
                          vendors.
                        </p>
                      </div>

                      <select
                        value={sort}
                        onChange={(event) =>
                          handleSortChange(event.target.value as VendorReviewSort)
                        }
                        className="w-fit rounded-full border border-white/60 bg-white/36 px-4 py-3 text-sm font-black text-[var(--color-charcoal)] outline-none transition focus:border-[rgba(91,61,82,0.28)] focus:bg-white/56 focus:ring-4 focus:ring-[rgba(183,167,200,0.16)]"
                      >
                        {vendorReviewSortOptions.map((sortOption) => (
                          <option key={sortOption} value={sortOption}>
                            {sortLabels[sortOption]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.3rem] border border-white/58 bg-white/30 p-5">
                        <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                          <Star className="size-4 fill-current" />
                        </div>

                        <p className="mt-4 text-sm font-black text-[var(--color-near-black)]">
                          Verified feedback
                        </p>

                        <p className="mt-2 text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                          Reviews come from customers connected to completed Eventure bookings.
                        </p>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/58 bg-white/30 p-5">
                        <div className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                          <MessageSquareText className="size-4" />
                        </div>

                        <p className="mt-4 text-sm font-black text-[var(--color-near-black)]">
                          Read-only workspace
                        </p>

                        <p className="mt-2 text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                          Vendor replies, edits and removals are not currently supported by this
                          workflow.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-[1.3rem] border border-white/58 bg-white/30 p-5">
                      <p className="text-[0.63rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                        Reputation snapshot
                      </p>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-2xl font-black text-[var(--color-near-black)]">
                            {formatAverage(summary?.averageOverallRating ?? null)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/44">
                            Overall
                          </p>
                        </div>

                        <div>
                          <p className="text-2xl font-black text-[var(--color-near-black)]">
                            {formatAverage(summary?.averageServiceRating ?? null)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/44">
                            Service
                          </p>
                        </div>

                        <div>
                          <p className="text-2xl font-black text-[var(--color-near-black)]">
                            {formatAverage(summary?.averageCommunicationRating ?? null)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/44">
                            Communication
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              <section className="mt-6">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="section-eyebrow">Customer feedback</p>

                    <h2 className="section-title">Verified reviews</h2>

                    <p className="section-description max-w-2xl">
                      Read the ratings and written feedback customers left after completed bookings.
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span className="soft-chip text-xs font-black">
                      <MessageSquareText className="size-4" />
                      {totalReviews} total
                    </span>

                    {pagination ? (
                      <span className="soft-chip text-xs font-black">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                    ) : null}
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div className="grid min-h-72 place-items-center rounded-[2rem] border border-white/60 bg-white/44 p-8 text-center shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl">
                    <div className="max-w-lg">
                      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Star className="size-6" />
                      </div>

                      <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        No verified reviews yet
                      </h2>

                      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--color-charcoal)]/58">
                        Customer feedback will appear here after completed bookings receive verified
                        reviews.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-5 xl:grid-cols-2">
                      {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>

                    {pagination && pagination.totalPages > 1 ? (
                      <div className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-white/58 bg-white/42 p-4 shadow-[0_16px_42px_rgba(35,24,30,0.06)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            Showing {reviews.length} of {pagination.total} reviews
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/46">
                            Page {pagination.page} of {pagination.totalPages}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!pagination.hasPreviousPage}
                            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/36 px-4 py-2.5 text-sm font-black text-[var(--color-charcoal)] transition hover:bg-white/56 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <ChevronLeft className="size-4" />
                            Previous
                          </button>

                          <span className="grid min-w-10 place-items-center rounded-full bg-[var(--color-deep-plum)] px-3 py-2.5 text-sm font-black text-white">
                            {pagination.page}
                          </span>

                          <button
                            type="button"
                            disabled={!pagination.hasNextPage}
                            onClick={() => setPage((currentPage) => currentPage + 1)}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/36 px-4 py-2.5 text-sm font-black text-[var(--color-charcoal)] transition hover:bg-white/56 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            Next
                            <ChevronRight className="size-4" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
