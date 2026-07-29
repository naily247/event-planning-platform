import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';
import {
  createVendorAvailabilityBlock,
  deleteVendorAvailabilityBlock,
  getVendorAvailability,
  type VendorAvailabilityBlock,
  type VendorAvailabilityBooking,
} from '../features/vendors/vendor.api';

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

    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createMutation.isPending) {
      return;
    }

    createMutation.reset();
    form.clearErrors();
    setIsCreateDialogOpen(false);
  };

  const onSubmit = form.handleSubmit((values) => {
    createMutation.mutate(values);
  });

  if (availabilityQuery.isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
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
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
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
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Vendor workspace
              </p>

              <p className="mt-1 font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                Availability management
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary text-sm font-bold"
            onClick={openCreateDialog}
          >
            <Plus className="size-4" />
            Block unavailable time
          </button>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <main className="py-10">
          <section className="grid gap-6 lg:grid-cols-[1fr_0.4fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <CalendarRange className="size-4" />
                Availability
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                Protect your schedule before the next booking arrives.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-charcoal)]/70">
                Review committed bookings and block periods when your business is unavailable.
                Eventure prevents overlapping bookings and conflicting schedule blocks.
              </p>
            </div>

            <article className="glass-card overflow-hidden p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                    Schedule overview
                  </p>

                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Next 90 days
                  </h2>
                </div>

                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                  <CalendarRange className="size-5" />
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-[var(--color-charcoal)]/60">
                A quick view of confirmed commitments and time you have manually protected.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[1.35rem] border border-white/50 bg-white/28 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-[rgba(175,201,216,0.3)] text-[#334954]">
                      <BriefcaseBusiness className="size-4" />
                    </div>

                    <span className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/40">
                      Committed
                    </span>
                  </div>

                  <p className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {availability.bookings.length}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/48">
                    Scheduled bookings
                  </p>
                </div>

                <div className="rounded-[1.35rem] border border-white/50 bg-white/28 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-[rgba(142,92,103,0.14)] text-[var(--color-rosewood)]">
                      <Ban className="size-4" />
                    </div>

                    <span className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/40">
                      Protected
                    </span>
                  </div>

                  <p className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {availability.blocks.length}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/48">
                    Blocked periods
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 border-t border-white/48 pt-5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(91,61,82,0.11)] text-[var(--color-deep-plum)]">
                  <Clock3 className="size-3.5" />
                </span>

                <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                  Eventure checks these periods before allowing new bookings to proceed.
                </p>
              </div>
            </article>
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="glass-card p-6 sm:p-7">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Schedule timeline
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Upcoming bookings and unavailable periods
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-[var(--color-charcoal)]/64">
                  Booking periods are created automatically. Manual blocks can be removed whenever
                  your schedule changes.
                </p>
              </div>

              {timelineItems.length > 0 ? (
                <div className="mt-7 space-y-4">
                  {timelineItems.map((item, index) => {
                    if (item.type === 'BOOKING') {
                      return (
                        <div
                          key={`booking-${item.id}`}
                          className="group relative overflow-hidden rounded-[1.65rem] border border-[rgba(93,58,85,0.12)] bg-white/28 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.2)] hover:bg-white/36 hover:shadow-[0_18px_45px_rgba(35,24,30,0.08)]"
                        >
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[rgba(92,139,164,0.62)]" />

                          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                            <div className="flex min-w-0 items-start gap-4">
                              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.34)] text-[#334954] shadow-[0_10px_25px_rgba(51,73,84,0.08)]">
                                <BriefcaseBusiness className="size-5" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#526f7d]">
                                    Scheduled booking
                                  </p>

                                  {index === 0 ? (
                                    <span className="rounded-full bg-[rgba(175,201,216,0.28)] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#405d69]">
                                      Next
                                    </span>
                                  ) : null}
                                </div>

                                <p className="mt-3 text-base font-black leading-7 text-[var(--color-near-black)]">
                                  {formatDateTimeRange(item.startsAt, item.endsAt)}
                                </p>

                                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-charcoal)]/52">
                                    <CalendarDays className="size-3.5 text-[#526f7d]" />
                                    Reserved through Eventure
                                  </span>

                                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-charcoal)]/52">
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

                          <div className="mt-5 flex items-start gap-3 rounded-[1.2rem] border border-white/48 bg-white/24 px-4 py-3">
                            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(175,201,216,0.26)] text-[#405d69]">
                              <CircleAlert className="size-3.5" />
                            </span>

                            <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                              This period belongs to an existing booking and cannot be manually
                              removed from availability.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`block-${item.id}`}
                        className="group relative overflow-hidden rounded-[1.65rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.065)] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.26)] hover:bg-[rgba(124,74,90,0.09)] hover:shadow-[0_18px_45px_rgba(35,24,30,0.08)]"
                      >
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[rgba(142,92,103,0.7)]" />

                        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(142,92,103,0.16)] text-[var(--color-rosewood)] shadow-[0_10px_25px_rgba(124,74,90,0.08)]">
                              <Ban className="size-5" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                                  Unavailable period
                                </p>

                                {index === 0 ? (
                                  <span className="rounded-full bg-[rgba(142,92,103,0.14)] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--color-rosewood)]">
                                    Next
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-3 text-base font-black leading-7 text-[var(--color-near-black)]">
                                {formatDateTimeRange(item.startsAt, item.endsAt)}
                              </p>

                              <div className="mt-4 rounded-[1.15rem] border border-white/44 bg-white/22 px-4 py-3">
                                <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/42">
                                  Private reason
                                </p>

                                <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                                  {item.block.reason ??
                                    'No reason was added for this blocked period.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-2.5 text-xs font-black text-[var(--color-muted-burgundy)] transition duration-300 hover:border-[rgba(124,74,90,0.28)] hover:bg-[rgba(124,74,90,0.16)] sm:size-10 sm:px-0"
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
                <div className="mt-7 grid min-h-72 place-items-center rounded-[1.75rem] border border-dashed border-[rgba(93,58,85,0.20)] bg-white/18 p-10 text-center">
                  <div className="max-w-md">
                    <CalendarDays className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                    <h3 className="mt-4 text-2xl font-black text-[var(--color-near-black)]">
                      Your schedule is clear
                    </h3>

                    <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      There are no committed bookings or manually blocked periods within the next 90
                      days.
                    </p>
                  </div>
                </div>
              )}
            </article>

            <aside className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
              <Clock3 className="size-6 text-[var(--color-powder-blue)]" />

              <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Schedule rules</h2>

              <p className="mt-3 leading-7 text-white/68">
                Eventure checks availability before a booking is created and again before the vendor
                confirms it.
              </p>

              <div className="mt-8 space-y-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="font-black">No overlapping blocks</p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                    A new blocked period cannot overlap an existing manual block.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="font-black">Bookings are protected</p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                    You cannot block time already reserved by a committed booking.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="font-black">Future periods only</p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                    Availability blocks must begin in the future and end after they start.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/14 px-4 py-3 text-sm font-black backdrop-blur transition hover:bg-white/20"
                onClick={openCreateDialog}
              >
                <Plus className="size-4" />
                Add unavailable period
              </button>
            </aside>
          </section>
        </main>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-availability-title"
          onClick={closeCreateDialog}
        >
          <div
            className="mx-auto max-w-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="glass-card p-6 sm:p-8">
              <div>
                <div className="flex items-start justify-between gap-5">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="grid size-14 shrink-0 place-items-center rounded-[1.25rem] bg-[rgba(142,92,103,0.14)] text-[var(--color-rosewood)] shadow-[0_12px_30px_rgba(124,74,90,0.09)]">
                      <Ban className="size-6" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                        Availability control
                      </p>

                      <h2
                        id="create-availability-title"
                        className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                      >
                        Protect a period in your schedule.
                      </h2>

                      <p className="mt-3 max-w-xl leading-7 text-[var(--color-charcoal)]/66">
                        Prevent customers from requesting or confirming bookings while your business
                        is unavailable.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition duration-300 hover:bg-white/42 hover:text-[var(--color-near-black)]"
                    aria-label="Close availability block dialog"
                    disabled={createMutation.isPending}
                    onClick={closeCreateDialog}
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/50 bg-white/24 p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.2)] text-[var(--color-deep-plum)]">
                      <CalendarDays className="size-4" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Choose an exact period
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                        Add the precise start and end date for your absence.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/50 bg-white/24 p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#405d69]">
                      <Clock3 className="size-4" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Existing bookings stay safe
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                        Eventure prevents blocks from conflicting with committed work.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                        Starts
                      </span>

                      <CalendarDays className="size-4 text-[var(--color-deep-plum)]/70" />
                    </div>

                    <input
                      className="form-field"
                      type="datetime-local"
                      min={getMinimumDateTime()}
                      disabled={createMutation.isPending}
                      {...form.register('startsAt')}
                    />

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                      Select when this unavailable period begins.
                    </p>

                    {form.formState.errors.startsAt ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {form.formState.errors.startsAt.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                        Ends
                      </span>

                      <Clock3 className="size-4 text-[var(--color-deep-plum)]/70" />
                    </div>

                    <input
                      className="form-field"
                      type="datetime-local"
                      min={getMinimumDateTime()}
                      disabled={createMutation.isPending}
                      {...form.register('endsAt')}
                    />

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/46">
                      The end must be later than the selected start time.
                    </p>

                    {form.formState.errors.endsAt ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {form.formState.errors.endsAt.message}
                      </span>
                    ) : null}
                  </label>
                </div>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                      Reason
                    </span>

                    <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                      {(form.watch('reason') ?? '').length}/500
                    </span>
                  </div>

                  <textarea
                    className="form-field min-h-36 resize-y"
                    placeholder="Annual leave, equipment maintenance, family event, venue inspection, team training..."
                    maxLength={500}
                    disabled={createMutation.isPending}
                    {...form.register('reason')}
                  />

                  <div className="mt-2 flex items-start gap-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" />

                    <span>
                      This note is optional and remains private to your vendor workspace. Customers
                      will never see it.
                    </span>
                  </div>

                  {form.formState.errors.reason ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {form.formState.errors.reason.message}
                    </span>
                  ) : null}
                </label>

                {createMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {getErrorMessage(
                      createMutation.error,
                      'We could not create this availability block.',
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={createMutation.isPending}
                    onClick={closeCreateDialog}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}

                    {createMutation.isPending ? 'Creating block...' : 'Create unavailable period'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {deletingBlock ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-availability-title"
          onClick={() => {
            if (!deleteMutation.isPending) {
              setDeletingBlock(null);
              deleteMutation.reset();
            }
          }}
        >
          <div
            className="glass-card w-full max-w-lg p-6 sm:p-8"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Trash2 className="size-7" />
            </div>

            <h2
              id="delete-availability-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Remove this blocked period?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              Your schedule will become available again during:
            </p>

            <div className="mt-4 rounded-2xl bg-white/28 p-4">
              <p className="font-black text-[var(--color-near-black)]">
                {formatDateTimeRange(deletingBlock.startsAt, deletingBlock.endsAt)}
              </p>

              {deletingBlock.reason ? (
                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/58">
                  {deletingBlock.reason}
                </p>
              ) : null}
            </div>

            {deleteMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getErrorMessage(
                  deleteMutation.error,
                  'We could not remove this availability block.',
                )}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
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
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deletingBlock.id);
                }}
              >
                {deleteMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteMutation.isPending ? 'Removing block...' : 'Remove blocked period'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
