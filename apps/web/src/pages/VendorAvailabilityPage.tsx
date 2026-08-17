import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createVendorAvailabilityBlock,
  deleteVendorAvailabilityBlock,
  getVendorAvailability,
  type VendorAvailabilityBlock,
  type VendorAvailabilityBooking,
} from '../features/vendors/vendor.api';
import { PageBackButton } from '../components/navigation/PageBackButton';

const availabilityBlockSchema = z
  .object({
    startsAt: z
      .string()
      .min(1, 'Choose when the unavailable period starts.')
      .refine(
        (value) => {
          const date = new Date(value);

          return Number.isFinite(date.getTime()) && date.getTime() > Date.now();
        },
        {
          message: 'The unavailable period must start in the future.',
        },
      ),

    endsAt: z
      .string()
      .min(1, 'Choose when the unavailable period ends.')
      .refine((value) => Number.isFinite(new Date(value).getTime()), {
        message: 'Choose a valid end date and time.',
      }),

    reason: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || value.length >= 3, {
        message: 'Reason must contain at least 3 characters.',
      })
      .refine((value) => value.length <= 500, {
        message: 'Reason must not exceed 500 characters.',
      }),
  })
  .superRefine((values, context) => {
    if (
      values.startsAt &&
      values.endsAt &&
      new Date(values.endsAt).getTime() <= new Date(values.startsAt).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'End date and time must be after the start.',
      });
    }
  });

type AvailabilityBlockFormValues = z.infer<typeof availabilityBlockSchema>;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type AvailabilityTimelineItem =
  | {
      id: string;
      type: 'BLOCK';
      startsAt: string;
      endsAt: string;
      block: VendorAvailabilityBlock;
    }
  | {
      id: string;
      type: 'BOOKING';
      startsAt: string;
      endsAt: string;
      booking: VendorAvailabilityBooking;
    };

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
};

const toLocalDateTimeInput = (value: Date) => {
  const timezoneOffset = value.getTimezoneOffset() * 60_000;

  return new Date(value.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getDefaultStart = () => {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);

  start.setMinutes(0, 0, 0);

  return toLocalDateTimeInput(start);
};

const getDefaultEnd = () => {
  const end = new Date(Date.now() + 25 * 60 * 60 * 1000);

  end.setMinutes(0, 0, 0);

  return toLocalDateTimeInput(end);
};

const getMinimumDateTime = () => {
  const minimum = new Date(Date.now() + 5 * 60 * 1000);

  return toLocalDateTimeInput(minimum);
};

const getAvailabilityRange = () => {
  const from = new Date();
  const to = new Date();

  to.setDate(to.getDate() + 90);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatDateTimeRange = (startsAt: string, endsAt: string) => {
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return `${formatDate(startsAt)} · ${formatTime(startsAt)} – ${formatTime(endsAt)}`;
  }

  return `${formatDate(startsAt)}, ${formatTime(startsAt)} – ${formatDate(
    endsAt,
  )}, ${formatTime(endsAt)}`;
};

const getBookingStatusTone = (status: VendorAvailabilityBooking['status']) => {
  switch (status) {
    case 'ACTIVE':
      return 'success';

    case 'CONFIRMED':
    case 'DEPOSIT_PENDING':
      return 'plum';

    case 'DISPUTED':
      return 'danger';

    default:
      return 'neutral';
  }
};

export function VendorAvailabilityPage() {
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showCreateDiscardConfirmation, setShowCreateDiscardConfirmation] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState<VendorAvailabilityBlock | null>(null);

  const availabilityRange = useMemo(() => getAvailabilityRange(), []);

  const form = useForm<AvailabilityBlockFormValues>({
    resolver: zodResolver(availabilityBlockSchema),
    defaultValues: {
      startsAt: getDefaultStart(),
      endsAt: getDefaultEnd(),
      reason: '',
    },
  });

  const availabilityQuery = useQuery({
    queryKey: ['vendors', 'me', 'availability', availabilityRange.from, availabilityRange.to],
    queryFn: () => getVendorAvailability(availabilityRange),
  });

  const createMutation = useMutation({
    mutationFn: (values: AvailabilityBlockFormValues) =>
      createVendorAvailabilityBlock({
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        reason: values.reason.trim() || null,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'availability'],
      });

      form.reset({
        startsAt: getDefaultStart(),
        endsAt: getDefaultEnd(),
        reason: '',
      });

      setShowCreateDiscardConfirmation(false);
      setIsCreateDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendorAvailabilityBlock,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'availability'],
      });

      setDeletingBlock(null);
    },
  });

  const timelineItems = useMemo<AvailabilityTimelineItem[]>(() => {
    const availability = availabilityQuery.data;

    if (!availability) {
      return [];
    }

    return [
      ...availability.blocks.map(
        (block): AvailabilityTimelineItem => ({
          id: block.id,
          type: 'BLOCK',
          startsAt: block.startsAt,
          endsAt: block.endsAt,
          block,
        }),
      ),

      ...availability.bookings.map(
        (booking): AvailabilityTimelineItem => ({
          id: booking.id,
          type: 'BOOKING',
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          booking,
        }),
      ),
    ].sort((first, second) => {
      const difference = new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();

      if (difference !== 0) {
        return difference;
      }

      if (first.type === second.type) {
        return 0;
      }

      return first.type === 'BOOKING' ? -1 : 1;
    });
  }, [availabilityQuery.data]);

  const openCreateDialog = () => {
    createMutation.reset();
    form.clearErrors();

    form.reset({
      startsAt: getDefaultStart(),
      endsAt: getDefaultEnd(),
      reason: '',
    });

    setShowCreateDiscardConfirmation(false);
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createMutation.isPending) {
      return;
    }

    if (form.formState.isDirty) {
      setShowCreateDiscardConfirmation(true);
      return;
    }

    createMutation.reset();
    form.clearErrors();

    form.reset({
      startsAt: getDefaultStart(),
      endsAt: getDefaultEnd(),
      reason: '',
    });

    setIsCreateDialogOpen(false);
  };

  const discardCreateChanges = () => {
    if (createMutation.isPending) {
      return;
    }

    setShowCreateDiscardConfirmation(false);
    createMutation.reset();
    form.clearErrors();

    form.reset({
      startsAt: getDefaultStart(),
      endsAt: getDefaultEnd(),
      reason: '',
    });

    setIsCreateDialogOpen(false);
  };

  const onSubmit = form.handleSubmit((values) => {
    createMutation.mutate(values);
  });

  if (availabilityQuery.isLoading) {
    return (
      <div className="workspace-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading your availability
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Gathering blocked periods and scheduled vendor bookings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (availabilityQuery.isError || !availabilityQuery.data) {
    return (
      <div className="workspace-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <CircleAlert className="mx-auto size-10 text-[var(--color-rosewood)]" />

            <h1 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Availability unavailable
            </h1>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(
                availabilityQuery.error,
                'We could not load your vendor availability.',
              )}
            </p>

            <button
              type="button"
              className="btn-primary mt-6 text-sm font-bold"
              onClick={() => {
                void availabilityQuery.refetch();
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availability = availabilityQuery.data;

  return (
    <div className="workspace-shell relative">
      <div className="workspace-container max-w-7xl">
        <header className="relative overflow-visible rounded-[1.75rem] border border-white/55 bg-white/34 p-4 shadow-[0_16px_46px_rgba(31,27,29,0.07)] backdrop-blur-2xl sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <PageBackButton fallback="/vendor/dashboard" label="Dashboard" className="shrink-0" />

              <div className="min-w-0 border-l border-[rgba(93,58,85,0.12)] pl-4">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                  Vendor workspace
                </p>

                <h1 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-2xl">
                  Availability management
                </h1>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary w-fit text-sm font-bold"
              onClick={openCreateDialog}
            >
              <Plus className="size-4" />
              Block unavailable time
            </button>
          </div>
        </header>

        <main className="pb-10 pt-6">
          <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.66)_55%,rgba(232,225,238,0.56)_100%)] shadow-[0_24px_70px_rgba(64,42,51,0.10)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-[rgba(183,167,200,0.23)] blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 left-[32%] size-72 rounded-full bg-[rgba(142,92,103,0.10)] blur-3xl"
            />

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:p-10">
              <div>
                <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <CalendarRange className="size-4" />
                  Service availability
                </div>

                <h2 className="mt-6 max-w-3xl text-balance text-4xl font-black leading-[1.01] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl">
                  Protect your schedule before the next booking arrives.
                </h2>

                <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--color-charcoal)]/66">
                  Review committed bookings and block periods when your business is unavailable.
                  Eventure uses both when checking whether new work can proceed.
                </p>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  <span className="soft-chip text-xs font-black">
                    <BriefcaseBusiness className="size-4" />
                    {availability.bookings.length} bookings
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <Ban className="size-4" />
                    {availability.blocks.length} blocked
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <CalendarRange className="size-4" />
                    Next 90 days
                  </span>
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
                        Schedule overview
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                        Next 90 days
                      </h3>
                    </div>

                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <CalendarRange className="size-5" />
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                    Confirmed commitments and manually protected time are both considered before new
                    bookings can proceed.
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.25rem] border border-white/62 bg-white/34 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid size-9 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#405d69]">
                          <BriefcaseBusiness className="size-4" />
                        </div>

                        <span className="text-[0.64rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/38">
                          Committed
                        </span>
                      </div>

                      <p className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {availability.bookings.length}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/46">
                        Scheduled bookings
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] border border-white/62 bg-white/34 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="grid size-9 place-items-center rounded-xl bg-[rgba(142,92,103,0.14)] text-[var(--color-rosewood)]">
                          <Ban className="size-4" />
                        </div>

                        <span className="text-[0.64rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/38">
                          Protected
                        </span>
                      </div>

                      <p className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {availability.blocks.length}
                      </p>

                      <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/46">
                        Blocked periods
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-white/58 bg-white/30 p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[rgba(91,61,82,0.10)] text-[var(--color-deep-plum)]">
                      <Clock3 className="size-4" />
                    </span>

                    <p className="text-xs font-bold leading-5 text-[var(--color-charcoal)]/55">
                      Eventure checks these periods before allowing overlapping work to move
                      forward.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-eyebrow">Schedule timeline</p>

                <h2 className="section-title">Upcoming commitments</h2>

                <p className="section-description max-w-2xl">
                  Bookings are protected automatically. Manual unavailable periods can be removed
                  whenever your plans change.
                </p>
              </div>

              <button
                type="button"
                className="btn-secondary w-fit text-sm font-bold"
                onClick={openCreateDialog}
              >
                <Plus className="size-4" />
                Add unavailable period
              </button>
            </div>

            <article className="rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
              {timelineItems.length > 0 ? (
                <div className="space-y-4">
                  {timelineItems.map((item, index) => {
                    if (item.type === 'BOOKING') {
                      return (
                        <div
                          key={`booking-${item.id}`}
                          className="group relative overflow-hidden rounded-[1.55rem] border border-[rgba(93,58,85,0.11)] bg-white/30 p-5 transition duration-300 hover:-translate-y-0.5 hover:bg-white/40 hover:shadow-[0_14px_38px_rgba(35,24,30,0.07)]"
                        >
                          <div className="absolute inset-y-0 left-0 w-1 bg-[rgba(92,139,164,0.62)]" />

                          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.30)] text-[#405d69]">
                                <BriefcaseBusiness className="size-5" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-[0.67rem] font-black uppercase tracking-[0.17em] text-[#526f7d]">
                                    Scheduled booking
                                  </p>

                                  {index === 0 ? (
                                    <span className="rounded-full bg-[rgba(175,201,216,0.24)] px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.11em] text-[#405d69]">
                                      Next
                                    </span>
                                  ) : null}
                                </div>

                                <p className="mt-2.5 text-base font-black leading-7 text-[var(--color-near-black)]">
                                  {formatDateTimeRange(item.startsAt, item.endsAt)}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-charcoal)]/50">
                                    <CalendarDays className="size-3.5 text-[#526f7d]" />
                                    Reserved through Eventure
                                  </span>

                                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-charcoal)]/50">
                                    <Clock3 className="size-3.5 text-[#526f7d]" />
                                    Protected automatically
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span
                              className="status-chip w-fit shrink-0"
                              data-tone={getBookingStatusTone(item.booking.status)}
                            >
                              {item.booking.status.replaceAll('_', ' ')}
                            </span>
                          </div>

                          <div className="mt-4 flex items-start gap-3 rounded-[1.15rem] border border-white/52 bg-white/24 px-4 py-3">
                            <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#526f7d]" />

                            <p className="text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                              This period belongs to an existing booking and cannot be removed from
                              availability manually.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`block-${item.id}`}
                        className="group relative overflow-hidden rounded-[1.55rem] border border-[rgba(124,74,90,0.14)] bg-[rgba(124,74,90,0.055)] p-5 transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(124,74,90,0.08)] hover:shadow-[0_14px_38px_rgba(35,24,30,0.07)]"
                      >
                        <div className="absolute inset-y-0 left-0 w-1 bg-[rgba(142,92,103,0.68)]" />

                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(142,92,103,0.14)] text-[var(--color-rosewood)]">
                              <Ban className="size-5" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[0.67rem] font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                                  Unavailable period
                                </p>

                                {index === 0 ? (
                                  <span className="rounded-full bg-[rgba(142,92,103,0.12)] px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.11em] text-[var(--color-rosewood)]">
                                    Next
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-2.5 text-base font-black leading-7 text-[var(--color-near-black)]">
                                {formatDateTimeRange(item.startsAt, item.endsAt)}
                              </p>

                              <div className="mt-3 rounded-[1.1rem] border border-white/48 bg-white/24 px-4 py-3">
                                <p className="text-[0.63rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                                  Private reason
                                </p>

                                <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                                  {item.block.reason ??
                                    'No reason was added for this blocked period.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-4 py-2.5 text-xs font-black text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.14)] sm:size-10 sm:px-0"
                            aria-label="Delete availability block"
                            onClick={() => {
                              deleteMutation.reset();
                              setDeletingBlock(item.block);
                            }}
                          >
                            <Trash2 className="size-4" />
                            <span className="sm:hidden">Remove block</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid min-h-64 place-items-center rounded-[1.65rem] border border-dashed border-[rgba(93,58,85,0.18)] bg-white/18 p-8 text-center">
                  <div className="max-w-md">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <CalendarDays className="size-6" />
                    </div>

                    <h3 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                      Your schedule is clear
                    </h3>

                    <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/55">
                      There are no committed bookings or manually blocked periods within the next 90
                      days.
                    </p>

                    <button
                      type="button"
                      className="btn-primary mt-6 text-sm font-bold"
                      onClick={openCreateDialog}
                    >
                      <Plus className="size-4" />
                      Add unavailable period
                    </button>
                  </div>
                </div>
              )}
            </article>
          </section>

          <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/58 bg-white/42 p-5 shadow-[0_18px_48px_rgba(35,24,30,0.07)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="section-eyebrow">Availability rules</p>

                <h2 className="section-title">Keep your calendar conflict-free.</h2>

                <p className="section-description">
                  These rules protect committed work and prevent invalid availability changes.
                </p>
              </div>

              <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-3xl">
                <div className="rounded-[1.3rem] border border-white/55 bg-white/30 p-4">
                  <Ban className="size-5 text-[var(--color-deep-plum)]" />

                  <p className="mt-3 text-sm font-black text-[var(--color-near-black)]">
                    No overlapping blocks
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                    A manual blocked period cannot overlap another manual block.
                  </p>
                </div>

                <div className="rounded-[1.3rem] border border-white/55 bg-white/30 p-4">
                  <BriefcaseBusiness className="size-5 text-[var(--color-deep-plum)]" />

                  <p className="mt-3 text-sm font-black text-[var(--color-near-black)]">
                    Bookings stay protected
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                    Time already reserved by committed work cannot be manually blocked.
                  </p>
                </div>

                <div className="rounded-[1.3rem] border border-white/55 bg-white/30 p-4">
                  <Clock3 className="size-5 text-[var(--color-deep-plum)]" />

                  <p className="mt-3 text-sm font-black text-[var(--color-near-black)]">
                    Future periods only
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                    Blocks must start in the future and end after their selected start time.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-[rgba(31,27,29,0.54)] px-4 py-6 backdrop-blur-md sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-availability-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateDialog();
            }
          }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center">
            <div
              className="relative w-full overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.97)] shadow-[0_34px_100px_rgba(27,17,23,0.34)] backdrop-blur-2xl"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 left-[18%] size-64 rounded-full bg-[rgba(214,190,177,0.14)] blur-3xl"
              />

              <div className="relative border-b border-[rgba(93,58,85,0.08)] px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="soft-chip w-fit text-[0.65rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)]">
                      <Ban className="size-3.5" />
                      Availability control
                    </div>

                    <h2
                      id="create-availability-title"
                      className="mt-4 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-3xl"
                    >
                      Protect a period in your schedule
                    </h2>

                    <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/56">
                      Prevent new work from being scheduled while your business is unavailable.
                      Existing committed bookings remain protected automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Close availability block dialog"
                    disabled={createMutation.isPending}
                    onClick={closeCreateDialog}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-white/65 bg-white/42 text-[var(--color-charcoal)]/62 shadow-sm transition hover:bg-white/72 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-4.5" />
                  </button>
                </div>
              </div>

              <form onSubmit={onSubmit} noValidate>
                <div className="relative max-h-[calc(100vh-14rem)] overflow-y-auto px-5 py-6 sm:px-7">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/58 bg-white/30 p-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                        <CalendarDays className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Exact schedule protection
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                          Choose the precise start and end of your unavailable period.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/58 bg-white/30 p-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#405d69]">
                        <BriefcaseBusiness className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Bookings remain protected
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                          Eventure rejects unavailable periods that conflict with committed work.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="my-6 h-px bg-[rgba(93,58,85,0.08)]" />

                  <section className="rounded-[1.6rem] border border-white/62 bg-white/30 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <CalendarRange className="size-5" />
                      </div>

                      <div>
                        <h3 className="text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                          Unavailable period
                        </h3>

                        <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-charcoal)]/54">
                          Both values are required. The period must begin in the future and end
                          after its selected start.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                            Starts
                          </span>

                          <CalendarDays className="size-4 text-[var(--color-deep-plum)]/68" />
                        </div>

                        <input
                          className="form-field bg-white/44"
                          type="datetime-local"
                          min={getMinimumDateTime()}
                          disabled={createMutation.isPending}
                          {...form.register('startsAt')}
                        />

                        {form.formState.errors.startsAt ? (
                          <span className="mt-2 flex items-start gap-2 text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" />
                            {form.formState.errors.startsAt.message}
                          </span>
                        ) : (
                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                            Choose when your business becomes unavailable.
                          </p>
                        )}
                      </label>

                      <label className="block">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                            Ends
                          </span>

                          <Clock3 className="size-4 text-[var(--color-deep-plum)]/68" />
                        </div>

                        <input
                          className="form-field bg-white/44"
                          type="datetime-local"
                          min={form.watch('startsAt') || getMinimumDateTime()}
                          disabled={createMutation.isPending}
                          {...form.register('endsAt')}
                        />

                        {form.formState.errors.endsAt ? (
                          <span className="mt-2 flex items-start gap-2 text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" />
                            {form.formState.errors.endsAt.message}
                          </span>
                        ) : (
                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                            This must be later than the selected start date and time.
                          </p>
                        )}
                      </label>
                    </div>
                  </section>

                  <section className="mt-5 rounded-[1.6rem] border border-white/62 bg-white/30 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(214,190,177,0.20)] text-[var(--color-rosewood)]">
                        <CircleAlert className="size-5" />
                      </div>

                      <div>
                        <h3 className="text-base font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                          Private reason
                        </h3>

                        <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-charcoal)]/54">
                          This is optional and is never shown to customers.
                        </p>
                      </div>
                    </div>

                    <label className="mt-5 block">
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                          Reason
                        </span>

                        <span
                          className={[
                            'text-xs font-bold',
                            (form.watch('reason') ?? '').length > 500
                              ? 'text-[var(--color-muted-burgundy)]'
                              : 'text-[var(--color-charcoal)]/42',
                          ].join(' ')}
                        >
                          {(form.watch('reason') ?? '').length}/500
                        </span>
                      </div>

                      <textarea
                        className="form-field min-h-32 resize-y bg-white/44 leading-7"
                        placeholder="Annual leave, equipment maintenance, family event, team training..."
                        disabled={createMutation.isPending}
                        {...form.register('reason')}
                      />

                      {form.formState.errors.reason ? (
                        <span className="mt-2 flex items-start gap-2 text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                          <CircleAlert className="mt-0.5 size-4 shrink-0" />
                          {form.formState.errors.reason.message}
                        </span>
                      ) : (
                        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                          Leave this blank if no internal explanation is necessary.
                        </p>
                      )}
                    </label>
                  </section>

                  {form.formState.isDirty ? (
                    <div className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-amber-200/70 bg-amber-50/65 p-4">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />

                      <div>
                        <p className="text-sm font-black text-amber-900">
                          You have unsaved schedule changes
                        </p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                          Create this unavailable period before closing, or discard your changes if
                          you no longer need it.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {createMutation.isError ? (
                    <div
                      role="alert"
                      className="mt-5 flex items-start gap-3 rounded-[1.25rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]" />

                      <p className="text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                        {getErrorMessage(
                          createMutation.error,
                          'We could not create this availability block.',
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="relative border-t border-[rgba(93,58,85,0.08)] bg-white/40 px-5 py-4 backdrop-blur-xl sm:px-7">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="hidden max-w-sm text-xs font-semibold leading-5 text-[var(--color-charcoal)]/42 sm:block">
                      Once created, this period will immediately be considered during availability
                      checks.
                    </p>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-black"
                        disabled={createMutation.isPending}
                        onClick={closeCreateDialog}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-deep-plum)] px-5 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.20)] transition hover:-translate-y-0.5 hover:bg-[var(--color-muted-burgundy)] hover:!text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        {createMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin text-white" />
                        ) : (
                          <Plus className="size-4 text-white" />
                        )}

                        <span className="text-white">
                          {createMutation.isPending
                            ? 'Creating unavailable period...'
                            : 'Create unavailable period'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateDiscardConfirmation && isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(31,27,29,0.60)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-availability-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !createMutation.isPending) {
              setShowCreateDiscardConfirmation(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.98)] p-6 shadow-[0_34px_100px_rgba(27,17,23,0.38)] backdrop-blur-2xl sm:p-7"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-amber-100/55 blur-3xl"
            />

            <div className="relative grid size-12 place-items-center rounded-[1.1rem] bg-amber-50 text-amber-700">
              <CircleAlert className="size-5" />
            </div>

            <p className="relative mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-amber-700">
              Unsaved availability
            </p>

            <h2
              id="discard-availability-title"
              className="relative mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]"
            >
              Discard this unavailable period?
            </h2>

            <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
              You changed the schedule details but have not created the blocked period yet. Closing
              now will restore the default values and remove everything you entered.
            </p>

            <div className="relative mt-5 rounded-[1.25rem] border border-amber-200/70 bg-amber-50/55 p-4">
              <p className="text-xs font-semibold leading-5 text-amber-800">
                No availability block has been saved yet.
              </p>
            </div>

            <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-black"
                onClick={() => {
                  setShowCreateDiscardConfirmation(false);
                }}
              >
                Keep editing
              </button>

              <button
                type="button"
                onClick={discardCreateChanges}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(91,61,82,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
              >
                <X className="size-4 text-white" />
                <span className="text-white">Discard changes</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingBlock ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.58)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-availability-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteMutation.isPending) {
              setDeletingBlock(null);
              deleteMutation.reset();
            }
          }}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/75 bg-[rgba(250,247,248,0.98)] p-6 shadow-[0_34px_100px_rgba(27,17,23,0.38)] backdrop-blur-2xl sm:p-7"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-red-100/65 blur-3xl"
            />

            <div className="relative flex items-start justify-between gap-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-[1.1rem] bg-red-50 text-red-700">
                <Trash2 className="size-5" />
              </div>

              <button
                type="button"
                aria-label="Close remove availability dialog"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setDeletingBlock(null);
                  deleteMutation.reset();
                }}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-white/65 bg-white/42 text-[var(--color-charcoal)]/62 shadow-sm transition hover:bg-white/72 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <p className="relative mt-5 text-[0.65rem] font-black uppercase tracking-[0.16em] text-red-600">
              Availability change
            </p>

            <h2
              id="delete-availability-title"
              className="relative mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] sm:text-3xl"
            >
              Remove this blocked period?
            </h2>

            <p className="relative mt-3 text-sm font-medium leading-7 text-[var(--color-charcoal)]/62">
              Removing this protection makes the selected period available for future booking checks
              again.
            </p>

            <div className="relative mt-5 rounded-[1.35rem] border border-white/65 bg-white/42 p-5 shadow-[0_10px_28px_rgba(35,24,30,0.04)]">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(142,92,103,0.14)] text-[var(--color-rosewood)]">
                  <Ban className="size-4.5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/40">
                    Blocked period
                  </p>

                  <p className="mt-2 text-base font-black leading-7 text-[var(--color-near-black)]">
                    {formatDateTimeRange(deletingBlock.startsAt, deletingBlock.endsAt)}
                  </p>

                  {deletingBlock.reason ? (
                    <div className="mt-3 rounded-[1rem] border border-white/55 bg-white/28 px-3.5 py-3">
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/38">
                        Private reason
                      </p>

                      <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        {deletingBlock.reason}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative mt-5 flex items-start gap-3 rounded-[1.3rem] border border-red-200/80 bg-red-50/70 p-4">
              <CircleAlert className="mt-0.5 size-4.5 shrink-0 text-red-700" />

              <div>
                <p className="text-sm font-black text-red-900">The time becomes available again</p>

                <p className="mt-1 text-xs font-semibold leading-5 text-red-700">
                  This removes only the manual availability block. It does not alter any existing
                  bookings.
                </p>
              </div>
            </div>

            {deleteMutation.isError ? (
              <div
                role="alert"
                className="relative mt-4 flex items-start gap-3 rounded-[1.2rem] border border-red-200 bg-red-50 p-4"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-700" />

                <p className="text-sm font-bold leading-6 text-red-800">
                  {getErrorMessage(
                    deleteMutation.error,
                    'We could not remove this availability block.',
                  )}
                </p>
              </div>
            ) : null}

            <div className="relative mt-6 flex flex-col-reverse gap-3 border-t border-[rgba(93,58,85,0.08)] pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-black"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setDeletingBlock(null);
                  deleteMutation.reset();
                }}
              >
                Keep block
              </button>

              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deletingBlock.id);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-black !text-white shadow-[0_14px_32px_rgba(185,28,28,0.16)] transition hover:-translate-y-0.5 hover:bg-red-800 hover:!text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {deleteMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin text-white" />
                ) : (
                  <Trash2 className="size-4 text-white" />
                )}

                <span className="text-white">
                  {deleteMutation.isPending ? 'Removing block...' : 'Remove blocked period'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
