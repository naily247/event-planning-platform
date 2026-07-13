import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FileText,
  Image,
  LoaderCircle,
  MapPin,
  MessageSquareQuote,
  PackageCheck,
  Pencil,
  PlayCircle,
  RotateCcw,
  Save,
  Sparkles,
  UsersRound,
  WalletCards,
  X,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../lib/api';

type EventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

type CustomerEvent = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: number | null;
  plannedBudget: string | null;
  theme: string | null;
  requirements: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

type UpdateEventPayload = {
  name?: string;
  eventType?: string;
  eventDate?: string;
  location?: string;
  guestCount?: number | null;
  plannedBudget?: number | null;
  theme?: string | null;
  requirements?: string | null;
};

type EventStatusAction = {
  status: EventStatus;
  label: string;
  description: string;
  icon: typeof PlayCircle;
  tone: 'primary' | 'secondary' | 'danger';
};

const eventStatusActions: Record<EventStatus, EventStatusAction[]> = {
  DRAFT: [
    {
      status: 'PLANNING',
      label: 'Start planning',
      description: 'Move this event into the active planning stage.',
      icon: PlayCircle,
      tone: 'primary',
    },
    {
      status: 'CANCELLED',
      label: 'Cancel event',
      description: 'Stop planning and mark this event as cancelled.',
      icon: Ban,
      tone: 'danger',
    },
  ],

  PLANNING: [
    {
      status: 'DRAFT',
      label: 'Move to draft',
      description: 'Return this event to the draft stage.',
      icon: RotateCcw,
      tone: 'secondary',
    },
    {
      status: 'ACTIVE',
      label: 'Activate event',
      description: 'Mark planning as active and ready for execution.',
      icon: PlayCircle,
      tone: 'primary',
    },
    {
      status: 'CANCELLED',
      label: 'Cancel event',
      description: 'Stop planning and mark this event as cancelled.',
      icon: Ban,
      tone: 'danger',
    },
  ],

  ACTIVE: [
    {
      status: 'COMPLETED',
      label: 'Complete event',
      description: 'Mark this event as successfully completed.',
      icon: CheckCircle2,
      tone: 'primary',
    },
    {
      status: 'CANCELLED',
      label: 'Cancel event',
      description: 'Stop the event and mark it as cancelled.',
      icon: Ban,
      tone: 'danger',
    },
  ],

  COMPLETED: [],
  CANCELLED: [],
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const editEventSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Event name must be at least 3 characters.')
    .max(120, 'Event name cannot exceed 120 characters.'),

  eventType: z
    .string()
    .trim()
    .min(2, 'Event type must be at least 2 characters.')
    .max(80, 'Event type cannot exceed 80 characters.'),

  eventDate: z
    .string()
    .min(1, 'Choose the event date and time.')
    .refine(
      (value) => {
        const date = new Date(value);

        return Number.isFinite(date.getTime()) && date.getTime() > Date.now();
      },
      {
        message: 'Event date must be in the future.',
      },
    ),

  location: z
    .string()
    .trim()
    .min(2, 'Location must be at least 2 characters.')
    .max(200, 'Location cannot exceed 200 characters.'),

  guestCount: z.string().refine(
    (value) => {
      if (!value.trim()) {
        return true;
      }

      const guestCount = Number(value);

      return Number.isInteger(guestCount) && guestCount > 0 && guestCount <= 1_000_000;
    },
    {
      message: 'Guest count must be a positive whole number.',
    },
  ),

  plannedBudget: z.string().refine(
    (value) => {
      if (!value.trim()) {
        return true;
      }

      const budget = Number(value);

      return (
        Number.isFinite(budget) &&
        budget > 0 &&
        budget <= 9_999_999_999.99 &&
        Math.abs(budget * 100 - Math.round(budget * 100)) < Number.EPSILON * 100
      );
    },
    {
      message: 'Planned budget must be positive with no more than two decimal places.',
    },
  ),

  theme: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || value.length >= 2,
      'Theme must be at least 2 characters.',
    )
    .refine((value) => value.length <= 200, 'Theme cannot exceed 200 characters.'),

  requirements: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || value.length >= 10,
      'Requirements must be at least 10 characters.',
    )
    .refine((value) => value.length <= 5000, 'Requirements cannot exceed 5000 characters.'),
});

type EditEventFormValues = z.infer<typeof editEventSchema>;

const workspaceSections = [
  {
    label: 'Overview',
    icon: Sparkles,
    active: true,
  },
  {
    label: 'Budget',
    icon: WalletCards,
    active: false,
  },
  {
    label: 'Tasks',
    icon: ClipboardList,
    active: false,
  },
  {
    label: 'Guests',
    icon: UsersRound,
    active: false,
  },
  {
    label: 'Quotations',
    icon: MessageSquareQuote,
    active: false,
  },
  {
    label: 'Bookings',
    icon: PackageCheck,
    active: false,
  },
  {
    label: 'Documents',
    icon: FileText,
    active: false,
  },
  {
    label: 'Mood board',
    icon: Image,
    active: false,
  },
];

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'Something went wrong. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'Something went wrong. Please check your details and try again.'
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatCurrency = (value: string | null) => {
  if (!value) {
    return 'Not set';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusTone = (status: EventStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'blue';

    case 'PLANNING':
      return 'plum';

    case 'COMPLETED':
      return 'green';

    case 'CANCELLED':
      return 'rose';

    case 'DRAFT':
    default:
      return 'gray';
  }
};

const toLocalDateTimeInput = (value: string) => {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getMinimumDateTime = () => {
  const minimumDate = new Date(Date.now() + 60 * 60 * 1000);
  const timezoneOffset = minimumDate.getTimezoneOffset() * 60_000;

  return new Date(minimumDate.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getEditFormValues = (event: CustomerEvent): EditEventFormValues => ({
  name: event.name,
  eventType: event.eventType,
  eventDate: toLocalDateTimeInput(event.eventDate),
  location: event.location,
  guestCount: event.guestCount === null ? '' : String(event.guestCount),
  plannedBudget: event.plannedBudget ?? '',
  theme: event.theme ?? '',
  requirements: event.requirements ?? '',
});

const buildUpdatePayload = (
  event: CustomerEvent,
  values: EditEventFormValues,
): UpdateEventPayload => {
  const payload: UpdateEventPayload = {};

  const name = values.name.trim();
  const eventType = values.eventType.trim();
  const eventDate = new Date(values.eventDate).toISOString();
  const location = values.location.trim();
  const guestCount = values.guestCount.trim() ? Number(values.guestCount) : null;
  const plannedBudget = values.plannedBudget.trim() ? Number(values.plannedBudget) : null;
  const theme = values.theme.trim() || null;
  const requirements = values.requirements.trim() || null;

  if (name !== event.name) {
    payload.name = name;
  }

  if (eventType !== event.eventType) {
    payload.eventType = eventType;
  }

  if (new Date(eventDate).getTime() !== new Date(event.eventDate).getTime()) {
    payload.eventDate = eventDate;
  }

  if (location !== event.location) {
    payload.location = location;
  }

  if (guestCount !== event.guestCount) {
    payload.guestCount = guestCount;
  }

  const currentBudget = event.plannedBudget === null ? null : Number(event.plannedBudget);

  if (plannedBudget !== currentBudget) {
    payload.plannedBudget = plannedBudget;
  }

  if (theme !== event.theme) {
    payload.theme = theme;
  }

  if (requirements !== event.requirements) {
    payload.requirements = requirements;
  }

  return payload;
};

export function EventWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const form = useForm<EditEventFormValues>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      name: '',
      eventType: '',
      eventDate: '',
      location: '',
      guestCount: '',
      plannedBudget: '',
      theme: '',
      requirements: '',
    },
  });

  const eventQuery = useQuery({
    queryKey: ['customer', 'events', eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const response = await api.get<ApiSuccessResponse<CustomerEvent>>(`/events/${eventId}`);

      return response.data.data;
    },
  });

  useEffect(() => {
    if (eventQuery.data && isEditFormOpen) {
      form.reset(getEditFormValues(eventQuery.data));
    }
  }, [eventQuery.data, form, isEditFormOpen]);

  const updateEventMutation = useMutation({
    mutationFn: async (payload: UpdateEventPayload) => {
      const response = await api.patch<ApiSuccessResponse<CustomerEvent>>(
        `/events/${eventId}`,
        payload,
      );

      return response.data.data;
    },

    onSuccess: async (updatedEvent) => {
      queryClient.setQueryData(['customer', 'events', eventId], updatedEvent);

      setIsEditFormOpen(false);
      form.reset(getEditFormValues(updatedEvent));

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events'],
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'customer'],
        }),
      ]);
    },
  });

  const updateEventStatusMutation = useMutation({
    mutationFn: async (status: EventStatus) => {
      const response = await api.patch<ApiSuccessResponse<CustomerEvent>>(
        `/events/${eventId}/status`,
        {
          status,
        },
      );

      return response.data.data;
    },

    onSuccess: async (updatedEvent) => {
      queryClient.setQueryData(['customer', 'events', eventId], updatedEvent);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events'],
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'customer'],
        }),
      ]);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/events/${eventId}`);
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events'],
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'customer'],
        }),
      ]);

      navigate('/events', {
        replace: true,
      });
    },
  });

  const openEditForm = () => {
    if (!eventQuery.data) {
      return;
    }

    updateEventMutation.reset();
    form.clearErrors();
    form.reset(getEditFormValues(eventQuery.data));
    setIsEditFormOpen(true);
  };

  const closeEditForm = () => {
    if (updateEventMutation.isPending) {
      return;
    }

    updateEventMutation.reset();
    form.clearErrors();
    setIsEditFormOpen(false);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (!eventQuery.data) {
      return;
    }

    const payload = buildUpdatePayload(eventQuery.data, values);

    if (Object.keys(payload).length === 0) {
      form.setError('root', {
        type: 'manual',
        message: 'No event details were changed.',
      });

      return;
    }

    updateEventMutation.mutate(payload);
  });

  if (eventQuery.isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your event workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading event details and preparing the planning overview.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Event workspace unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {eventId ? getApiErrorMessage(eventQuery.error) : 'The event address is invalid.'}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {eventId ? (
                <button
                  type="button"
                  className="btn-primary text-sm font-bold"
                  onClick={() => {
                    void eventQuery.refetch();
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

  const event = eventQuery.data;
  const isEventEditable = event.status !== 'COMPLETED' && event.status !== 'CANCELLED';

  const availableStatusActions = eventStatusActions[event.status];

  const canDeleteEvent = event.status === 'DRAFT' || event.status === 'CANCELLED';

  const getStatusButtonClassName = (tone: EventStatusAction['tone']) => {
    if (tone === 'primary') {
      return 'btn-primary w-full justify-center text-sm font-bold';
    }

    if (tone === 'danger') {
      return 'w-full rounded-2xl border border-[rgba(124,74,90,0.28)] bg-[rgba(124,74,90,0.12)] px-4 py-3 text-sm font-black text-[#fffaf5] transition hover:bg-[rgba(124,74,90,0.22)] disabled:cursor-not-allowed disabled:opacity-60';
    }

    return 'w-full rounded-2xl border border-white/24 bg-white/12 px-4 py-3 text-sm font-black text-[#fffaf5] backdrop-blur transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60';
  };

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/events"
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to events"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Event workspace
              </p>

              <p className="mt-1 font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                {event.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary text-sm font-bold"
            disabled={!isEventEditable}
            title={
              isEventEditable
                ? 'Edit event details'
                : 'Completed or cancelled events cannot be edited'
            }
            onClick={openEditForm}
          >
            <Pencil className="size-4" />
            Edit event
          </button>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[7%] top-10 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-16 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="soft-chip w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                    <Sparkles className="size-4" />
                    {event.eventType}
                  </div>

                  <span className="status-chip" data-tone={getStatusTone(event.status)}>
                    {event.status.replaceAll('_', ' ')}
                  </span>
                </div>

                <h1 className="mt-6 max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  {event.name}
                </h1>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  {event.requirements ??
                    'Build the event plan, coordinate vendors and keep every important detail together in one workspace.'}
                </p>
              </div>

              <div className="glass-card p-5">
                <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Event date</p>

                <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {formatEventDate(event.eventDate)}
                </p>

                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-rosewood)]">
                  <MapPin className="size-4" />
                  {event.location}
                </p>
              </div>
            </div>
          </section>

          <nav
            className="glass-card mt-10 flex gap-2 overflow-x-auto p-3"
            aria-label="Event workspace sections"
          >
            {workspaceSections.map(({ label, icon: Icon, active }) => {
              if (label === 'Budget') {
                return (
                  <Link
                    key={label}
                    to={`/events/${event.id}/budget`}
                    className="soft-chip shrink-0 transition hover:bg-[rgba(93,58,85,0.92)] hover:text-[#fffaf5]"
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                );
              }

              if (label === 'Guests') {
                return (
                  <Link
                    key={label}
                    to={`/events/${event.id}/guests`}
                    className="soft-chip shrink-0 transition hover:bg-[rgba(93,58,85,0.92)] hover:text-[#fffaf5]"
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                );
              }

              return (
                <button
                  key={label}
                  type="button"
                  className={
                    active
                      ? 'soft-chip shrink-0 bg-[rgba(93,58,85,0.92)] text-[#fffaf5]'
                      : 'soft-chip shrink-0'
                  }
                  disabled={!active}
                  title={
                    active
                      ? `${label} section`
                      : `${label} will be connected in the next workspace phases`
                  }
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </nav>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="glass-card p-6 sm:p-7">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Event overview
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                The essential details for this celebration.
              </h2>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-white/28 p-5 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                    <CalendarDays className="size-4 text-[var(--color-rosewood)]" />
                    Date and time
                  </div>

                  <p className="mt-4 font-black text-[var(--color-near-black)]">
                    {formatEventDate(event.eventDate)}
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-white/28 p-5 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                    <MapPin className="size-4 text-[var(--color-rosewood)]" />
                    Location
                  </div>

                  <p className="mt-4 font-black text-[var(--color-near-black)]">{event.location}</p>
                </div>

                <div className="rounded-[1.5rem] bg-white/28 p-5 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                    <UsersRound className="size-4 text-[var(--color-rosewood)]" />
                    Estimated guests
                  </div>

                  <p className="mt-4 font-black text-[var(--color-near-black)]">
                    {event.guestCount ?? 'Not set'}
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-white/28 p-5 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                    <WalletCards className="size-4 text-[var(--color-rosewood)]" />
                    Planned budget
                  </div>

                  <p className="mt-4 font-black text-[var(--color-near-black)]">
                    {formatCurrency(event.plannedBudget)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl">
                <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                  Theme and creative direction
                </p>

                <p className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {event.theme ?? 'No theme added yet'}
                </p>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/55 bg-white/24 p-5 backdrop-blur-2xl">
                <p className="text-sm font-bold text-[var(--color-charcoal)]/58">
                  Planning requirements
                </p>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/68">
                  {event.requirements ?? 'No additional planning requirements have been added yet.'}
                </p>
              </div>
            </article>

            <aside className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
              <Sparkles className="size-6 text-[var(--color-powder-blue)]" />

              <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">Planning workspace</h2>

              <p className="mt-3 leading-7 text-white/68">
                Budgets, tasks, guests, vendors and documents will connect to this event as we build
                each workspace section.
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-white/16 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/54">
                  Event status
                </p>

                <p className="mt-2 text-xl font-black">{event.status.replaceAll('_', ' ')}</p>

                {availableStatusActions.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {availableStatusActions.map(
                      ({ status, label, description, icon: Icon, tone }) => (
                        <div key={status}>
                          <button
                            type="button"
                            className={getStatusButtonClassName(tone)}
                            disabled={updateEventStatusMutation.isPending}
                            onClick={() => {
                              updateEventStatusMutation.mutate(status);
                            }}
                          >
                            {updateEventStatusMutation.isPending ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Icon className="size-4" />
                            )}

                            {label}
                          </button>

                          <p className="mt-2 px-1 text-xs font-semibold leading-5 text-white/48">
                            {description}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-semibold leading-6 text-white/58">
                    This event has reached its final status. No further status changes are
                    available.
                  </p>
                )}

                {updateEventStatusMutation.isError ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-2xl border border-white/16 bg-black/12 px-4 py-3 text-sm font-bold leading-6 text-white/78"
                  >
                    {getApiErrorMessage(updateEventStatusMutation.error)}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/16 bg-black/10 p-4 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/54">
                  Danger zone
                </p>

                <p className="mt-3 text-sm font-semibold leading-6 text-white/60">
                  Only draft or cancelled events without quotation requests or bookings can be
                  deleted.
                </p>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canDeleteEvent}
                  onClick={() => {
                    deleteEventMutation.reset();
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete event
                </button>
              </div>

              <div className="mt-8 space-y-3">
                {workspaceSections.slice(1, 5).map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-sm font-bold backdrop-blur"
                  >
                    <Icon className="size-4 text-[var(--color-powder-blue)]" />
                    {label}
                  </div>
                ))}
              </div>
            </aside>
          </section>
        </main>
      </div>

      {isEditFormOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.42)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-event-title"
        >
          <div className="mx-auto max-w-3xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Pencil className="size-4" />
                    Edit event
                  </div>

                  <h2
                    id="edit-event-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    Refine your event details.
                  </h2>

                  <p className="mt-3 max-w-xl leading-7 text-[var(--color-charcoal)]/66">
                    Update the essential information that guides the rest of this event workspace.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close edit event form"
                  disabled={updateEventMutation.isPending}
                  onClick={closeEditForm}
                >
                  <X className="size-5" />
                </button>
              </div>

              <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Event name
                    </span>

                    <input
                      className="form-field"
                      type="text"
                      disabled={updateEventMutation.isPending}
                      {...form.register('name')}
                    />

                    {form.formState.errors.name ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {form.formState.errors.name.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Event type
                    </span>

                    <input
                      className="form-field"
                      type="text"
                      disabled={updateEventMutation.isPending}
                      {...form.register('eventType')}
                    />

                    {form.formState.errors.eventType ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {form.formState.errors.eventType.message}
                      </span>
                    ) : null}
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Date and time
                    </span>

                    <input
                      className="form-field"
                      type="datetime-local"
                      min={getMinimumDateTime()}
                      disabled={updateEventMutation.isPending}
                      {...form.register('eventDate')}
                    />

                    {form.formState.errors.eventDate ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {form.formState.errors.eventDate.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Location
                    </span>

                    <input
                      className="form-field"
                      type="text"
                      disabled={updateEventMutation.isPending}
                      {...form.register('location')}
                    />

                    {form.formState.errors.location ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {form.formState.errors.location.message}
                      </span>
                    ) : null}
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Estimated guests
                    </span>

                    <input
                      className="form-field"
                      type="number"
                      min="1"
                      step="1"
                      disabled={updateEventMutation.isPending}
                      {...form.register('guestCount')}
                    />

                    {form.formState.errors.guestCount ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {form.formState.errors.guestCount.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Planned budget
                    </span>

                    <input
                      className="form-field"
                      type="number"
                      min="0.01"
                      step="0.01"
                      disabled={updateEventMutation.isPending}
                      {...form.register('plannedBudget')}
                    />

                    {form.formState.errors.plannedBudget ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {form.formState.errors.plannedBudget.message}
                      </span>
                    ) : null}
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Theme
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    disabled={updateEventMutation.isPending}
                    {...form.register('theme')}
                  />

                  {form.formState.errors.theme ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {form.formState.errors.theme.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Planning requirements
                  </span>

                  <textarea
                    className="form-field min-h-32 resize-y"
                    disabled={updateEventMutation.isPending}
                    {...form.register('requirements')}
                  />

                  {form.formState.errors.requirements ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {form.formState.errors.requirements.message}
                    </span>
                  ) : null}
                </label>

                {form.formState.errors.root?.message ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {form.formState.errors.root.message}
                  </div>
                ) : null}

                {updateEventMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(updateEventMutation.error)}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={updateEventMutation.isPending}
                    onClick={closeEditForm}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={updateEventMutation.isPending}
                  >
                    {updateEventMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}

                    {updateEventMutation.isPending ? 'Saving changes...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      {isDeleteDialogOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-title"
        >
          <div className="glass-card w-full max-w-lg p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Trash2 className="size-7" />
            </div>

            <h2
              id="delete-event-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Delete {event.name}?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              This permanently removes the event and cannot be undone.
            </p>

            {deleteEventMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(deleteEventMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={deleteEventMutation.isPending}
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  deleteEventMutation.reset();
                }}
              >
                Keep event
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteEventMutation.isPending}
                onClick={() => {
                  deleteEventMutation.mutate();
                }}
              >
                {deleteEventMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteEventMutation.isPending ? 'Deleting event...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
