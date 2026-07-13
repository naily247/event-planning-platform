import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPin,
  Plus,
  Sparkles,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
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

type EventPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type EventsResponse = {
  success: true;
  data: CustomerEvent[];
  meta: {
    pagination: EventPagination;
  };
};

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const createEventFormSchema = z.object({
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

      return Number.isFinite(budget) && budget > 0 && budget <= 9_999_999_999.99;
    },
    {
      message: 'Planned budget must be greater than zero.',
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

type CreateEventFormValues = z.infer<typeof createEventFormSchema>;

type CreateEventPayload = {
  name: string;
  eventType: string;
  eventDate: string;
  location: string;
  guestCount?: number;
  plannedBudget?: number;
  theme?: string;
  requirements?: string;
};

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

const getMinimumDateTime = () => {
  const minimumDate = new Date(Date.now() + 60 * 60 * 1000);
  const timezoneOffset = minimumDate.getTimezoneOffset() * 60_000;

  return new Date(minimumDate.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

export function EventsPage() {
  const queryClient = useQueryClient();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const navigate = useNavigate();

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventFormSchema),
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

  const eventsQuery = useQuery({
    queryKey: ['customer', 'events'],
    queryFn: async () => {
      const response = await api.get<EventsResponse>('/events', {
        params: {
          page: 1,
          limit: 20,
          sort: 'upcoming',
        },
      });

      return {
        events: response.data.data,
        pagination: response.data.meta.pagination,
      };
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (payload: CreateEventPayload) => {
      const response = await api.post<ApiSuccessResponse<CustomerEvent>>('/events', payload);

      return response.data.data;
    },

    onSuccess: async () => {
      form.reset();
      setIsCreateFormOpen(false);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'customer'],
        }),
      ]);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createEventMutation.mutate({
      name: values.name.trim(),
      eventType: values.eventType.trim(),
      eventDate: new Date(values.eventDate).toISOString(),
      location: values.location.trim(),

      ...(values.guestCount.trim() && {
        guestCount: Number(values.guestCount),
      }),

      ...(values.plannedBudget.trim() && {
        plannedBudget: Number(values.plannedBudget),
      }),

      ...(values.theme.trim() && {
        theme: values.theme.trim(),
      }),

      ...(values.requirements.trim() && {
        requirements: values.requirements.trim(),
      }),
    });
  });

  const closeCreateForm = () => {
    if (createEventMutation.isPending) {
      return;
    }

    form.reset();
    createEventMutation.reset();
    setIsCreateFormOpen(false);
  };

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
                Customer workspace
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                Your events
              </h1>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary text-sm font-bold"
            onClick={() => {
              setIsCreateFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Create event
          </button>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[8%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl" />

            <div className="relative">
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <Sparkles className="size-4" />
                Event planning
              </div>

              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div>
                  <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                    Every celebration, organised in one calm place.
                  </h2>

                  <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                    Create events, track their details and open each workspace as your planning
                    journey grows.
                  </p>
                </div>

                <div className="glass-card min-w-56 p-5">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Total events</p>

                  <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {eventsQuery.data?.pagination.total ?? 0}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[var(--color-rosewood)]">
                    Across every planning stage
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10">
            {eventsQuery.isLoading ? (
              <div className="glass-card grid min-h-80 place-items-center p-10 text-center">
                <div>
                  <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

                  <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                    Loading your events
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
                    Gathering upcoming and recent event details.
                  </p>
                </div>
              </div>
            ) : null}

            {eventsQuery.isError ? (
              <div className="glass-card grid min-h-80 place-items-center p-10 text-center">
                <div className="max-w-lg">
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
                    <CircleAlert className="size-7" />
                  </div>

                  <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                    Events unavailable
                  </p>

                  <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                    {getApiErrorMessage(eventsQuery.error)}
                  </p>

                  <button
                    type="button"
                    className="btn-primary mt-6 text-sm font-bold"
                    onClick={() => {
                      void eventsQuery.refetch();
                    }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : null}

            {!eventsQuery.isLoading &&
            !eventsQuery.isError &&
            eventsQuery.data?.events.length === 0 ? (
              <div className="glass-card grid min-h-80 place-items-center p-10 text-center">
                <div className="max-w-lg">
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                    <CalendarDays className="size-7" />
                  </div>

                  <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                    Create your first event
                  </p>

                  <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                    Add the essential details now. Budgets, tasks, guests, vendors and documents
                    will build around this event workspace.
                  </p>

                  <button
                    type="button"
                    className="btn-primary mt-6 text-sm font-bold"
                    onClick={() => {
                      setIsCreateFormOpen(true);
                    }}
                  >
                    <Plus className="size-4" />
                    Create event
                  </button>
                </div>
              </div>
            ) : null}

            {!eventsQuery.isLoading &&
            !eventsQuery.isError &&
            eventsQuery.data &&
            eventsQuery.data.events.length > 0 ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {eventsQuery.data.events.map((event) => (
                  <article key={event.id} className="luxe-card flex flex-col p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                        <CalendarDays className="size-6" />
                      </div>

                      <span className="status-chip" data-tone={getStatusTone(event.status)}>
                        {event.status.replaceAll('_', ' ')}
                      </span>
                    </div>

                    <p className="mt-7 text-sm font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                      {event.eventType}
                    </p>

                    <h3 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                      {event.name}
                    </h3>

                    {event.theme ? (
                      <p className="mt-3 text-sm font-semibold text-[var(--color-deep-plum)]">
                        {event.theme}
                      </p>
                    ) : null}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/28 p-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                          <Clock3 className="size-4 text-[var(--color-rosewood)]" />
                          Event date
                        </div>

                        <p className="mt-3 font-black text-[var(--color-near-black)]">
                          {formatEventDate(event.eventDate)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/28 p-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                          <MapPin className="size-4 text-[var(--color-rosewood)]" />
                          Location
                        </div>

                        <p className="mt-3 font-black text-[var(--color-near-black)]">
                          {event.location}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/28 p-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                          <UsersRound className="size-4 text-[var(--color-rosewood)]" />
                          Guests
                        </div>

                        <p className="mt-3 font-black text-[var(--color-near-black)]">
                          {event.guestCount ?? 'Not set'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/28 p-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-charcoal)]/58">
                          <WalletCards className="size-4 text-[var(--color-rosewood)]" />
                          Planned budget
                        </div>

                        <p className="mt-3 font-black text-[var(--color-near-black)]">
                          {formatCurrency(event.plannedBudget)}
                        </p>
                      </div>
                    </div>

                    {event.requirements ? (
                      <p className="mt-5 line-clamp-3 leading-7 text-[var(--color-charcoal)]/66">
                        {event.requirements}
                      </p>
                    ) : null}

                    <div className="mt-auto pt-7">
                      <button
                        type="button"
                        className="btn-secondary w-full justify-center text-sm font-bold"
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        Open event workspace
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {isCreateFormOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.42)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-title"
        >
          <div className="mx-auto max-w-3xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Sparkles className="size-4" />
                    New event
                  </div>

                  <h2
                    id="create-event-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    Create your event workspace.
                  </h2>

                  <p className="mt-3 max-w-xl leading-7 text-[var(--color-charcoal)]/66">
                    Start with the essential details. You can expand the plan with budgets, guests,
                    tasks and vendors afterward.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close create event form"
                  onClick={closeCreateForm}
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
                      placeholder="Emma and Daniel Wedding"
                      type="text"
                      disabled={createEventMutation.isPending}
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
                      placeholder="Wedding"
                      type="text"
                      disabled={createEventMutation.isPending}
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
                      disabled={createEventMutation.isPending}
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
                      placeholder="Colombo"
                      type="text"
                      disabled={createEventMutation.isPending}
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
                      placeholder="150"
                      type="number"
                      min="1"
                      step="1"
                      disabled={createEventMutation.isPending}
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
                      placeholder="1500000"
                      type="number"
                      min="0.01"
                      step="0.01"
                      disabled={createEventMutation.isPending}
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
                    placeholder="Modern ivory and plum"
                    type="text"
                    disabled={createEventMutation.isPending}
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
                    placeholder="Describe the event style, services and important details..."
                    disabled={createEventMutation.isPending}
                    {...form.register('requirements')}
                  />

                  {form.formState.errors.requirements ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {form.formState.errors.requirements.message}
                    </span>
                  ) : null}
                </label>

                {createEventMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(createEventMutation.error)}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={createEventMutation.isPending}
                    onClick={closeCreateForm}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={createEventMutation.isPending}
                  >
                    {createEventMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}

                    {createEventMutation.isPending ? 'Creating event...' : 'Create event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
