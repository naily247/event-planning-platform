import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CircleAlert,
  EyeOff,
  LoaderCircle,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Star,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ReviewCard } from '../features/reviews/ReviewCard';
import { ReviewDetailsDialog } from '../features/reviews/ReviewDetailsDialog';
import { ReviewFormDialog, type ReviewFormInput } from '../features/reviews/ReviewFormDialog';
import {
  deleteCustomerReview,
  getCustomerReviews,
  reviewSortOptions,
  updateCustomerReview,
  type CustomerReview,
  type ReviewSort,
  type UpdateCustomerReviewInput,
} from '../features/reviews/review.api';
import { api } from '../lib/api';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type EventSummary = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string;
  status: 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
};

type RatingFilter = number | '';

const reviewSortLabels: Record<ReviewSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  rating_highest: 'Highest rating',
  rating_lowest: 'Lowest rating',
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error ? error.message : 'Something went wrong while loading reviews.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'Something went wrong while loading reviews.'
  );
};

const formatLongDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const getAverageRating = (reviews: CustomerReview[]) => {
  if (reviews.length === 0) {
    return null;
  }

  const total = reviews.reduce((sum, review) => sum + review.overallRating, 0);

  return total / reviews.length;
};

const formatAverageRating = (rating: number | null) => {
  if (rating === null) {
    return '—';
  }

  return rating.toFixed(1);
};

export function ReviewsWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('');
  const [sort, setSort] = useState<ReviewSort>('newest');

  const [selectedReview, setSelectedReview] = useState<CustomerReview | null>(null);
  const [reviewToEdit, setReviewToEdit] = useState<CustomerReview | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<CustomerReview | null>(null);

  const eventQuery = useQuery({
    queryKey: ['customer', 'events', eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const response = await api.get<ApiSuccessResponse<EventSummary>>(`/events/${eventId}`);

      return response.data.data;
    },
  });

  const reviewsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'reviews',
      {
        page,
        overallRating: ratingFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getCustomerReviews({
        eventId: eventId!,
        page,
        limit: 20,
        overallRating: ratingFilter || undefined,
        sort,
      }),
  });

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'reviews', 'summary'],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const [allReviewsResult, hiddenReviewsResult] = await Promise.all([
        getCustomerReviews({
          eventId: eventId!,
          page: 1,
          limit: 100,
          sort: 'newest',
        }),
        getCustomerReviews({
          eventId: eventId!,
          page: 1,
          limit: 100,
          sort: 'newest',
        }),
      ]);

      const reviews = allReviewsResult.reviews;
      const hiddenReviews = hiddenReviewsResult.reviews.filter((review) => review.isHidden);

      return {
        total: allReviewsResult.pagination.total,
        averageRating: getAverageRating(reviews),
        published: reviews.filter((review) => !review.isHidden).length,
        hidden: hiddenReviews.length,
        reviews,
      };
    },
  });

  const invalidateReviewQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'reviews'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['customer', 'reviews'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['customer', 'bookings'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['dashboard', 'customer'],
      }),
    ]);
  };

  const updateReviewMutation = useMutation({
    mutationFn: async ({
      reviewId,
      input,
    }: {
      reviewId: string;
      input: UpdateCustomerReviewInput;
    }) => {
      return updateCustomerReview(reviewId, input);
    },

    onSuccess: async (updatedReview) => {
      setReviewToEdit(null);

      queryClient.setQueryData(['customer', 'reviews', updatedReview.id], updatedReview);

      await invalidateReviewQueries();
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await deleteCustomerReview(reviewId);

      return reviewId;
    },

    onSuccess: async (deletedReviewId) => {
      if (selectedReview?.id === deletedReviewId) {
        setSelectedReview(null);
      }

      setReviewToDelete(null);

      await invalidateReviewQueries();
    },
  });

  const openReviewDetails = (review: CustomerReview) => {
    setSelectedReview(review);
  };

  const openEditReview = (review: CustomerReview) => {
    updateReviewMutation.reset();
    setSelectedReview(null);
    setReviewToEdit(review);
  };

  const closeEditReview = () => {
    if (updateReviewMutation.isPending) {
      return;
    }

    updateReviewMutation.reset();
    setReviewToEdit(null);
  };

  const openDeleteReview = (review: CustomerReview) => {
    deleteReviewMutation.reset();
    setReviewToDelete(review);
  };

  const closeDeleteReview = () => {
    if (deleteReviewMutation.isPending) {
      return;
    }

    deleteReviewMutation.reset();
    setReviewToDelete(null);
  };

  const handleUpdateReview = (input: ReviewFormInput | UpdateCustomerReviewInput) => {
    if (!reviewToEdit) {
      return;
    }

    updateReviewMutation.mutate({
      reviewId: reviewToEdit.id,
      input,
    });
  };

  const filtersAreActive = ratingFilter !== '' || sort !== 'newest';

  const clearFilters = () => {
    setRatingFilter('');
    setSort('newest');
    setPage(1);
  };

  const isLoading = eventQuery.isLoading || reviewsQuery.isLoading || summaryQuery.isLoading;

  const isError = eventQuery.isError || reviewsQuery.isError || summaryQuery.isError;

  const firstError = eventQuery.error ?? reviewsQuery.error ?? summaryQuery.error;

  const reviewSummary = summaryQuery.data;

  const averageRating = useMemo(() => {
    return formatAverageRating(reviewSummary?.averageRating ?? null);
  }, [reviewSummary?.averageRating]);

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your reviews
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading vendor feedback, ratings and moderation details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !eventQuery.data || !reviewsQuery.data || !reviewSummary) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Reviews workspace unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {eventId ? getApiErrorMessage(firstError) : 'The event address is invalid.'}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {eventId ? (
                <button
                  type="button"
                  className="btn-primary text-sm font-bold"
                  onClick={() => {
                    void Promise.all([
                      eventQuery.refetch(),
                      reviewsQuery.refetch(),
                      summaryQuery.refetch(),
                    ]);
                  }}
                >
                  Try again
                </button>
              ) : null}

              <Link to="/events" className="btn-secondary text-sm font-bold">
                <ArrowLeft className="size-4" />
                Back to events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const eventDetails = eventQuery.data;
  const reviews = reviewsQuery.data.reviews;
  const pagination = reviewsQuery.data.pagination;

  const summaryCards = [
    {
      label: 'Total reviews',
      value: reviewSummary.total,
      helper: 'Verified feedback from completed bookings',
      icon: MessageSquareText,
    },
    {
      label: 'Average rating',
      value: averageRating,
      helper: 'Average overall score for this event',
      icon: Star,
    },
    {
      label: 'Published',
      value: reviewSummary.published,
      helper: 'Currently visible vendor feedback',
      icon: Sparkles,
    },
    {
      label: 'Moderated',
      value: reviewSummary.hidden,
      helper: 'Reviews hidden by platform moderation',
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/events/${eventId}`}
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to event workspace"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Customer reviews
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {eventDetails.name}
              </h1>
            </div>
          </div>

          <span className="status-chip w-fit" data-tone="plum">
            <MessageSquareText className="size-4" />
            {reviewSummary.total} reviews
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[7%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  Verified experiences
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Keep every completed vendor experience documented.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Review your submitted ratings, update written feedback and keep track of any
                  moderation decisions connected to this event.
                </p>
              </div>

              <div className="glass-card p-5">
                <Star className="size-6 fill-current text-[var(--color-rosewood)]" />

                <p className="mt-6 text-sm font-bold text-[var(--color-charcoal)]/58">
                  Event review score
                </p>

                <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {averageRating}
                </p>

                <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/58">
                  Based on {reviewSummary.total}{' '}
                  {reviewSummary.total === 1 ? 'submitted review' : 'submitted reviews'}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label, value, helper, icon: Icon }) => (
              <article key={label} className="luxe-card p-6">
                <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <Icon className="size-5" />
                </div>

                <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">{label}</p>

                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {value}
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                  {helper}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.28fr]">
            <article className="glass-card p-6 sm:p-7">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Review history
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Feedback submitted for this event.
                </h2>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <select
                  className="form-field min-h-12"
                  aria-label="Filter reviews by overall rating"
                  value={ratingFilter}
                  onChange={(event) => {
                    const value = event.target.value;

                    setRatingFilter(value ? Number(value) : '');
                    setPage(1);
                  }}
                >
                  <option value="">All ratings</option>
                  <option value="5">5-star reviews</option>
                  <option value="4">4-star reviews</option>
                  <option value="3">3-star reviews</option>
                  <option value="2">2-star reviews</option>
                  <option value="1">1-star reviews</option>
                </select>

                <select
                  className="form-field min-h-12"
                  aria-label="Sort reviews"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as ReviewSort);
                    setPage(1);
                  }}
                >
                  {reviewSortOptions.map((sortOption) => (
                    <option key={sortOption} value={sortOption}>
                      {reviewSortLabels[sortOption]}
                    </option>
                  ))}
                </select>
              </div>

              {filtersAreActive ? (
                <button
                  type="button"
                  className="btn-secondary mt-4 text-sm font-bold"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : null}

              {reviews.length > 0 ? (
                <div className="mt-8 space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onView={openReviewDetails}
                      onEdit={openEditReview}
                      onDelete={openDeleteReview}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <MessageSquareText className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    {filtersAreActive ? 'No reviews match this filter' : 'No reviews submitted yet'}
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    {filtersAreActive
                      ? 'Try changing the rating filter or sorting option.'
                      : 'Reviews can be submitted after a vendor marks a booking as completed.'}
                  </p>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary mt-5 text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <Link
                      to={`/events/${eventId}/bookings`}
                      className="btn-primary mt-5 text-sm font-bold"
                    >
                      <Store className="size-4" />
                      Open bookings
                    </Link>
                  )}
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} reviews)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || reviewsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || reviewsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => currentPage + 1);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
            <aside className="space-y-5">
              <article className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <Star className="size-6 fill-current text-[var(--color-powder-blue)]" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Review quality</h2>

                <p className="mt-3 leading-7 text-white/68">
                  Ratings remain connected to completed bookings, so every review represents a real
                  vendor experience.
                </p>

                <div className="mt-8 space-y-3">
                  {[
                    {
                      label: '5-star reviews',
                      value: reviewSummary.reviews.filter((review) => review.overallRating === 5)
                        .length,
                    },
                    {
                      label: '4-star reviews',
                      value: reviewSummary.reviews.filter((review) => review.overallRating === 4)
                        .length,
                    },
                    {
                      label: 'Published',
                      value: reviewSummary.published,
                    },
                    {
                      label: 'Moderated',
                      value: reviewSummary.hidden,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl bg-white/14 px-4 py-3 backdrop-blur"
                    >
                      <span className="text-sm font-bold text-white/72">{label}</span>

                      <span className="text-lg font-black">{value}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="glass-card p-6">
                <ShieldAlert className="size-6 text-[var(--color-deep-plum)]" />

                <h2 className="mt-6 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Moderation transparency
                </h2>

                <div className="mt-4 space-y-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  <p>Hidden reviews remain visible to you inside this workspace.</p>
                  <p>The moderation reason and moderation date are shown when available.</p>
                  <p>You can still edit or delete your own review after moderation.</p>
                </div>
              </article>

              <article className="glass-card p-6">
                <EyeOff className="size-6 text-[var(--color-deep-plum)]" />

                <h2 className="mt-6 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Verified workflow
                </h2>

                <div className="mt-4 space-y-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  <p>Only completed bookings can receive reviews.</p>
                  <p>Each booking can receive one review only.</p>
                  <p>Vendor and package details are linked automatically.</p>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>

      {selectedReview ? (
        <ReviewDetailsDialog
          review={selectedReview}
          onClose={() => {
            setSelectedReview(null);
          }}
          onEdit={openEditReview}
        />
      ) : null}

      {reviewToEdit ? (
        <ReviewFormDialog
          mode="edit"
          review={reviewToEdit}
          vendorName={reviewToEdit.vendor.businessName}
          packageTitle={reviewToEdit.package?.title}
          isPending={updateReviewMutation.isPending}
          errorMessage={
            updateReviewMutation.isError ? getApiErrorMessage(updateReviewMutation.error) : null
          }
          onClose={closeEditReview}
          onSubmit={handleUpdateReview}
        />
      ) : null}

      {reviewToDelete ? (
        <div
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-review-title"
        >
          <div className="glass-card w-full max-w-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                  <Trash2 className="size-7" />
                </div>

                <h2
                  id="delete-review-title"
                  className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                >
                  Delete this review?
                </h2>

                <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
                  This will permanently remove your review for{' '}
                  <strong>{reviewToDelete.vendor.businessName}</strong>. This action cannot be
                  undone.
                </p>
              </div>

              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28"
                aria-label="Close delete confirmation"
                disabled={deleteReviewMutation.isPending}
                onClick={closeDeleteReview}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-white/24 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/48">
                Review summary
              </p>

              <div className="mt-3 flex items-center gap-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className={`size-5 ${
                      index < reviewToDelete.overallRating
                        ? 'fill-[var(--color-rosewood)] text-[var(--color-rosewood)]'
                        : 'text-[var(--color-charcoal)]/20'
                    }`}
                  />
                ))}

                <span className="ml-2 font-black text-[var(--color-near-black)]">
                  {reviewToDelete.overallRating}/5
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-[var(--color-charcoal)]/58">
                {reviewToDelete.package?.title ?? 'Custom vendor service'}
              </p>
            </div>

            {deleteReviewMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(deleteReviewMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={deleteReviewMutation.isPending}
                onClick={closeDeleteReview}
              >
                Keep review
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteReviewMutation.isPending}
                onClick={() => {
                  deleteReviewMutation.mutate(reviewToDelete.id);
                }}
              >
                {deleteReviewMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteReviewMutation.isPending ? 'Deleting review...' : 'Delete review'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
