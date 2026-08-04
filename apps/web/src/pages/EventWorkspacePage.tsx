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
  MailCheck,
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
  Star,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../lib/api';
import { PageBackButton } from '../components/navigation/PageBackButton';

type EventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type SnapshotCardKey = 'date' | 'location' | 'guests' | 'budget' | 'theme';

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
    path: (eventId: string) => `/events/${eventId}`,
  },
  {
    label: 'Budget',
    icon: WalletCards,
    path: (eventId: string) => `/events/${eventId}/budget`,
  },
  {
    label: 'Tasks',
    icon: ClipboardList,
    path: (eventId: string) => `/events/${eventId}/tasks`,
  },
  {
    label: 'Guests',
    icon: UsersRound,
    path: (eventId: string) => `/events/${eventId}/guests`,
  },
  {
    label: 'Invitations',
    icon: MailCheck,
    path: (eventId: string) => `/events/${eventId}/invitations`,
  },
  {
    label: 'Quotations',
    icon: MessageSquareQuote,
    path: (eventId: string) => `/events/${eventId}/quotations`,
  },
  {
    label: 'Bookings',
    icon: PackageCheck,
    path: (eventId: string) => `/events/${eventId}/bookings`,
  },
  {
    label: 'Reviews',
    icon: Star,
    path: (eventId: string) => `/events/${eventId}/reviews`,
  },
  {
    label: 'Complaints',
    icon: ShieldAlert,
    path: (eventId: string) => `/events/${eventId}/complaints`,
  },
  {
    label: 'Documents',
    icon: FileText,
    path: (eventId: string) => `/events/${eventId}/documents`,
  },
  {
    label: 'Mood board',
    icon: Image,
    path: (eventId: string) => `/events/${eventId}/mood-board`,
  },
];
type WorkspaceHeroTheme = {
  background: string;
  accent: string;
  softGlow: string;
  motif:
    | 'birthday'
    | 'wedding'
    | 'graduation'
    | 'corporate'
    | 'party'
    | 'baby'
    | 'engagement'
    | 'festival'
    | 'default';
};

const workspaceHeroThemes: Record<string, WorkspaceHeroTheme> = {
  birthday: {
    background:
      'linear-gradient(118deg, rgba(255,250,246,0.98) 0%, rgba(248,239,245,0.96) 54%, rgba(226,207,224,0.88) 100%)',
    accent: 'rgba(183,167,200,0.30)',
    softGlow: 'rgba(220,177,194,0.22)',
    motif: 'birthday',
  },

  wedding: {
    background:
      'linear-gradient(118deg, rgba(255,251,247,0.98) 0%, rgba(250,240,242,0.96) 54%, rgba(231,208,215,0.88) 100%)',
    accent: 'rgba(199,167,181,0.28)',
    softGlow: 'rgba(230,196,201,0.20)',
    motif: 'wedding',
  },

  graduation: {
    background:
      'linear-gradient(118deg, rgba(255,251,244,0.98) 0%, rgba(248,245,232,0.96) 54%, rgba(218,219,190,0.88) 100%)',
    accent: 'rgba(190,188,144,0.28)',
    softGlow: 'rgba(214,185,105,0.18)',
    motif: 'graduation',
  },

  corporate: {
    background:
      'linear-gradient(118deg, rgba(255,251,247,0.98) 0%, rgba(243,238,233,0.96) 54%, rgba(209,192,181,0.88) 100%)',
    accent: 'rgba(157,126,108,0.26)',
    softGlow: 'rgba(188,165,148,0.18)',
    motif: 'corporate',
  },

  party: {
    background:
      'linear-gradient(118deg, rgba(255,250,246,0.98) 0%, rgba(250,239,236,0.96) 54%, rgba(230,200,190,0.88) 100%)',
    accent: 'rgba(191,137,137,0.28)',
    softGlow: 'rgba(223,154,143,0.20)',
    motif: 'party',
  },

  'baby shower': {
    background:
      'linear-gradient(118deg, rgba(255,252,245,0.98) 0%, rgba(249,245,230,0.96) 54%, rgba(218,218,191,0.88) 100%)',
    accent: 'rgba(199,193,151,0.26)',
    softGlow: 'rgba(234,221,181,0.20)',
    motif: 'baby',
  },

  engagement: {
    background:
      'linear-gradient(118deg, rgba(255,252,246,0.98) 0%, rgba(250,245,231,0.96) 54%, rgba(231,213,174,0.88) 100%)',
    accent: 'rgba(205,178,115,0.26)',
    softGlow: 'rgba(235,219,176,0.20)',
    motif: 'engagement',
  },

  festival: {
    background:
      'linear-gradient(118deg, rgba(255,250,244,0.98) 0%, rgba(250,237,224,0.96) 54%, rgba(225,187,160,0.88) 100%)',
    accent: 'rgba(183,111,102,0.26)',
    softGlow: 'rgba(236,187,104,0.20)',
    motif: 'festival',
  },

  default: {
    background:
      'linear-gradient(118deg, rgba(255,250,246,0.98) 0%, rgba(247,239,242,0.96) 54%, rgba(224,211,220,0.88) 100%)',
    accent: 'rgba(183,167,200,0.26)',
    softGlow: 'rgba(205,176,188,0.18)',
    motif: 'default',
  },
};

const getWorkspaceHeroTheme = (eventType: string) => {
  const normalizedType = eventType.trim().toLowerCase();

  return workspaceHeroThemes[normalizedType] ?? workspaceHeroThemes.default;
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

const eventLifecycleStages: EventStatus[] = ['DRAFT', 'PLANNING', 'ACTIVE', 'COMPLETED'];

const getEventStatusMessage = (status: EventStatus) => {
  switch (status) {
    case 'DRAFT':
      return 'The event is being prepared before active planning begins.';

    case 'PLANNING':
      return 'Planning is underway across the event workspace.';

    case 'ACTIVE':
      return 'The event is active and ready for ongoing coordination.';

    case 'COMPLETED':
      return 'The event has been completed successfully.';

    case 'CANCELLED':
      return 'Planning has stopped because this event was cancelled.';
  }
};

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

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
  const [pendingStatusAction, setPendingStatusAction] = useState<EventStatusAction | null>(null);
  const [activeSnapshotCard, setActiveSnapshotCard] = useState<SnapshotCardKey>('theme');

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
      setPendingStatusAction(null);

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
  const workspaceHeroTheme = getWorkspaceHeroTheme(event.eventType);
  const isEventEditable = event.status !== 'COMPLETED' && event.status !== 'CANCELLED';

  const availableStatusActions = eventStatusActions[event.status];

  const primaryStatusAction =
    availableStatusActions.find((action) => action.tone === 'primary') ?? null;

  const secondaryStatusActions = availableStatusActions.filter(
    (action) => action !== primaryStatusAction,
  );

  const canDeleteEvent = event.status === 'DRAFT' || event.status === 'CANCELLED';
  const PendingStatusIcon = pendingStatusAction?.icon;
  const PrimaryStatusIcon = primaryStatusAction?.icon;

  const currentLifecycleIndex = eventLifecycleStages.indexOf(event.status);

  const getSnapshotCardStackClass = (card: SnapshotCardKey, restingZIndex: string) =>
    activeSnapshotCard === card
      ? 'z-50 scale-[1.025] rotate-0 shadow-[0_34px_78px_rgba(31,27,29,0.24)]'
      : `${restingZIndex} scale-100`;

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
            <PageBackButton fallback="/events" label="Events" className="shrink-0" />

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
          <section
            className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/68 px-5 pb-8 pt-6 shadow-[0_22px_64px_rgba(31,27,29,0.10)] sm:px-7 sm:pb-9 sm:pt-7 lg:px-9 lg:pb-10 lg:pt-8"
            style={{
              background: workspaceHeroTheme.background,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-28 -top-32 size-[28rem] rounded-full blur-3xl"
              style={{
                backgroundColor: workspaceHeroTheme.accent,
              }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 right-[4%] size-[30rem] rounded-full blur-3xl"
              style={{
                backgroundColor: workspaceHeroTheme.softGlow,
              }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-[46%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.24))]"
            />

            {workspaceHeroTheme.motif === 'birthday' ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 420 220"
                className="pointer-events-none absolute -bottom-8 right-2 h-48 w-[44%] opacity-[0.16]"
                fill="none"
              >
                <path
                  d="M410 30C335 9 315 71 350 99C384 126 365 177 302 179C231 181 236 116 177 120C115 124 117 188 28 205"
                  stroke="rgba(93,58,85,0.72)"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}

            {workspaceHeroTheme.motif === 'wedding' ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 220 260"
                className="pointer-events-none absolute -bottom-3 right-3 h-[78%] w-44 opacity-[0.16]"
                fill="none"
              >
                <path
                  d="M184 246C136 205 115 163 118 119C121 77 147 45 190 18"
                  stroke="rgba(124,74,90,0.74)"
                  strokeWidth="3"
                />
                <ellipse
                  cx="126"
                  cy="93"
                  rx="16"
                  ry="7"
                  transform="rotate(32 126 93)"
                  fill="rgba(212,175,190,0.72)"
                />
                <ellipse
                  cx="146"
                  cy="195"
                  rx="17"
                  ry="8"
                  transform="rotate(26 146 195)"
                  fill="rgba(238,213,218,0.84)"
                />
              </svg>
            ) : null}

            {workspaceHeroTheme.motif === 'graduation' ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-5 right-5 h-40 w-56 rotate-[-4deg] rounded-[1.4rem] border border-[rgba(150,115,57,0.12)] bg-white/14 opacity-70"
              >
                <div className="absolute left-6 top-6 h-1.5 w-24 rounded-full bg-[rgba(113,117,76,0.16)]" />
                <div className="absolute left-6 top-11 h-1 w-32 rounded-full bg-[rgba(113,117,76,0.10)]" />
              </div>
            ) : null}

            {workspaceHeroTheme.motif === 'corporate' ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-[48%] opacity-[0.15]"
                style={{
                  backgroundImage: `
          linear-gradient(rgba(88,67,61,0.20) 1px, transparent 1px),
          linear-gradient(90deg, rgba(88,67,61,0.20) 1px, transparent 1px)
        `,
                  backgroundSize: '30px 30px',
                }}
              />
            ) : null}

            {workspaceHeroTheme.motif === 'party' ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-24 h-[150%] w-[42%] rotate-[14deg] bg-[linear-gradient(100deg,transparent,rgba(255,220,195,0.28),rgba(158,89,119,0.12),transparent)] opacity-60 blur-xl"
              />
            ) : null}

            {workspaceHeroTheme.motif === 'baby' ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-5 right-5 h-24 w-48 opacity-30"
              >
                <span className="absolute bottom-0 left-2 h-12 w-40 rounded-full bg-white/72" />
                <span className="absolute bottom-5 left-8 size-16 rounded-full bg-white/76" />
                <span className="absolute bottom-4 right-3 size-20 rounded-full bg-white/68" />
              </div>
            ) : null}

            {workspaceHeroTheme.motif === 'engagement' ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-10 top-10 h-36 w-48 opacity-[0.16]"
              >
                <span className="absolute left-3 top-5 size-24 rounded-full border-[5px] border-[rgba(197,165,95,0.88)]" />
                <span className="absolute right-2 top-8 size-24 rounded-full border-[5px] border-[rgba(224,201,145,0.92)]" />
              </div>
            ) : null}

            {workspaceHeroTheme.motif === 'festival' ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 340 190"
                className="pointer-events-none absolute right-0 top-0 h-[60%] w-[38%] opacity-[0.18]"
                fill="none"
              >
                <path d="M38 0V70" stroke="rgba(124,74,90,0.82)" />
                <path d="M132 0V96" stroke="rgba(150,115,57,0.78)" />
                <path
                  d="M38 70C24 82 24 104 38 117C52 104 52 82 38 70Z"
                  fill="rgba(173,103,86,0.88)"
                />
                <path
                  d="M132 96C115 109 115 135 132 150C149 135 149 109 132 96Z"
                  fill="rgba(213,165,95,0.92)"
                />
              </svg>
            ) : null}

            <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="soft-chip text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                    <Sparkles className="size-4" />
                    {event.eventType}
                  </div>

                  <span className="status-chip" data-tone={getStatusTone(event.status)}>
                    {event.status.replaceAll('_', ' ')}
                  </span>
                </div>

                <h1 className="mt-4 max-w-4xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:mt-5 sm:text-5xl sm:leading-[0.98] lg:text-[3.5rem]">
                  {event.name}
                </h1>

                <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-[var(--color-charcoal)]/70 sm:mt-5 sm:text-lg sm:leading-8">
                  {event.requirements ??
                    'Coordinate vendors, budgets, guests and every important milestone from one organised workspace.'}
                </p>
              </div>

              <aside className="relative min-h-[21rem] lg:min-h-[22rem]">
                <div className="mb-4 flex items-center justify-between gap-4 lg:absolute lg:left-4 lg:top-0 lg:z-40 lg:mb-0">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                      Event snapshot
                    </p>

                    <p className="mt-1 text-sm font-bold text-[var(--color-charcoal)]/48">
                      Important details at a glance
                    </p>
                  </div>
                </div>

                {/* Mobile and tablet: readable stacked layout */}
                <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
                  <article className="rounded-[1.55rem] border border-white/72 bg-white/48 p-5 shadow-[0_16px_38px_rgba(31,27,29,0.10)] backdrop-blur-2xl">
                    <span className="grid size-10 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                      <CalendarDays aria-hidden="true" className="size-4" />
                    </span>

                    <p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                      Date & time
                    </p>

                    <p className="mt-1 text-sm font-black leading-5 text-[var(--color-near-black)]">
                      {formatEventDate(event.eventDate)}
                    </p>
                  </article>

                  <article className="rounded-[1.55rem] border border-white/72 bg-white/44 p-5 shadow-[0_16px_38px_rgba(31,27,29,0.09)] backdrop-blur-2xl">
                    <span className="grid size-10 place-items-center rounded-xl bg-[rgba(175,201,216,0.20)] text-[#405966]">
                      <MapPin aria-hidden="true" className="size-4" />
                    </span>

                    <p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                      Location
                    </p>

                    <p className="mt-1 truncate text-sm font-black text-[var(--color-near-black)]">
                      {event.location}
                    </p>
                  </article>

                  <article className="rounded-[1.55rem] border border-white/72 bg-white/44 p-5 shadow-[0_16px_38px_rgba(31,27,29,0.09)] backdrop-blur-2xl">
                    <span className="grid size-10 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#586047]">
                      <UsersRound aria-hidden="true" className="size-4" />
                    </span>

                    <p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                      Guests
                    </p>

                    <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                      {event.guestCount
                        ? `${event.guestCount.toLocaleString('en-LK')} guests`
                        : 'Not set'}
                    </p>
                  </article>

                  <article className="rounded-[1.55rem] border border-white/72 bg-white/48 p-5 shadow-[0_16px_38px_rgba(31,27,29,0.10)] backdrop-blur-2xl">
                    <span className="grid size-10 place-items-center rounded-xl bg-[rgba(142,92,103,0.16)] text-[var(--color-rosewood)]">
                      <WalletCards aria-hidden="true" className="size-4" />
                    </span>

                    <p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                      Planned budget
                    </p>

                    <p className="mt-1 truncate text-sm font-black text-[var(--color-near-black)]">
                      {formatCurrency(event.plannedBudget)}
                    </p>
                  </article>

                  <article className="rounded-[1.55rem] border border-white/72 bg-[linear-gradient(135deg,rgba(255,255,255,0.52),rgba(235,222,228,0.42))] p-5 shadow-[0_16px_38px_rgba(31,27,29,0.09)] backdrop-blur-2xl sm:col-span-2">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(93,58,85,0.11)] text-[var(--color-deep-plum)]">
                        <Sparkles aria-hidden="true" className="size-4" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                          Theme
                        </p>

                        <p className="mt-1 truncate text-base font-black text-[var(--color-deep-plum)]">
                          {event.theme ?? 'No theme selected'}
                        </p>
                      </div>
                    </div>
                  </article>
                </div>

                {/* Desktop: intentionally scattered and overlapping composition */}
                <div className="relative hidden h-[22rem] lg:block">
                  <article
                    role="button"
                    tabIndex={0}
                    aria-pressed={activeSnapshotCard === 'date'}
                    onClick={() => setActiveSnapshotCard('date')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveSnapshotCard('date');
                      }
                    }}
                    className={`group/snapshot-card absolute left-[4%] top-[3.8rem] w-[58%] cursor-pointer rounded-[1.8rem] border border-white/76 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(248,231,228,0.58))] p-5 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'date'
                        ? 'z-50 -translate-y-1.5 scale-[1.03] rotate-0 opacity-100 shadow-[0_34px_78px_rgba(31,27,29,0.24)]'
                        : 'z-20 scale-100 rotate-[-2deg] opacity-[0.86] shadow-[0_24px_58px_rgba(31,27,29,0.15)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[0.64rem] font-black uppercase tracking-[0.19em] text-[var(--color-rosewood)]">
                          Date & time
                        </p>

                        <p className="mt-3 max-w-[14rem] text-lg font-black leading-6 tracking-[-0.025em] text-[var(--color-near-black)]">
                          {formatEventDate(event.eventDate)}
                        </p>
                      </div>

                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] transition-all duration-300 ${
                          activeSnapshotCard === 'date'
                            ? 'scale-110 rotate-[6deg]'
                            : 'scale-100 rotate-0'
                        }`}
                      >
                        <CalendarDays aria-hidden="true" className="size-5" />
                      </span>
                    </div>
                  </article>

                  <article
                    role="button"
                    tabIndex={0}
                    aria-pressed={activeSnapshotCard === 'location'}
                    onClick={() => setActiveSnapshotCard('location')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveSnapshotCard('location');
                      }
                    }}
                    className={`group/snapshot-card absolute right-[0%] top-[5.7rem] w-[46%] cursor-pointer rounded-[1.65rem] border border-white/74 bg-[linear-gradient(145deg,rgba(248,244,251,0.90),rgba(220,207,230,0.76))] p-5 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'location'
                        ? 'z-50 -translate-y-1.5 scale-[1.03] rotate-0 opacity-100 shadow-[0_34px_78px_rgba(31,27,29,0.24)]'
                        : 'z-30 translate-y-1 scale-100 rotate-[2deg] opacity-[0.86] shadow-[0_24px_56px_rgba(31,27,29,0.16)]'
                    }`}
                  >
                    <span
                      className={`grid size-10 place-items-center rounded-xl bg-white/42 text-[var(--color-deep-plum)] transition-all duration-300 ${
                        activeSnapshotCard === 'location'
                          ? 'scale-110 rotate-[-7deg]'
                          : 'scale-100 rotate-0'
                      }`}
                    >
                      <MapPin aria-hidden="true" className="size-4" />
                    </span>

                    <p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/44">
                      Location
                    </p>

                    <p className="mt-1 max-w-[12rem] break-words text-base font-black leading-5 text-[var(--color-near-black)]">
                      {event.location}
                    </p>
                  </article>

                  <article
                    role="button"
                    tabIndex={0}
                    aria-pressed={activeSnapshotCard === 'guests'}
                    onClick={() => setActiveSnapshotCard('guests')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveSnapshotCard('guests');
                      }
                    }}
                    className={`group/snapshot-card absolute bottom-[1.4rem] left-[1%] w-[38%] cursor-pointer rounded-[1.6rem] border border-white/72 bg-[linear-gradient(145deg,rgba(250,250,242,0.76),rgba(222,222,195,0.60))] p-5 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'guests'
                        ? 'z-50 -translate-y-1.5 scale-[1.03] rotate-0 opacity-100 shadow-[0_34px_78px_rgba(31,27,29,0.24)]'
                        : 'z-10 -translate-x-1 scale-100 rotate-[2.5deg] opacity-[0.84] shadow-[0_20px_48px_rgba(31,27,29,0.13)]'
                    }`}
                  >
                    <span
                      className={`grid size-10 place-items-center rounded-xl bg-white/38 text-[#586047] transition-all duration-300 ${
                        activeSnapshotCard === 'guests'
                          ? '-translate-y-0.5 scale-110'
                          : 'translate-y-0 scale-100'
                      }`}
                    >
                      <UsersRound aria-hidden="true" className="size-4" />
                    </span>

                    <p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/44">
                      Guests
                    </p>

                    <p className="mt-1 text-base font-black text-[var(--color-near-black)]">
                      {event.guestCount
                        ? `${event.guestCount.toLocaleString('en-LK')} guests`
                        : 'Not set'}
                    </p>
                  </article>

                  <article
                    role="button"
                    tabIndex={0}
                    aria-pressed={activeSnapshotCard === 'budget'}
                    onClick={() => setActiveSnapshotCard('budget')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveSnapshotCard('budget');
                      }
                    }}
                    className={`group/snapshot-card absolute bottom-[0.7rem] right-[3%] w-[57%] cursor-pointer rounded-[1.8rem] border border-white/76 bg-[linear-gradient(145deg,rgba(255,250,246,0.82),rgba(239,214,207,0.68))] p-5 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'budget'
                        ? 'z-50 -translate-y-1.5 scale-[1.03] rotate-0 opacity-100 shadow-[0_34px_78px_rgba(31,27,29,0.24)]'
                        : 'z-40 translate-y-1 scale-100 rotate-[-2.5deg] opacity-[0.88] shadow-[0_26px_62px_rgba(31,27,29,0.18)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[0.64rem] font-black uppercase tracking-[0.19em] text-[var(--color-rosewood)]">
                          Planned budget
                        </p>

                        <p className="mt-3 truncate text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                          {formatCurrency(event.plannedBudget)}
                        </p>
                      </div>

                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(142,92,103,0.15)] text-[var(--color-rosewood)] transition-all duration-300 ${
                          activeSnapshotCard === 'budget'
                            ? 'scale-110 rotate-[5deg]'
                            : 'scale-100 rotate-0'
                        }`}
                      >
                        <WalletCards aria-hidden="true" className="size-5" />
                      </span>
                    </div>
                  </article>

                  <article
                    role="button"
                    tabIndex={0}
                    aria-pressed={activeSnapshotCard === 'theme'}
                    onClick={() => setActiveSnapshotCard('theme')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveSnapshotCard('theme');
                      }
                    }}
                    className={`group/snapshot-card absolute bottom-[7.2rem] left-[22%] w-[40%] cursor-pointer rounded-[1.5rem] border border-white/78 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(235,222,228,0.72))] px-5 py-4 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'theme'
                        ? 'z-50 -translate-y-1.5 scale-[1.03] rotate-0 opacity-100 shadow-[0_34px_78px_rgba(31,27,29,0.24)]'
                        : 'z-[35] translate-x-1 -translate-y-0.5 scale-100 rotate-[1deg] opacity-[0.88] shadow-[0_22px_52px_rgba(31,27,29,0.16)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(93,58,85,0.11)] text-[var(--color-deep-plum)] transition-all duration-300 ${
                          activeSnapshotCard === 'theme'
                            ? 'scale-110 rotate-[14deg]'
                            : 'scale-100 rotate-0'
                        }`}
                      >
                        <Sparkles aria-hidden="true" className="size-4" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-[0.6rem] font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                          Theme
                        </p>

                        <p className="mt-1 truncate text-sm font-black text-[var(--color-deep-plum)]">
                          {event.theme ?? 'No theme selected'}
                        </p>
                      </div>
                    </div>
                  </article>
                </div>
              </aside>
            </div>
          </section>

          <nav
            className="glass-card relative z-20 mt-5 overflow-hidden border-white/72 bg-white/38 p-2.5 shadow-[0_18px_48px_rgba(31,27,29,0.09)] backdrop-blur-xl sm:mt-6 sm:p-3.5"
            aria-label="Event workspace sections"
          >
            <div className="snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth px-0.5 pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(93,58,85,0.28)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(93,58,85,0.24)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(93,58,85,0.38)]">
              <div className="flex min-w-max items-center gap-2 pr-3">
                {workspaceSections.map(({ label, icon: Icon, path }) => {
                  const isActive = label === 'Overview';

                  return (
                    <Link
                      key={label}
                      to={path(event.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'group relative flex min-w-[7.75rem] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] px-3 py-3 text-[#fffaf5] shadow-[0_16px_35px_rgba(93,58,85,0.24)] transition duration-300 sm:min-w-[8.5rem] sm:px-4 sm:py-3.5'
                          : 'group relative flex min-w-[7.75rem] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-[1.25rem] border border-white/52 bg-white/28 px-3 py-3 text-[var(--color-charcoal)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/48 hover:shadow-[0_14px_30px_rgba(31,27,29,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/35 sm:min-w-[8.5rem] sm:px-4 sm:py-3.5'
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={
                          isActive
                            ? 'pointer-events-none absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-white/72'
                            : 'pointer-events-none absolute inset-x-1/2 bottom-0 h-0.5 rounded-full bg-[var(--color-deep-plum)]/55 transition-all duration-300 group-hover:inset-x-5'
                        }
                      />
                      {isActive ? (
                        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_48%)]" />
                      ) : null}

                      <span
                        className={
                          isActive
                            ? 'relative grid size-9 shrink-0 place-items-center rounded-xl bg-white/14 text-[var(--color-powder-blue)]'
                            : 'relative grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)] transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-105 group-hover:bg-[rgba(93,58,85,0.16)]'
                        }
                      >
                        <Icon aria-hidden="true" className="size-4" />
                      </span>

                      <span className="relative text-sm font-black">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <section className="mt-7 grid items-stretch gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="glass-card overflow-hidden border-white/72 bg-white/30 shadow-[0_22px_64px_rgba(31,27,29,0.10)] backdrop-blur-2xl">
              <div className="border-b border-white/45 px-6 py-7 sm:px-8 sm:py-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                      Event overview
                    </p>

                    <h2 className="mt-3 max-w-2xl text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] sm:text-3xl sm:tracking-[-0.045em]">
                      Everything important, clearly organised.
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-charcoal)]/58">
                      Review the information guiding this event and update it whenever the plan
                      changes.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary shrink-0 self-start text-sm font-bold sm:self-auto"
                    disabled={!isEventEditable}
                    title={
                      isEventEditable
                        ? 'Edit event details'
                        : 'Completed or cancelled events cannot be edited'
                    }
                    onClick={openEditForm}
                  >
                    <Pencil className="size-4" />
                    Update details
                  </button>
                </div>
              </div>

              <div className="divide-y divide-white/45 px-6 sm:px-8">
                <div className="group/overview grid gap-4 py-5 transition duration-300 hover:bg-white/18 sm:grid-cols-[13rem_1fr] sm:items-center sm:px-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(142,92,103,0.12)] text-[var(--color-rosewood)] transition duration-300 group-hover/overview:-translate-y-0.5 group-hover/overview:scale-105">
                      <CalendarDays className="size-4" />
                    </span>

                    <p className="text-sm font-black text-[var(--color-charcoal)]/62">
                      Date and time
                    </p>
                  </div>

                  <p className="font-black text-[var(--color-near-black)] sm:text-right">
                    {formatEventDate(event.eventDate)}
                  </p>
                </div>

                <div className="group/overview grid gap-4 py-6 transition duration-300 hover:bg-white/18 sm:grid-cols-[13rem_1fr] sm:items-center sm:px-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.20)] text-[#405966] transition duration-300 group-hover/overview:-translate-y-0.5 group-hover/overview:scale-105">
                      <MapPin className="size-4" />
                    </span>

                    <p className="text-sm font-black text-[var(--color-charcoal)]/62">Location</p>
                  </div>

                  <p className="font-black text-[var(--color-near-black)] sm:text-right">
                    {event.location}
                  </p>
                </div>

                <div className="group/overview grid gap-4 py-6 transition duration-300 hover:bg-white/18 sm:grid-cols-[13rem_1fr] sm:items-center sm:px-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(142,151,115,0.18)] text-[#586047] transition duration-300 group-hover/overview:-translate-y-0.5 group-hover/overview:scale-105">
                      <UsersRound className="size-4" />
                    </span>

                    <p className="text-sm font-black text-[var(--color-charcoal)]/62">
                      Estimated guests
                    </p>
                  </div>

                  <p className="font-black text-[var(--color-near-black)] sm:text-right">
                    {event.guestCount
                      ? `${event.guestCount.toLocaleString('en-GB')} guests`
                      : 'Not set'}
                  </p>
                </div>

                <div className="group/overview grid gap-4 py-6 transition duration-300 hover:bg-white/18 sm:grid-cols-[13rem_1fr] sm:items-center sm:px-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)] transition duration-300 group-hover/overview:-translate-y-0.5 group-hover/overview:scale-105">
                      <WalletCards className="size-4" />
                    </span>

                    <p className="text-sm font-black text-[var(--color-charcoal)]/62">
                      Planned budget
                    </p>
                  </div>

                  <p className="font-black text-[var(--color-near-black)] sm:text-right">
                    {formatCurrency(event.plannedBudget)}
                  </p>
                </div>
              </div>

              <div className="grid border-t border-white/45 lg:grid-cols-2">
                <div className="group/detail border-b border-white/45 p-6 transition duration-300 hover:bg-white/16 sm:p-8 lg:border-b-0 lg:border-r">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                      <Sparkles className="size-4" />
                    </span>

                    <p className="text-sm font-black text-[var(--color-charcoal)]/62">
                      Theme and creative direction
                    </p>
                  </div>

                  <p className="mt-5 text-xl font-black leading-7 tracking-[-0.035em] text-[var(--color-near-black)]">
                    {event.theme ?? 'No theme added yet'}
                  </p>
                </div>

                <div className="group/detail p-6 transition duration-300 hover:bg-white/16 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-[rgba(142,92,103,0.12)] text-[var(--color-rosewood)]">
                      <FileText className="size-4" />
                    </span>

                    <p className="text-sm font-black text-[var(--color-charcoal)]/62">
                      Planning requirements
                    </p>
                  </div>

                  <p className="mt-5 leading-7 text-[var(--color-charcoal)]/70">
                    {event.requirements ??
                      'No additional planning requirements have been added yet.'}
                  </p>
                </div>
              </div>
            </article>

            <aside className="h-full overflow-hidden rounded-[1.6rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-[#fffaf5] shadow-[0_24px_64px_rgba(93,58,85,0.24)] sm:rounded-[2rem]">
              <div className="relative flex h-full min-h-[31rem] flex-col overflow-hidden p-6 sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-white/10 blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-[rgba(175,201,216,0.10)] blur-3xl"
                />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-12 place-items-center rounded-2xl border border-white/14 bg-white/10 text-[var(--color-powder-blue)] backdrop-blur">
                      {event.status === 'COMPLETED' ? (
                        <CheckCircle2 aria-hidden="true" className="size-5" />
                      ) : event.status === 'CANCELLED' ? (
                        <Ban aria-hidden="true" className="size-5" />
                      ) : (
                        <Sparkles aria-hidden="true" className="size-5" />
                      )}
                    </span>

                    <span className="rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/76">
                      {event.status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-white/52">
                    Planning status
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">
                    {event.status.replaceAll('_', ' ')}
                  </h2>

                  <p className="mt-4 max-w-sm leading-7 text-white/66">
                    {getEventStatusMessage(event.status)}
                  </p>

                  <div className="mt-6 border-t border-white/12 pt-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
                      Last updated
                    </p>

                    <p className="mt-2 text-sm font-bold text-white/68">
                      {formatUpdatedAt(event.updatedAt)}
                    </p>
                  </div>

                  {primaryStatusAction ? (
                    <div className="mt-6 rounded-[1.4rem] border border-white/14 bg-white/[0.08] p-4 backdrop-blur-xl">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/46">
                        Recommended next step
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
                        {primaryStatusAction.description}
                      </p>

                      <button
                        type="button"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_14px_32px_rgba(31,27,29,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(31,27,29,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={updateEventStatusMutation.isPending}
                        onClick={() => {
                          updateEventStatusMutation.reset();
                          setPendingStatusAction(primaryStatusAction);
                        }}
                      >
                        {PrimaryStatusIcon ? (
                          <PrimaryStatusIcon aria-hidden="true" className="size-4" />
                        ) : null}

                        {primaryStatusAction.label}
                      </button>

                      {secondaryStatusActions.length > 0 ? (
                        <div className="mt-3 grid gap-2">
                          {secondaryStatusActions.map((action) => {
                            const ActionIcon = action.icon;

                            return (
                              <button
                                key={action.status}
                                type="button"
                                className={
                                  action.tone === 'danger'
                                    ? 'flex w-full items-center justify-center gap-2 rounded-xl border border-white/14 bg-black/[0.08] px-4 py-2.5 text-xs font-black text-white/62 transition hover:border-white/22 hover:bg-black/[0.14] hover:text-white/82 disabled:cursor-not-allowed disabled:opacity-50'
                                    : 'flex w-full items-center justify-center gap-2 rounded-xl border border-white/14 bg-white/[0.05] px-4 py-2.5 text-xs font-black text-white/66 transition hover:border-white/22 hover:bg-white/[0.10] hover:text-white/86 disabled:cursor-not-allowed disabled:opacity-50'
                                }
                                disabled={updateEventStatusMutation.isPending}
                                onClick={() => {
                                  updateEventStatusMutation.reset();
                                  setPendingStatusAction(action);
                                }}
                              >
                                <ActionIcon aria-hidden="true" className="size-3.5" />
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-[1.4rem] border border-white/12 bg-white/[0.06] p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white/70">
                          {event.status === 'COMPLETED' ? (
                            <CheckCircle2 aria-hidden="true" className="size-4" />
                          ) : (
                            <Ban aria-hidden="true" className="size-4" />
                          )}
                        </span>

                        <div>
                          <p className="text-sm font-black text-white/84">Final event status</p>

                          <p className="mt-1 text-xs font-semibold leading-5 text-white/48">
                            No further lifecycle actions are available for this event.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto rounded-[1.4rem] border border-white/12 bg-black/[0.08] p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
                          Current stage
                        </p>

                        <p className="mt-2 text-lg font-black text-white/88">
                          {event.status.replaceAll('_', ' ')}
                        </p>
                      </div>

                      <span
                        className={
                          event.status === 'COMPLETED'
                            ? 'grid size-11 place-items-center rounded-2xl bg-[rgba(142,151,115,0.22)] text-[#dce7c5]'
                            : event.status === 'CANCELLED'
                              ? 'grid size-11 place-items-center rounded-2xl bg-white/10 text-white/68'
                              : 'grid size-11 place-items-center rounded-2xl bg-[rgba(175,201,216,0.16)] text-[var(--color-powder-blue)]'
                        }
                      >
                        {event.status === 'COMPLETED' ? (
                          <CheckCircle2 aria-hidden="true" className="size-5" />
                        ) : event.status === 'CANCELLED' ? (
                          <Ban aria-hidden="true" className="size-5" />
                        ) : (
                          <PlayCircle aria-hidden="true" className="size-5" />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-6 space-y-6">
            <article className="glass-card overflow-hidden border-white/72 bg-white/30 shadow-[0_22px_64px_rgba(31,27,29,0.10)] backdrop-blur-2xl">
              <div className="flex flex-col gap-5 border-b border-white/50 px-6 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-8">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                      <PlayCircle aria-hidden="true" className="size-5" />
                    </span>

                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                        Planning journey
                      </p>

                      <p className="mt-1 text-sm font-bold text-[var(--color-charcoal)]/52">
                        Follow the event through each lifecycle stage.
                      </p>
                    </div>
                  </div>

                  <h2 className="mt-5 max-w-2xl text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] sm:text-3xl sm:tracking-[-0.045em]">
                    {event.status === 'CANCELLED'
                      ? 'Planning has stopped for this event.'
                      : 'See exactly where this event stands.'}
                  </h2>
                </div>

                <div className="self-start rounded-full border border-white/68 bg-white/42 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)] shadow-[0_8px_22px_rgba(31,27,29,0.06)] sm:self-auto">
                  Last updated {formatUpdatedAt(event.updatedAt)}
                </div>
              </div>

              {event.status === 'CANCELLED' ? (
                <div className="p-6 sm:p-8">
                  <div className="rounded-[1.6rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.07)] p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                        <Ban aria-hidden="true" className="size-5" />
                      </span>

                      <div>
                        <p className="text-lg font-black text-[var(--color-near-black)]">
                          Event cancelled
                        </p>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-charcoal)]/62">
                          This event no longer follows the active planning lifecycle. Its existing
                          information remains available for reference.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 sm:p-8">
                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-0.5 bg-[rgba(93,58,85,0.10)] sm:block"
                    />

                    <div
                      aria-hidden="true"
                      className="absolute left-[12.5%] top-6 hidden h-0.5 bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy))] transition-all duration-500 sm:block"
                      style={{
                        width:
                          currentLifecycleIndex <= 0
                            ? '0%'
                            : currentLifecycleIndex === 1
                              ? '25%'
                              : currentLifecycleIndex === 2
                                ? '50%'
                                : '75%',
                      }}
                    />

                    <div className="grid gap-3 sm:grid-cols-4 sm:gap-4">
                      {eventLifecycleStages.map((stage, stageIndex) => {
                        const isReached = stageIndex <= currentLifecycleIndex;
                        const isCurrent = stage === event.status;

                        return (
                          <div
                            key={stage}
                            className={
                              isCurrent
                                ? 'group/stage relative rounded-[1.45rem] border border-[rgba(93,58,85,0.18)] bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(235,222,228,0.56))] p-4 shadow-[0_16px_38px_rgba(93,58,85,0.12)] transition duration-300 hover:-translate-y-0.5 sm:border-transparent sm:bg-transparent sm:p-0 sm:shadow-none'
                                : 'group/stage relative rounded-[1.45rem] border border-white/54 bg-white/24 p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white/38 sm:border-transparent sm:bg-transparent sm:p-0'
                            }
                          >
                            <div className="relative z-10 flex items-center gap-4 sm:flex-col sm:text-center">
                              <span
                                className={
                                  isCurrent
                                    ? 'grid size-12 shrink-0 place-items-center rounded-full border border-white/72 bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-white shadow-[0_12px_28px_rgba(93,58,85,0.24)] transition duration-300 group-hover/stage:scale-105'
                                    : isReached
                                      ? 'grid size-12 shrink-0 place-items-center rounded-full border border-white/70 bg-[rgba(183,167,200,0.34)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.08)] transition duration-300 group-hover/stage:scale-105'
                                      : 'grid size-12 shrink-0 place-items-center rounded-full border border-white/64 bg-white/38 text-[var(--color-charcoal)]/32 transition duration-300 group-hover/stage:scale-105'
                                }
                              >
                                {isReached ? (
                                  <CheckCircle2 aria-hidden="true" className="size-5" />
                                ) : (
                                  <span className="size-2 rounded-full bg-current" />
                                )}
                              </span>

                              <div className="min-w-0 sm:mt-4">
                                <p
                                  className={
                                    isCurrent
                                      ? 'text-sm font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]'
                                      : isReached
                                        ? 'text-sm font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/68'
                                        : 'text-sm font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/34'
                                  }
                                >
                                  {stage}
                                </p>

                                <p
                                  className={
                                    isCurrent
                                      ? 'mt-1 text-xs font-bold leading-5 text-[var(--color-charcoal)]/58'
                                      : 'mt-1 text-xs font-bold leading-5 text-[var(--color-charcoal)]/40'
                                  }
                                >
                                  {stage === 'DRAFT'
                                    ? 'Initial details'
                                    : stage === 'PLANNING'
                                      ? 'Organising the plan'
                                      : stage === 'ACTIVE'
                                        ? 'Active coordination'
                                        : 'Event finished'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-7 flex flex-col gap-4 rounded-[1.45rem] border border-white/58 bg-white/26 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42">
                        Current stage
                      </p>

                      <p className="mt-2 text-xl font-black text-[var(--color-near-black)]">
                        {event.status.replaceAll('_', ' ')}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/58">
                        {getEventStatusMessage(event.status)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-[rgba(93,58,85,0.12)] bg-[rgba(93,58,85,0.08)] px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-[var(--color-deep-plum)]">
                      Stage {currentLifecycleIndex + 1} of {eventLifecycleStages.length}
                    </span>
                  </div>
                </div>
              )}
            </article>

            <section className="space-y-5">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Available actions
                </p>

                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  Continue managing this event.
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-charcoal)]/58">
                  Choose the next action based on the current stage of your event.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">{/* Action cards go here */}</div>
            </section>
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
      {pendingStatusAction && PendingStatusIcon ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-confirmation-title"
          onMouseDown={(mouseEvent) => {
            if (
              mouseEvent.target === mouseEvent.currentTarget &&
              !updateEventStatusMutation.isPending
            ) {
              setPendingStatusAction(null);
              updateEventStatusMutation.reset();
            }
          }}
        >
          <div className="glass-card w-full max-w-lg p-6 sm:p-8">
            <div
              className={
                pendingStatusAction.tone === 'danger'
                  ? 'grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]'
                  : 'grid size-14 place-items-center rounded-2xl bg-[rgba(93,58,85,0.12)] text-[var(--color-deep-plum)]'
              }
            >
              <PendingStatusIcon aria-hidden="true" className="size-7" />
            </div>

            <h2
              id="status-confirmation-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              {pendingStatusAction.label}?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              {pendingStatusAction.description}
            </p>

            {pendingStatusAction.status === 'COMPLETED' ? (
              <p className="mt-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]">
                Completed events can no longer be edited.
              </p>
            ) : null}

            {updateEventStatusMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(updateEventStatusMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={updateEventStatusMutation.isPending}
                onClick={() => {
                  setPendingStatusAction(null);
                  updateEventStatusMutation.reset();
                }}
              >
                Keep current status
              </button>

              <button
                type="button"
                className={
                  pendingStatusAction.tone === 'danger'
                    ? 'flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
                    : 'btn-primary justify-center text-sm font-bold'
                }
                disabled={updateEventStatusMutation.isPending}
                onClick={() => {
                  updateEventStatusMutation.mutate(pendingStatusAction.status);
                }}
              >
                {updateEventStatusMutation.isPending ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <PendingStatusIcon aria-hidden="true" className="size-4" />
                )}

                {updateEventStatusMutation.isPending
                  ? 'Updating status...'
                  : pendingStatusAction.label}
              </button>
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
