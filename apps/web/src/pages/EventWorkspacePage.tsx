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
import { useCurrentUser } from '../features/auth/useCurrentUser';
import { eventTypeOptions } from '../features/events/event.api';

type EventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

type EventStatusHistoryEntry = {
  id: string;
  previousStatus: EventStatus | null;
  newStatus: EventStatus;
  changedById: string | null;
  note: string | null;
  changedAt: string;
};

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
  statusHistory: EventStatusHistoryEntry[];
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

const workspaceSectionDescriptions: Record<string, string> = {
  Budget: 'Track planned spending, allocations, expenses and remaining funds.',
  Tasks: 'Organise planning work, priorities, deadlines and completion progress.',
  Guests: 'Manage the guest list, attendance details and invitation readiness.',
  Invitations: 'Create invitations, monitor delivery and keep track of RSVP responses.',
  Quotations: 'Review vendor requests, compare responses and manage quotation decisions.',
  Bookings: 'Follow confirmed services, vendor commitments and booking progress.',
  Reviews: 'Share verified feedback for vendors after completed services.',
  Complaints: 'Raise and follow service concerns connected to this event.',
  Documents: 'Keep contracts, receipts, reference files and event documents together.',
  'Mood board': 'Collect visual inspiration, themes, colours and creative references.',
};

const workspaceShortcutImages: Record<string, string> = {
  Budget: '/images/workspaces/shortcuts/budget.png',
  Tasks: '/images/workspaces/shortcuts/tasks.png',
  Guests: '/images/workspaces/shortcuts/guests.png',
  Invitations: '/images/workspaces/shortcuts/invitations.png',
  Quotations: '/images/workspaces/shortcuts/quotations.png',
  Bookings: '/images/workspaces/shortcuts/bookings.png',
  Reviews: '/images/workspaces/shortcuts/reviews.png',
  Complaints: '/images/workspaces/shortcuts/complaints.png',
  Documents: '/images/workspaces/shortcuts/documents.png',
  'Mood board': '/images/workspaces/shortcuts/moodboard.png',
};

type WorkspaceHeroTheme = {
  label: string;
  background: string;
  accent: string;
  softGlow: string;
  image: string;
  imagePosition: string;
};

const workspaceHeroThemes: Record<string, WorkspaceHeroTheme> = {
  birthday: {
    label: 'Birthday',
    background:
      'linear-gradient(118deg, rgba(255,250,246,0.99) 0%, rgba(248,239,245,0.97) 54%, rgba(226,207,224,0.90) 100%)',
    accent: 'rgba(183,167,200,0.26)',
    softGlow: 'rgba(220,177,194,0.20)',
    image: '/images/events/previews/birthday.png',
    imagePosition: '72% center',
  },

  wedding: {
    label: 'Wedding',
    background:
      'linear-gradient(118deg, rgba(255,251,247,0.99) 0%, rgba(250,240,242,0.97) 54%, rgba(231,208,215,0.90) 100%)',
    accent: 'rgba(199,167,181,0.24)',
    softGlow: 'rgba(230,196,201,0.18)',
    image: '/images/events/previews/wedding.png',
    imagePosition: '72% center',
  },

  graduation: {
    label: 'Graduation',
    background:
      'linear-gradient(118deg, rgba(255,251,244,0.99) 0%, rgba(244,240,235,0.97) 54%, rgba(204,194,184,0.90) 100%)',
    accent: 'rgba(142,101,94,0.22)',
    softGlow: 'rgba(198,184,168,0.18)',
    image: '/images/events/previews/graduation.png',
    imagePosition: '72% center',
  },

  corporate: {
    label: 'Corporate',
    background:
      'linear-gradient(118deg, rgba(250,252,255,0.99) 0%, rgba(234,240,246,0.97) 54%, rgba(185,201,217,0.90) 100%)',
    accent: 'rgba(91,126,157,0.22)',
    softGlow: 'rgba(166,190,211,0.18)',
    image: '/images/events/previews/corporate.png',
    imagePosition: '72% center',
  },

  party: {
    label: 'Party',
    background:
      'linear-gradient(118deg, rgba(255,250,248,0.99) 0%, rgba(248,231,239,0.97) 54%, rgba(205,162,185,0.90) 100%)',
    accent: 'rgba(181,91,137,0.22)',
    softGlow: 'rgba(233,158,154,0.18)',
    image: '/images/events/previews/party.png',
    imagePosition: '72% center',
  },

  'baby shower': {
    label: 'Baby Shower',
    background:
      'linear-gradient(118deg, rgba(255,253,247,0.99) 0%, rgba(246,245,230,0.97) 54%, rgba(206,216,194,0.90) 100%)',
    accent: 'rgba(181,198,169,0.22)',
    softGlow: 'rgba(234,221,181,0.18)',
    image: '/images/events/previews/babyshower.png',
    imagePosition: '72% center',
  },

  engagement: {
    label: 'Engagement',
    background:
      'linear-gradient(118deg, rgba(255,253,248,0.99) 0%, rgba(250,242,229,0.97) 54%, rgba(226,201,167,0.90) 100%)',
    accent: 'rgba(205,178,115,0.22)',
    softGlow: 'rgba(235,219,176,0.18)',
    image: '/images/events/previews/engagement.png',
    imagePosition: '72% center',
  },

  festival: {
    label: 'Festival',
    background:
      'linear-gradient(118deg, rgba(255,251,245,0.99) 0%, rgba(249,231,216,0.97) 54%, rgba(220,166,142,0.90) 100%)',
    accent: 'rgba(183,111,102,0.22)',
    softGlow: 'rgba(236,187,104,0.18)',
    image: '/images/events/previews/festival.png',
    imagePosition: '72% center',
  },

  anniversary: {
    label: 'Anniversary',
    background:
      'linear-gradient(118deg, rgba(255,252,247,0.99) 0%, rgba(247,239,234,0.97) 54%, rgba(214,194,180,0.90) 100%)',
    accent: 'rgba(179,143,112,0.22)',
    softGlow: 'rgba(217,194,167,0.18)',
    image: '/images/events/previews/anniversary.png',
    imagePosition: '72% center',
  },

  reception: {
    label: 'Reception',
    background:
      'linear-gradient(118deg, rgba(253,252,255,0.99) 0%, rgba(235,238,247,0.97) 54%, rgba(190,202,221,0.90) 100%)',
    accent: 'rgba(139,164,193,0.22)',
    softGlow: 'rgba(204,215,232,0.18)',
    image: '/images/events/previews/reception.png',
    imagePosition: '72% center',
  },

  'product launch': {
    label: 'Product Launch',
    background:
      'linear-gradient(118deg, rgba(248,251,255,0.99) 0%, rgba(226,235,246,0.97) 54%, rgba(151,172,204,0.91) 100%)',
    accent: 'rgba(96,132,188,0.24)',
    softGlow: 'rgba(125,205,235,0.18)',
    image: '/images/events/previews/productlaunch.png',
    imagePosition: '74% center',
  },

  default: {
    label: 'Event',
    background:
      'linear-gradient(118deg, rgba(255,250,246,0.99) 0%, rgba(247,239,242,0.97) 54%, rgba(224,211,220,0.90) 100%)',
    accent: 'rgba(183,167,200,0.24)',
    softGlow: 'rgba(205,176,188,0.18)',
    image: '/images/events/previews/birthday.png',
    imagePosition: '72% center',
  },
};

const normalizeWorkspaceEventType = (eventType: string) =>
  eventType.trim().replaceAll('_', ' ').replace(/\s+/g, ' ').toLowerCase();

const getWorkspaceEventTypeLabel = (eventType: string) => {
  const normalizedType = normalizeWorkspaceEventType(eventType);

  return eventTypeOptions.find((option) => option.toLowerCase() === normalizedType) ?? eventType;
};

const getWorkspaceHeroTheme = (eventType: string) => {
  const normalizedType = normalizeWorkspaceEventType(eventType);

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

const formatJourneyDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const getEventStageReachedAt = (event: CustomerEvent, stage: EventStatus): string | null => {
  const historyEntry = event.statusHistory.find((entry) => entry.newStatus === stage);

  if (historyEntry) {
    return historyEntry.changedAt;
  }

  if (stage === 'DRAFT') {
    return event.createdAt;
  }

  return null;
};

const getEventStageDateLabel = (event: CustomerEvent, stage: EventStatus): string => {
  const reachedAt = getEventStageReachedAt(event, stage);

  if (!reachedAt) {
    return 'Not reached';
  }

  switch (stage) {
    case 'DRAFT':
      return `Created ${formatJourneyDate(reachedAt)}`;

    case 'PLANNING':
      return `Planning started ${formatJourneyDate(reachedAt)}`;

    case 'ACTIVE':
      return `Activated ${formatJourneyDate(reachedAt)}`;

    case 'COMPLETED':
      return `Completed ${formatJourneyDate(reachedAt)}`;

    case 'CANCELLED':
      return `Cancelled ${formatJourneyDate(reachedAt)}`;
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
  eventType: getWorkspaceEventTypeLabel(event.eventType),
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

  if (normalizeWorkspaceEventType(eventType) !== normalizeWorkspaceEventType(event.eventType)) {
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

  const currentUserQuery = useCurrentUser();

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

  const currentUser = currentUserQuery.data;
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

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="space-y-4">
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
        </div>

        <main className="py-10">
          <section
            className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/68 px-5 pb-8 pt-6 shadow-[0_22px_64px_rgba(31,27,29,0.10)] sm:px-7 sm:pb-9 sm:pt-7 lg:min-h-[34rem] lg:px-9 lg:pb-10 lg:pt-8"
            style={{
              background: workspaceHeroTheme.background,
            }}
            onClick={(mouseEvent) => {
              const clickedElement = mouseEvent.target;

              if (!(clickedElement instanceof Element)) {
                return;
              }

              const clickedProtectedContent = clickedElement.closest(
                '[data-hero-content="true"], [data-snapshot-card="true"]',
              );

              if (clickedProtectedContent) {
                return;
              }

              setActiveSnapshotCard('theme');
            }}
          >
            <img
              src={workspaceHeroTheme.image}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full object-cover transition duration-1000"
              style={{
                objectPosition: workspaceHeroTheme.imagePosition,
                filter: 'saturate(0.90) contrast(0.95)',
              }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,248,0.99)_0%,rgba(255,252,248,0.97)_20%,rgba(255,252,248,0.88)_39%,rgba(255,252,248,0.60)_57%,rgba(255,252,248,0.24)_73%,rgba(255,252,248,0.06)_88%,transparent_100%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,transparent_46%,rgba(31,27,29,0.10)_100%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-[67%] bg-[radial-gradient(ellipse_at_left,rgba(255,252,248,0.42)_0%,rgba(255,252,248,0.17)_54%,transparent_82%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-28 -top-32 size-[28rem] rounded-full blur-3xl"
              style={{
                backgroundColor: workspaceHeroTheme.accent,
              }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 left-[8%] size-[30rem] rounded-full blur-3xl"
              style={{
                backgroundColor: workspaceHeroTheme.softGlow,
              }}
            />

            <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
              <div
                data-hero-content="true"
                className="lg:order-2 lg:flex lg:min-h-[25rem] lg:items-center lg:justify-end"
              >
                <div className="w-full lg:max-w-[31rem]">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/48 bg-white/28 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)] shadow-[0_10px_30px_rgba(31,27,29,0.08)] backdrop-blur-2xl">
                      <Sparkles aria-hidden="true" className="size-4" />
                      {workspaceHeroTheme.label}
                    </div>

                    <span
                      className="status-chip border-white/42 bg-white/24 shadow-[0_10px_30px_rgba(31,27,29,0.08)] backdrop-blur-2xl"
                      data-tone={getStatusTone(event.status)}
                    >
                      {event.status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <h1 className="mt-5 max-w-[30rem] text-balance text-4xl font-black leading-[1.01] tracking-[-0.05em] text-[var(--color-near-black)] drop-shadow-[0_1px_0_rgba(255,255,255,0.28)] sm:text-[2.8rem] lg:text-[3.05rem]">
                    {event.name}
                  </h1>

                  <div className="mt-5 max-w-[29rem] rounded-[1.35rem] border border-white/38 bg-white/18 px-5 py-4 shadow-[0_14px_38px_rgba(31,27,29,0.08)] backdrop-blur-2xl">
                    <p className="text-pretty text-base font-semibold leading-7 text-[var(--color-charcoal)]/76">
                      {event.requirements ??
                        'Coordinate vendors, budgets, guests and every important milestone from one organised workspace.'}
                    </p>
                  </div>
                </div>
              </div>

              <aside className="relative min-h-[21rem] lg:order-1 lg:min-h-[23rem]">
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
                <div data-snapshot-card="true" className="grid gap-3 sm:grid-cols-2 lg:hidden">
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
                <div className="relative hidden h-[23rem] lg:block">
                  <article
                    data-snapshot-card="true"
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
                    className={`group/snapshot-card absolute left-[3%] top-[2.8rem] w-[59%] cursor-pointer rounded-[1.8rem] border border-white/76 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(248,231,228,0.58))] p-5 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'date'
                        ? 'z-50 -translate-y-3 translate-x-1 scale-[1.065] rotate-0 opacity-100 brightness-100 shadow-[0_38px_88px_rgba(31,27,29,0.28)] ring-1 ring-white/70'
                        : 'z-20 -translate-x-1 translate-y-1 scale-[0.975] rotate-[-6deg] opacity-[0.74] brightness-[0.95] shadow-[0_18px_44px_rgba(31,27,29,0.12)]'
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
                    data-snapshot-card="true"
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
                    className={`group/snapshot-card absolute right-[4%] top-[5.1rem] w-[47%] cursor-pointer rounded-[1.65rem] border border-white/74 bg-[linear-gradient(145deg,rgba(248,244,251,0.90),rgba(220,207,230,0.76))] p-5 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'location'
                        ? 'z-50 -translate-y-3 -translate-x-2 scale-[1.065] rotate-0 opacity-100 brightness-100 shadow-[0_38px_88px_rgba(31,27,29,0.28)] ring-1 ring-white/70'
                        : 'z-30 translate-x-2 translate-y-2 scale-[0.965] rotate-[6.5deg] opacity-[0.72] brightness-[0.94] shadow-[0_18px_46px_rgba(31,27,29,0.13)]'
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
                    data-snapshot-card="true"
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
                    className={`group/snapshot-card absolute bottom-[2.6rem] left-[8%] w-[38%] cursor-pointer rounded-[1.6rem] border border-white/72 bg-[linear-gradient(145deg,rgba(250,250,242,0.76),rgba(222,222,195,0.60))] p-5 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'guests'
                        ? 'z-50 -translate-y-3 translate-x-2 scale-[1.065] rotate-0 opacity-100 brightness-100 shadow-[0_38px_88px_rgba(31,27,29,0.28)] ring-1 ring-white/70'
                        : 'z-10 -translate-x-2 translate-y-3 scale-[0.95] rotate-[5.5deg] opacity-[0.68] brightness-[0.93] shadow-[0_16px_40px_rgba(31,27,29,0.11)]'
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
                    data-snapshot-card="true"
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
                    className={`group/snapshot-card absolute bottom-[1.6rem] right-[5%] w-[54%] cursor-pointer rounded-[1.8rem] border border-white/76 bg-[linear-gradient(145deg,rgba(255,250,246,0.82),rgba(239,214,207,0.68))] p-5 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'budget'
                        ? 'z-50 -translate-y-3 -translate-x-2 scale-[1.065] rotate-0 opacity-100 brightness-100 shadow-[0_38px_88px_rgba(31,27,29,0.28)] ring-1 ring-white/70'
                        : 'z-40 -translate-x-1 -translate-y-1 scale-[0.985] rotate-[2.5deg] opacity-[0.80] brightness-[0.97] shadow-[0_24px_58px_rgba(31,27,29,0.17)]'
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
                    data-snapshot-card="true"
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
                    className={`group/snapshot-card absolute top-[9.4rem] left-[18%] w-[42%] cursor-pointer rounded-[1.5rem] border border-white/78 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(235,222,228,0.72))] px-5 py-4 backdrop-blur-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 ${
                      activeSnapshotCard === 'theme'
                        ? 'z-50 -translate-y-3 translate-x-1 scale-[1.07] rotate-0 opacity-100 brightness-100 shadow-[0_38px_88px_rgba(31,27,29,0.30)] ring-1 ring-white/75'
                        : 'z-[35] -translate-x-2 translate-y-1 scale-[0.955] rotate-[-3.5deg] opacity-[0.72] brightness-[0.94] shadow-[0_18px_46px_rgba(31,27,29,0.13)]'
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

          <section className="mt-7">
            <article className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] text-[#fffaf5] shadow-[0_24px_68px_rgba(93,58,85,0.24)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-[rgba(175,201,216,0.11)] blur-3xl"
              />

              <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_0.82fr] lg:items-stretch lg:p-9">
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <span className="grid size-13 place-items-center rounded-2xl border border-white/14 bg-white/10 text-[var(--color-powder-blue)] backdrop-blur-xl">
                        {event.status === 'COMPLETED' ? (
                          <CheckCircle2 aria-hidden="true" className="size-6" />
                        ) : event.status === 'CANCELLED' ? (
                          <Ban aria-hidden="true" className="size-6" />
                        ) : (
                          <Sparkles aria-hidden="true" className="size-6" />
                        )}
                      </span>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/52">
                          Planning status
                        </p>

                        <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                          {event.status.replaceAll('_', ' ')}
                        </h2>
                      </div>
                    </div>

                    <span className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/78 backdrop-blur-xl">
                      {event.status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-white/68">
                    {getEventStatusMessage(event.status)}
                  </p>

                  <div className="mt-7 grid gap-4 border-t border-white/12 pt-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
                        Last updated
                      </p>

                      <p className="mt-2 text-sm font-bold text-white/72">
                        {formatUpdatedAt(event.updatedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
                        Event type
                      </p>

                      <p className="mt-2 text-sm font-bold text-white/72">
                        {workspaceHeroTheme.label}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row sm:flex-wrap">
                    {isEventEditable ? (
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(31,27,29,0.24)]"
                        onClick={openEditForm}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        Update details
                      </button>
                    ) : (
                      <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/12 bg-white/[0.06] px-4 py-3.5 backdrop-blur-xl">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white/70">
                          {event.status === 'COMPLETED' ? (
                            <CheckCircle2 aria-hidden="true" className="size-4" />
                          ) : (
                            <Ban aria-hidden="true" className="size-4" />
                          )}
                        </span>

                        <div>
                          <p className="text-sm font-black text-white/84">
                            Event details are read-only
                          </p>

                          <p className="mt-1 text-xs font-semibold leading-5 text-white/48">
                            Completed and cancelled events cannot be edited.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-white/14 bg-white/[0.08] p-5 backdrop-blur-2xl sm:p-6">
                  {primaryStatusAction ? (
                    <>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/46">
                        Recommended next step
                      </p>

                      <p className="mt-3 text-sm font-semibold leading-6 text-white/64">
                        {primaryStatusAction.description}
                      </p>

                      <button
                        type="button"
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_14px_32px_rgba(31,27,29,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(31,27,29,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
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
                    </>
                  ) : (
                    <div className="flex h-full min-h-[13rem] flex-col justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/46">
                          Final event status
                        </p>

                        <p className="mt-3 text-lg font-black text-white/86">
                          {event.status.replaceAll('_', ' ')}
                        </p>

                        <p className="mt-2 text-sm font-semibold leading-6 text-white/54">
                          No further lifecycle actions are available for this event.
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between gap-4 rounded-[1.25rem] border border-white/12 bg-black/[0.08] p-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                            Current stage
                          </p>

                          <p className="mt-2 text-base font-black text-white/84">
                            {event.status.replaceAll('_', ' ')}
                          </p>
                        </div>

                        <span
                          className={
                            event.status === 'COMPLETED'
                              ? 'grid size-11 place-items-center rounded-2xl bg-[rgba(142,151,115,0.22)] text-[#dce7c5]'
                              : 'grid size-11 place-items-center rounded-2xl bg-white/10 text-white/68'
                          }
                        >
                          {event.status === 'COMPLETED' ? (
                            <CheckCircle2 aria-hidden="true" className="size-5" />
                          ) : (
                            <Ban aria-hidden="true" className="size-5" />
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
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
                        Follow the event through each lifecycle milestone.
                      </p>
                    </div>
                  </div>

                  <h2 className="mt-5 max-w-2xl text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] sm:text-3xl sm:tracking-[-0.045em]">
                    {event.status === 'CANCELLED'
                      ? 'Planning has stopped for this event.'
                      : 'See exactly when each stage was reached.'}
                  </h2>
                </div>

                <div className="self-start rounded-full border border-white/68 bg-white/42 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)] shadow-[0_8px_22px_rgba(31,27,29,0.06)] sm:self-auto">
                  Last updated {formatUpdatedAt(event.updatedAt)}
                </div>
              </div>

              {event.status === 'CANCELLED' ? (
                <div className="p-6 sm:p-8">
                  <div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
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

                          <p className="mt-4 text-sm font-black text-[var(--color-muted-burgundy)]">
                            {getEventStageDateLabel(event, 'CANCELLED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-white/58 bg-white/28 p-5 backdrop-blur-xl sm:p-6">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42">
                        Journey before cancellation
                      </p>

                      <div className="mt-5 space-y-4">
                        {(['DRAFT', 'PLANNING', 'ACTIVE'] as EventStatus[]).map((stage) => {
                          const reachedAt = getEventStageReachedAt(event, stage);

                          return (
                            <div
                              key={stage}
                              className="flex items-start justify-between gap-4 border-b border-white/45 pb-4 last:border-b-0 last:pb-0"
                            >
                              <div>
                                <p
                                  className={
                                    reachedAt
                                      ? 'text-sm font-black text-[var(--color-near-black)]'
                                      : 'text-sm font-black text-[var(--color-charcoal)]/34'
                                  }
                                >
                                  {stage}
                                </p>

                                <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                                  {getEventStageDateLabel(event, stage)}
                                </p>
                              </div>

                              <span
                                className={
                                  reachedAt
                                    ? 'grid size-8 shrink-0 place-items-center rounded-full bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]'
                                    : 'grid size-8 shrink-0 place-items-center rounded-full bg-white/34 text-[var(--color-charcoal)]/24'
                                }
                              >
                                {reachedAt ? (
                                  <CheckCircle2 aria-hidden="true" className="size-4" />
                                ) : (
                                  <span className="size-1.5 rounded-full bg-current" />
                                )}
                              </span>
                            </div>
                          );
                        })}
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
                        const reachedAt = getEventStageReachedAt(event, stage);

                        return (
                          <div
                            key={stage}
                            className={
                              isCurrent
                                ? 'group/stage relative rounded-[1.45rem] border border-[rgba(93,58,85,0.18)] bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(235,222,228,0.56))] p-4 shadow-[0_16px_38px_rgba(93,58,85,0.12)] transition duration-300 hover:-translate-y-0.5 sm:border-transparent sm:bg-transparent sm:p-0 sm:shadow-none'
                                : 'group/stage relative rounded-[1.45rem] border border-white/54 bg-white/24 p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white/38 sm:border-transparent sm:bg-transparent sm:p-0'
                            }
                          >
                            <div className="relative z-10 flex items-start gap-4 sm:flex-col sm:items-center sm:text-center">
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

                                <p
                                  className={
                                    reachedAt
                                      ? 'mt-3 text-xs font-black leading-5 text-[var(--color-deep-plum)]/76'
                                      : 'mt-3 text-xs font-bold leading-5 text-[var(--color-charcoal)]/30'
                                  }
                                >
                                  {getEventStageDateLabel(event, stage)}
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Workspace shortcuts
                  </p>

                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Continue planning from here.
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-charcoal)]/58">
                    Jump directly into the part of this event that needs your attention.
                  </p>
                </div>

                <span className="w-fit rounded-full border border-white/68 bg-white/36 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-[var(--color-deep-plum)] shadow-[0_8px_22px_rgba(31,27,29,0.06)] backdrop-blur-xl">
                  {event.status.replaceAll('_', ' ')} event
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {workspaceSections
                  .filter(({ label }) => {
                    if (label === 'Overview') {
                      return false;
                    }

                    if (label === 'Reviews' && event.status !== 'COMPLETED') {
                      return false;
                    }

                    return true;
                  })
                  .map(({ label, icon: Icon, path }, sectionIndex) => {
                    const shortcutImage = workspaceShortcutImages[label];

                    return (
                      <Link
                        key={label}
                        to={path(event.id)}
                        className="group relative isolate min-h-[12.5rem] overflow-hidden rounded-[1.55rem] border border-white/72 bg-[rgba(255,252,248,0.76)] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.08)] transition duration-300 hover:-translate-y-1 hover:border-white/95 hover:shadow-[0_26px_62px_rgba(31,27,29,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/40 xl:min-h-[14rem]"
                        style={{
                          animationDelay: `${Math.min(sectionIndex, 8) * 55}ms`,
                        }}
                      >
                        <img
                          src={shortcutImage}
                          alt=""
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 -z-30 size-full scale-[1.04] object-cover object-[72%_center] opacity-[0.82] blur-[1.2px] saturate-[0.88] transition duration-700 group-hover:scale-[1.08] group-hover:opacity-[0.92] group-hover:blur-[0.7px]"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(255,252,248,0.99)_0%,rgba(255,252,248,0.96)_26%,rgba(255,252,248,0.84)_48%,rgba(255,252,248,0.54)_70%,rgba(255,252,248,0.16)_100%)]"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,252,248,0.04)_38%,rgba(255,252,248,0.80)_100%)]"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-10 -top-12 -z-10 size-36 rounded-full bg-white/18 blur-3xl transition duration-700 group-hover:scale-125 group-hover:bg-white/26"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-[linear-gradient(90deg,var(--color-deep-plum),transparent)] transition-transform duration-500 group-hover:scale-x-100"
                        />

                        <div className="relative flex h-full flex-col">
                          <div className="flex items-start justify-between gap-4">
                            <span className="grid size-10 place-items-center rounded-[0.95rem] border border-white/72 bg-white/48 text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[3deg] group-hover:scale-105 group-hover:bg-white/64">
                              <Icon aria-hidden="true" className="size-[1.05rem]" />
                            </span>

                            <span className="grid size-9 place-items-center rounded-full border border-white/72 bg-white/42 text-[var(--color-charcoal)]/52 shadow-[0_8px_20px_rgba(31,27,29,0.06)] backdrop-blur-xl transition duration-300 group-hover:translate-x-1 group-hover:bg-white/68 group-hover:text-[var(--color-deep-plum)]">
                              <ArrowLeft aria-hidden="true" className="size-4 rotate-180" />
                            </span>
                          </div>

                          <div className="mt-5">
                            <p className="text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)] drop-shadow-[0_1px_0_rgba(255,255,255,0.36)]">
                              {label}
                            </p>

                            <p className="mt-2 text-sm font-semibold leading-5 text-[var(--color-charcoal)]/66">
                              {workspaceSectionDescriptions[label]}
                            </p>
                          </div>

                          <p className="mt-auto pt-4 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]/78 transition duration-300 group-hover:text-[var(--color-deep-plum)]">
                            Open workspace
                          </p>
                        </div>
                      </Link>
                    );
                  })}
              </div>

              {event.status !== 'COMPLETED' ? (
                <div className="flex items-start gap-3 rounded-[1.35rem] border border-white/58 bg-white/22 px-4 py-3.5 backdrop-blur-xl">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.14)] text-[var(--color-deep-plum)]">
                    <Star aria-hidden="true" className="size-4" />
                  </span>

                  <p className="pt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                    Reviews become available after the event is completed and eligible vendor
                    services can receive verified feedback.
                  </p>
                </div>
              ) : null}
              <article className="overflow-hidden rounded-[1.65rem] border border-white/58 bg-white/22 shadow-[0_14px_38px_rgba(31,27,29,0.06)] backdrop-blur-2xl">
                <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-start gap-4">
                    <span
                      className={
                        canDeleteEvent
                          ? 'grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)]'
                          : 'grid size-11 shrink-0 place-items-center rounded-2xl bg-white/32 text-[var(--color-charcoal)]/42'
                      }
                    >
                      <Trash2 aria-hidden="true" className="size-5" />
                    </span>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/42">
                        Event controls
                      </p>

                      <h3 className="mt-2 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                        {canDeleteEvent
                          ? 'Remove this event permanently'
                          : 'Deletion is unavailable at this stage'}
                      </h3>

                      <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        {canDeleteEvent
                          ? 'Delete this event only when it is no longer needed. This action cannot be undone.'
                          : event.status === 'COMPLETED'
                            ? 'Completed events are preserved as part of your planning and service history.'
                            : 'Only draft or cancelled events can be deleted. Events already in progress must remain available for their connected workflows.'}
                      </p>
                    </div>
                  </div>

                  {canDeleteEvent ? (
                    <button
                      type="button"
                      className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-[rgba(124,74,90,0.20)] bg-[rgba(124,74,90,0.08)] px-4 py-3 text-sm font-black text-[var(--color-muted-burgundy)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.30)] hover:bg-[rgba(124,74,90,0.13)] hover:shadow-[0_14px_32px_rgba(124,74,90,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-muted-burgundy)]/30"
                      onClick={() => {
                        deleteEventMutation.reset();
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      Delete event
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full border border-white/62 bg-white/32 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/46">
                      Protected
                    </span>
                  )}
                </div>
              </article>
            </section>
          </section>
        </main>
      </div>

      {isEditFormOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-6 backdrop-blur-md sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-event-title"
          onMouseDown={(mouseEvent) => {
            if (mouseEvent.target === mouseEvent.currentTarget && !updateEventMutation.isPending) {
              closeEditForm();
            }
          }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center">
            <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/70 bg-[rgba(255,252,248,0.94)] shadow-[0_32px_90px_rgba(31,27,29,0.26)] backdrop-blur-2xl">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-[rgba(220,177,194,0.12)] blur-3xl"
              />

              <div className="relative border-b border-[rgba(93,58,85,0.10)] px-6 py-6 sm:px-8 sm:py-7">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(93,58,85,0.12)] bg-[rgba(93,58,85,0.07)] px-3.5 py-2 text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-deep-plum)]">
                      <Pencil className="size-3.5" />
                      Edit event
                    </div>

                    <h2
                      id="edit-event-title"
                      className="mt-4 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-[2.35rem]"
                    >
                      Refine your event details.
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58 sm:text-[0.95rem] sm:leading-7">
                      Update the core information that shapes this event workspace, including its
                      date, location, guest estimate, budget and planning direction.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-[rgba(93,58,85,0.10)] bg-white/72 text-[var(--color-charcoal)]/58 shadow-[0_8px_20px_rgba(31,27,29,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.18)] hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close edit event form"
                    disabled={updateEventMutation.isPending}
                    onClick={closeEditForm}
                  >
                    <X className="size-4.5" />
                  </button>
                </div>
              </div>

              <form onSubmit={onSubmit}>
                <div className="relative max-h-[68vh] overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
                  <div className="space-y-7">
                    <section>
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Event basics
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/46">
                            Keep the main event information accurate.
                          </p>
                        </div>

                        <span className="hidden rounded-full border border-white/76 bg-white/62 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]/70 shadow-[0_6px_18px_rgba(31,27,29,0.05)] sm:inline-flex">
                          Required details
                        </span>
                      </div>

                      <div className="grid gap-4 rounded-[1.6rem] border border-white/74 bg-white/48 p-4 shadow-[0_14px_38px_rgba(31,27,29,0.06)] backdrop-blur-xl sm:grid-cols-2 sm:p-5">
                        <label className="block">
                          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/70">
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
                          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/70">
                            Event type
                          </span>

                          <select
                            className="form-field"
                            disabled={updateEventMutation.isPending}
                            {...form.register('eventType')}
                          >
                            {eventTypeOptions.map((eventTypeOption) => (
                              <option key={eventTypeOption} value={eventTypeOption}>
                                {eventTypeOption}
                              </option>
                            ))}
                          </select>

                          {form.formState.errors.eventType ? (
                            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                              {form.formState.errors.eventType.message}
                            </span>
                          ) : null}
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/70">
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
                          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/70">
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
                    </section>

                    <section>
                      <div className="mb-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                          Planning details
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/46">
                          Adjust the information used throughout the planning workspace.
                        </p>
                      </div>

                      <div className="grid gap-4 rounded-[1.6rem] border border-white/74 bg-white/42 p-4 shadow-[0_14px_38px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:grid-cols-2 sm:p-5">
                        <label className="block">
                          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/70">
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
                          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/70">
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

                        <label className="block sm:col-span-2">
                          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/70">
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

                        <label className="block sm:col-span-2">
                          <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/70">
                            Planning requirements
                          </span>

                          <textarea
                            className="form-field min-h-28 resize-y"
                            disabled={updateEventMutation.isPending}
                            {...form.register('requirements')}
                          />

                          {form.formState.errors.requirements ? (
                            <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                              {form.formState.errors.requirements.message}
                            </span>
                          ) : null}
                        </label>
                      </div>
                    </section>

                    {form.formState.errors.root?.message ? (
                      <div
                        role="alert"
                        className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.09)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                      >
                        {form.formState.errors.root.message}
                      </div>
                    ) : null}

                    {updateEventMutation.isError ? (
                      <div
                        role="alert"
                        className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.09)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                      >
                        {getApiErrorMessage(updateEventMutation.error)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="relative flex flex-col-reverse gap-3 border-t border-[rgba(93,58,85,0.10)] bg-[rgba(255,250,246,0.82)] px-6 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <p className="hidden max-w-md text-xs font-semibold leading-5 text-[var(--color-charcoal)]/44 sm:block">
                    Changes affect this event workspace and its connected planning details.
                  </p>

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
          onMouseDown={(mouseEvent) => {
            if (mouseEvent.target === mouseEvent.currentTarget && !deleteEventMutation.isPending) {
              setIsDeleteDialogOpen(false);
              deleteEventMutation.reset();
            }
          }}
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
