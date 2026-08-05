import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CircleAlert,
  Clock3,
  ListChecks,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  Sparkles,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { PageBackButton } from '../components/navigation/PageBackButton';
import { InvitationTemplateSelector } from '../features/events/InvitationTemplateSelector';
import {
  createCustomerEvent,
  eventInvitationTemplateOptions,
  eventTypeOptions,
  getCustomerEvents,
  type CreateEventPayload,
  type EventInvitationTemplate,
  type EventStatus,
  type EventTypeOption,
} from '../features/events/event.api';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type EventPreviewTheme = {
  eyebrow: string;
  helper: string;
  background: string;
  accent: string;
  decoration:
    | 'birthday'
    | 'wedding'
    | 'graduation'
    | 'corporate'
    | 'party'
    | 'baby'
    | 'engagement'
    | 'festival';
};

const eventPreviewThemes: Partial<Record<EventTypeOption, EventPreviewTheme>> = {
  Birthday: {
    eyebrow: 'A joyful celebration',
    helper: 'Ribbon, confetti and playful stationery details.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(247,238,245,0.98) 55%, rgba(218,197,221,0.94))',
    accent: 'linear-gradient(90deg, rgba(183,167,200,1), rgba(214,190,209,1), rgba(93,58,85,1))',
    decoration: 'birthday',
  },

  Wedding: {
    eyebrow: 'An elegant ceremony',
    helper: 'Vellum stationery, botanical details and pearl accents.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(250,239,242,0.98) 55%, rgba(225,202,211,0.94))',
    accent: 'linear-gradient(90deg, rgba(199,167,181,1), rgba(226,194,198,1), rgba(142,92,103,1))',
    decoration: 'wedding',
  },

  Graduation: {
    eyebrow: 'A milestone achieved',
    helper: 'Certificate layers, laurel details and warm gold foil.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(248,245,234,0.98) 55%, rgba(216,219,191,0.94))',
    accent: 'linear-gradient(90deg, rgba(210,207,175,1), rgba(190,188,144,1), rgba(113,117,76,1))',
    decoration: 'graduation',
  },

  Corporate: {
    eyebrow: 'Executive planning',
    helper: 'Structured grids, drafting lines and bronze details.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(243,238,233,0.98) 55%, rgba(206,188,176,0.94))',
    accent: 'linear-gradient(90deg, rgba(188,165,148,1), rgba(157,126,108,1), rgba(88,67,61,1))',
    decoration: 'corporate',
  },

  Party: {
    eyebrow: 'An evening to remember',
    helper: 'Warm venue lights, ticket details and energetic trails.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(249,239,236,0.98) 55%, rgba(227,199,190,0.94))',
    accent: 'linear-gradient(90deg, rgba(223,183,174,1), rgba(191,137,137,1), rgba(124,74,90,1))',
    decoration: 'party',
  },

  'Baby Shower': {
    eyebrow: 'A gentle celebration',
    helper: 'Scalloped stationery, warm stars and dreamy details.',
    background:
      'linear-gradient(145deg, rgba(255,253,247,0.99), rgba(249,245,230,0.98) 55%, rgba(218,218,191,0.94))',
    accent: 'linear-gradient(90deg, rgba(234,221,181,1), rgba(199,193,151,1), rgba(135,139,94,1))',
    decoration: 'baby',
  },

  Engagement: {
    eyebrow: 'A promise begins',
    helper: 'Champagne silk, interlocking rings and pearl highlights.',
    background:
      'linear-gradient(145deg, rgba(255,253,248,0.99), rgba(250,245,231,0.98) 55%, rgba(231,213,174,0.94))',
    accent: 'linear-gradient(90deg, rgba(235,219,176,1), rgba(205,178,115,1), rgba(150,115,57,1))',
    decoration: 'engagement',
  },

  Festival: {
    eyebrow: 'A glowing celebration',
    helper: 'Hanging lights, festive arches and metallic warmth.',
    background:
      'linear-gradient(145deg, rgba(255,252,246,0.99), rgba(250,237,224,0.98) 55%, rgba(223,183,157,0.94))',
    accent: 'linear-gradient(90deg, rgba(236,187,104,1), rgba(183,111,102,1), rgba(124,74,90,1))',
    decoration: 'festival',
  },
};

const createEventFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Event name must be at least 3 characters.')
      .max(120, 'Event name cannot exceed 120 characters.'),

    eventType: z.enum(eventTypeOptions, {
      message: 'Choose an event type.',
    }),

    invitationTemplate: z.union([z.literal(''), z.enum(eventInvitationTemplateOptions)]),

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
  })
  .superRefine((values, ctx) => {
    if (values.invitationTemplate === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['invitationTemplate'],
        message: 'Choose an invitation design.',
      });
    }
  });

type CreateEventFormValues = z.infer<typeof createEventFormSchema>;

const eventStatuses: Array<{ value: 'ALL' | EventStatus; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const heroFeatures = [
  {
    icon: CalendarCheck2,
    title: 'Organised',
    description: 'All your events in one place',
    iconClassName: 'bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]',
  },
  {
    icon: ListChecks,
    title: 'Track progress',
    description: 'Stay on top of every detail',
    iconClassName: 'bg-[rgba(175,201,216,0.24)] text-[var(--color-info)]',
  },
  {
    icon: UsersRound,
    title: 'Coordinate',
    description: 'Keep planning details connected',
    iconClassName: 'bg-[rgba(142,92,103,0.17)] text-[var(--color-rosewood)]',
  },
];
type EventCardStyle = {
  background: string;
  accent: string;
  glow: string;
  typeColor: string;
};

const eventCardStyles: Record<string, EventCardStyle> = {
  wedding: {
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(250,239,242,0.97) 56%, rgba(225,202,211,0.90) 100%)',
    accent:
      'linear-gradient(90deg, rgba(199,167,181,1) 0%, rgba(226,194,198,1) 48%, rgba(142,92,103,1) 100%)',
    glow: 'rgba(199,167,181,0.24)',
    typeColor: 'var(--color-rosewood)',
  },

  birthday: {
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(247,238,245,0.97) 56%, rgba(218,197,221,0.90) 100%)',
    accent:
      'linear-gradient(90deg, rgba(183,167,200,1) 0%, rgba(214,190,209,1) 50%, rgba(93,58,85,1) 100%)',
    glow: 'rgba(183,167,200,0.26)',
    typeColor: 'var(--color-deep-plum)',
  },

  graduation: {
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(248,245,234,0.97) 56%, rgba(216,219,191,0.90) 100%)',
    accent:
      'linear-gradient(90deg, rgba(210,207,175,1) 0%, rgba(190,188,144,1) 48%, rgba(113,117,76,1) 100%)',
    glow: 'rgba(185,190,139,0.24)',
    typeColor: '#74784f',
  },

  corporate: {
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(243,238,233,0.97) 56%, rgba(206,188,176,0.90) 100%)',
    accent:
      'linear-gradient(90deg, rgba(188,165,148,1) 0%, rgba(157,126,108,1) 50%, rgba(88,67,61,1) 100%)',
    glow: 'rgba(157,126,108,0.22)',
    typeColor: '#755c50',
  },

  conference: {
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(245,238,241,0.97) 56%, rgba(213,194,204,0.90) 100%)',
    accent:
      'linear-gradient(90deg, rgba(199,174,187,1) 0%, rgba(167,132,151,1) 50%, rgba(112,76,96,1) 100%)',
    glow: 'rgba(167,132,151,0.23)',
    typeColor: '#765065',
  },

  religious: {
    background:
      'linear-gradient(145deg, rgba(255,253,247,0.99) 0%, rgba(249,243,226,0.97) 56%, rgba(229,211,165,0.88) 100%)',
    accent:
      'linear-gradient(90deg, rgba(232,217,177,1) 0%, rgba(205,178,115,1) 50%, rgba(150,115,57,1) 100%)',
    glow: 'rgba(205,178,115,0.22)',
    typeColor: '#806638',
  },

  party: {
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(249,239,236,0.97) 56%, rgba(227,199,190,0.90) 100%)',
    accent:
      'linear-gradient(90deg, rgba(223,183,174,1) 0%, rgba(191,137,137,1) 50%, rgba(124,74,90,1) 100%)',
    glow: 'rgba(191,137,137,0.23)',
    typeColor: 'var(--color-muted-burgundy)',
  },

  workshop: {
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(245,245,235,0.97) 56%, rgba(207,211,180,0.90) 100%)',
    accent:
      'linear-gradient(90deg, rgba(210,214,187,1) 0%, rgba(171,179,136,1) 50%, rgba(103,111,71,1) 100%)',
    glow: 'rgba(171,179,136,0.22)',
    typeColor: '#687048',
  },

  default: {
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(248,240,242,0.97) 56%, rgba(223,207,216,0.88) 100%)',
    accent:
      'linear-gradient(90deg, rgba(183,167,200,1) 0%, rgba(205,176,188,1) 50%, rgba(124,74,90,1) 100%)',
    glow: 'rgba(183,167,200,0.23)',
    typeColor: 'var(--color-rosewood)',
  },
};

const getEventCardStyle = (eventType: string): EventCardStyle => {
  const normalizedType = eventType.trim().toLowerCase();

  if (normalizedType.includes('wedding')) {
    return eventCardStyles.wedding;
  }

  if (normalizedType.includes('birthday')) {
    return eventCardStyles.birthday;
  }

  if (normalizedType.includes('graduation')) {
    return eventCardStyles.graduation;
  }

  if (
    normalizedType.includes('corporate') ||
    normalizedType.includes('business') ||
    normalizedType.includes('product launch')
  ) {
    return eventCardStyles.corporate;
  }

  if (
    normalizedType.includes('conference') ||
    normalizedType.includes('seminar') ||
    normalizedType.includes('summit')
  ) {
    return eventCardStyles.conference;
  }

  if (
    normalizedType.includes('religious') ||
    normalizedType.includes('ceremony') ||
    normalizedType.includes('pooja')
  ) {
    return eventCardStyles.religious;
  }

  if (
    normalizedType.includes('party') ||
    normalizedType.includes('celebration') ||
    normalizedType.includes('engagement')
  ) {
    return eventCardStyles.party;
  }

  if (
    normalizedType.includes('workshop') ||
    normalizedType.includes('training') ||
    normalizedType.includes('class')
  ) {
    return eventCardStyles.workshop;
  }

  return eventCardStyles.default;
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
      return 'success';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EventStatus>('ALL');

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      name: '',
      eventType: undefined,
      invitationTemplate: '',
      eventDate: '',
      location: '',
      guestCount: '',
      plannedBudget: '',
      theme: '',
      requirements: '',
    },
  });

  const previewEventType = form.watch('eventType');
  const selectedInvitationTemplate = form.watch('invitationTemplate');
  const previewName = form.watch('name');
  const previewDate = form.watch('eventDate');
  const previewLocation = form.watch('location');
  const previewGuestCount = form.watch('guestCount');
  const previewBudget = form.watch('plannedBudget');
  const previewThemeName = form.watch('theme');

  const selectedPreviewType: EventTypeOption = eventTypeOptions.includes(
    previewEventType as EventTypeOption,
  )
    ? (previewEventType as EventTypeOption)
    : 'Birthday';

  const defaultPreviewTheme: EventPreviewTheme = eventPreviewThemes.Birthday!;

  const selectedPreviewTheme: EventPreviewTheme =
    eventPreviewThemes[selectedPreviewType] ?? defaultPreviewTheme;

  const previewFormattedDate =
    previewDate && Number.isFinite(new Date(previewDate).getTime())
      ? new Intl.DateTimeFormat('en-LK', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(new Date(previewDate))
      : 'Choose a date';

  const previewFormattedBudget =
    previewBudget && Number.isFinite(Number(previewBudget))
      ? new Intl.NumberFormat('en-LK', {
          style: 'currency',
          currency: 'LKR',
          maximumFractionDigits: 0,
        }).format(Number(previewBudget))
      : 'Budget not set';

  useEffect(() => {
    if (!previewEventType) {
      form.setValue('invitationTemplate', '', {
        shouldValidate: false,
        shouldDirty: false,
      });

      return;
    }

    form.setValue('invitationTemplate', '', {
      shouldValidate: false,
      shouldDirty: true,
    });
  }, [form, previewEventType]);

  const eventsQuery = useQuery({
    queryKey: ['customer', 'events'],
    queryFn: () =>
      getCustomerEvents({
        page: 1,
        limit: 20,
        sort: 'upcoming',
      }),
  });

  const createEventMutation = useMutation({
    mutationFn: (payload: CreateEventPayload) => createCustomerEvent(payload),

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

  const filteredEvents = useMemo(() => {
    const events = eventsQuery.data?.events ?? [];
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return events.filter((event) => {
      const matchesStatus = statusFilter === 'ALL' || event.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        event.name.toLowerCase().includes(normalizedSearch) ||
        event.eventType.toLowerCase().includes(normalizedSearch) ||
        event.location.toLowerCase().includes(normalizedSearch) ||
        event.theme?.toLowerCase().includes(normalizedSearch);

      return matchesStatus && Boolean(matchesSearch);
    });
  }, [eventsQuery.data?.events, searchQuery, statusFilter]);

  const openCreateForm = () => {
    createEventMutation.reset();
    setIsCreateFormOpen(true);
  };

  const closeCreateForm = () => {
    if (createEventMutation.isPending) {
      return;
    }

    form.reset();
    createEventMutation.reset();
    setIsCreateFormOpen(false);
  };

  useEffect(() => {
    if (!isCreateFormOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      form.setFocus('name');
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !createEventMutation.isPending) {
        form.reset();
        createEventMutation.reset();
        setIsCreateFormOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [createEventMutation.isPending, form, isCreateFormOpen]);

  const onSubmit = form.handleSubmit((values) => {
    createEventMutation.mutate({
      name: values.name.trim(),
      eventType: values.eventType,
      invitationTemplate: values.invitationTemplate as EventInvitationTemplate,
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

  return (
    <div className="app-shell relative min-h-screen overflow-hidden px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[8vw] -top-20 z-0 hidden h-[62rem] w-[72vw] min-w-[58rem] lg:block"
        style={{
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 9%, rgba(0,0,0,0.30) 20%, rgba(0,0,0,0.68) 34%, black 50%, black 100%)',
          maskImage:
            'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 9%, rgba(0,0,0,0.30) 20%, rgba(0,0,0,0.68) 34%, black 50%, black 100%)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            WebkitMaskImage:
              'linear-gradient(180deg, black 0%, black 52%, rgba(0,0,0,0.92) 62%, rgba(0,0,0,0.64) 72%, rgba(0,0,0,0.28) 82%, rgba(0,0,0,0.07) 90%, transparent 97%)',
            maskImage:
              'linear-gradient(180deg, black 0%, black 52%, rgba(0,0,0,0.92) 62%, rgba(0,0,0,0.64) 72%, rgba(0,0,0,0.28) 82%, rgba(0,0,0,0.07) 90%, transparent 97%)',
          }}
        >
          <img
            src="/images/workspaces/events-page-atmosphere.png"
            alt=""
            className="absolute inset-0 size-full object-cover"
            style={{
              objectPosition: '64% top',
              opacity: 0.92,
              filter: 'saturate(0.91) contrast(0.97)',
            }}
          />

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,239,233,0.94)_0%,rgba(246,239,233,0.66)_17%,rgba(246,239,233,0.24)_34%,rgba(246,239,233,0.06)_50%,transparent_68%)]" />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,243,0.03)_0%,transparent_48%,rgba(229,215,207,0.12)_65%,rgba(239,228,219,0.36)_80%,rgba(239,228,219,0.62)_100%)]" />

          <div className="absolute bottom-[7%] left-[14%] h-[38%] w-[82%] bg-[radial-gradient(ellipse_at_bottom,rgba(229,215,207,0.48)_0%,rgba(207,180,180,0.12)_46%,transparent_76%)] blur-3xl" />

          <div className="absolute -right-20 -top-20 size-[30rem] rounded-full bg-[rgba(255,210,190,0.06)] blur-3xl" />
        </div>
      </div>
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PageBackButton fallback="/dashboard" label="Dashboard" className="shrink-0" />

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Customer workspace
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                Your events
              </h1>
            </div>
          </div>

          <button type="button" className="btn-primary text-sm font-bold" onClick={openCreateForm}>
            <Plus aria-hidden="true" className="size-4" />
            Create event
          </button>
        </header>

        <main className="py-10">
          <section
            className="relative isolate min-h-[30rem] overflow-hidden rounded-[2.5rem] border border-white/70 bg-[linear-gradient(112deg,rgba(255,248,241,0.97)_0%,rgba(250,237,238,0.92)_40%,rgba(229,221,238,0.90)_72%,rgba(216,231,239,0.88)_100%)] shadow-[0_30px_90px_rgba(31,27,29,0.14)] animate-[heroFloat_2s_ease-in-out_infinite]"
            aria-labelledby="events-page-title"
          >
            <img
              src="/images/workspaces/events-hero-planner.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[58%] object-cover object-[62%_center] opacity-[0.86] lg:block"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-[24%] hidden w-[52%] bg-[linear-gradient(90deg,rgba(255,247,241,1)_0%,rgba(255,247,241,0.985)_18%,rgba(255,247,241,0.92)_34%,rgba(255,247,241,0.72)_50%,rgba(255,247,241,0.42)_66%,rgba(255,247,241,0.16)_82%,transparent_100%)] lg:block"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,transparent_0%,rgba(255,250,246,0.38)_58%,rgba(255,250,246,0.72)_100%)]"
            />

            <div className="relative z-10 flex min-h-[30rem] flex-col justify-between p-6 sm:p-8 lg:w-[61%] lg:p-10 xl:p-12">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Event planning
                </div>

                <h2
                  id="events-page-title"
                  className="max-w-2xl text-balance text-5xl font-black leading-[0.96] tracking-[-0.06em] text-[var(--color-near-black)] sm:text-[3.55rem] xl:text-[4rem]"
                >
                  Every celebration, organised in one{' '}
                  <span className="text-[var(--color-muted-burgundy)]">calm place.</span>
                </h2>

                <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Create events, track their details and open each workspace as your planning
                  journey grows.
                </p>
              </div>

              <div className="mt-7 grid max-w-[42rem] gap-3 sm:grid-cols-3">
                {heroFeatures.map((feature) => {
                  const FeatureIcon = feature.icon;

                  return (
                    <div
                      key={feature.title}
                      className="group rounded-[1.35rem] border border-white/72 bg-white/54 p-3 shadow-[0_14px_38px_rgba(31,27,29,0.09)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/68 hover:shadow-[0_20px_48px_rgba(31,27,29,0.13)]"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid size-10 shrink-0 place-items-center rounded-xl ${feature.iconClassName}`}
                        >
                          <FeatureIcon aria-hidden="true" className="size-[1.15rem]" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            {feature.title}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/58">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-7 right-7 z-20 hidden lg:block xl:bottom-9 xl:right-9">
              <div className="events-count-card glass-card pointer-events-auto w-48 p-5 transition duration-300 hover:-translate-y-1">
                <span className="grid size-10 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <CalendarDays aria-hidden="true" className="size-5" />
                </span>

                <p className="mt-4 text-4xl font-black tracking-[-0.06em] text-[var(--color-near-black)]">
                  {eventsQuery.data?.pagination.total ?? 0}
                </p>

                <p className="mt-1 text-sm font-black text-[var(--color-near-black)]">
                  Total events
                </p>

                <p className="mt-2 text-xs leading-5 text-[var(--color-charcoal)]/60">
                  Across every planning stage
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12" aria-labelledby="customer-events-list-title">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    id="customer-events-list-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    Your events
                  </h2>

                  <span className="soft-chip min-h-8 px-3 py-1 text-xs font-black text-[var(--color-deep-plum)]">
                    {eventsQuery.data?.pagination.total ?? 0}{' '}
                    {(eventsQuery.data?.pagination.total ?? 0) === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <p className="mt-3 max-w-2xl leading-7 text-[var(--color-charcoal)]/64">
                  Open an event to continue planning, coordination and progress tracking.
                </p>
              </div>

              {!eventsQuery.isLoading &&
              !eventsQuery.isError &&
              (eventsQuery.data?.events.length ?? 0) > 0 ? (
                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                  <label className="relative block min-w-0 sm:min-w-72">
                    <span className="sr-only">Search events</span>

                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42"
                    />

                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                      }}
                      className="form-field h-12 rounded-full !pl-12 pr-4 placeholder:text-[var(--color-charcoal)]/38"
                      placeholder="Search events..."
                    />
                  </label>

                  <label className="block sm:min-w-44">
                    <span className="sr-only">Filter events by status</span>

                    <select
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value as 'ALL' | EventStatus);
                      }}
                      className="form-field h-12 rounded-full px-4"
                    >
                      {eventStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>

            <div className="relative mt-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-[6%] top-10 h-72 bg-[linear-gradient(105deg,transparent_4%,rgba(183,167,200,0.15)_32%,rgba(255,255,255,0.18)_58%,rgba(175,201,216,0.17)_82%,transparent_96%)] blur-3xl"
              />

              {eventsQuery.isLoading ? (
                <div className="glass-card relative grid min-h-80 place-items-center p-10 text-center">
                  <div>
                    <LoaderCircle
                      aria-hidden="true"
                      className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]"
                    />

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
                <div className="glass-card relative grid min-h-80 place-items-center p-10 text-center">
                  <div className="max-w-lg">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
                      <CircleAlert aria-hidden="true" className="size-7" />
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
                <div className="glass-card relative grid min-h-80 place-items-center p-10 text-center">
                  <div className="max-w-lg">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                      <CalendarDays aria-hidden="true" className="size-7" />
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
                      onClick={openCreateForm}
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Create event
                    </button>
                  </div>
                </div>
              ) : null}

              {!eventsQuery.isLoading &&
              !eventsQuery.isError &&
              eventsQuery.data &&
              eventsQuery.data.events.length > 0 &&
              filteredEvents.length === 0 ? (
                <div className="glass-card relative grid min-h-72 place-items-center p-10 text-center">
                  <div className="max-w-lg">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(175,201,216,0.22)] text-[var(--color-deep-plum)]">
                      <Search aria-hidden="true" className="size-7" />
                    </div>

                    <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                      No matching events
                    </p>

                    <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                      Try a different search term or choose another event status.
                    </p>

                    <button
                      type="button"
                      className="btn-secondary mt-6 text-sm font-bold"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('ALL');
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              ) : null}

              {!eventsQuery.isLoading && !eventsQuery.isError && filteredEvents.length > 0 ? (
                <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredEvents.map((event, eventIndex) => {
                    const eventCardStyle = getEventCardStyle(event.eventType);
                    const normalizedEventType = event.eventType.trim().toLowerCase();
                    const isBirthdayEvent = normalizedEventType.includes('birthday');
                    const isWeddingEvent = normalizedEventType.includes('wedding');
                    const isGraduationEvent = normalizedEventType.includes('graduation');
                    const isCorporateEvent = normalizedEventType.includes('corporate');
                    const isEngagementEvent = normalizedEventType.includes('engagement');
                    const isFestivalEvent = normalizedEventType.includes('festival');
                    const isPartyEvent = normalizedEventType.includes('party');
                    const isBabyShowerEvent =
                      normalizedEventType.includes('baby shower') ||
                      normalizedEventType.includes('babyshower');

                    return (
                      <article
                        key={event.id}
                        className="events-card-reveal"
                        style={{
                          animationDelay: `${Math.min(eventIndex, 8) * 90}ms`,
                        }}
                      >
                        <Link
                          to={`/events/${event.id}`}
                          className="group relative flex h-full min-h-[18rem] overflow-hidden rounded-[1.75rem] border border-white/72 p-5 shadow-[0_18px_52px_rgba(31,27,29,0.10)] transition duration-300 hover:-translate-y-1 hover:rotate-[0.2deg] hover:border-white hover:shadow-[0_26px_68px_rgba(31,27,29,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45 sm:p-6"
                          style={{
                            background: eventCardStyle.background,
                          }}
                          aria-label={`Open ${event.name} event workspace`}
                        >
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-0 h-1.5 shadow-[0_4px_18px_rgba(93,58,85,0.10)]"
                            style={{
                              background: eventCardStyle.accent,
                            }}
                          />
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 right-0 w-[45%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.30))] opacity-70 transition duration-700 group-hover:w-[52%] group-hover:opacity-100"
                          />

                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-16 -top-14 size-40 rounded-full blur-3xl transition duration-700 group-hover:scale-125 group-hover:opacity-100"
                            style={{
                              backgroundColor: eventCardStyle.glow,
                              opacity:
                                isBirthdayEvent ||
                                isWeddingEvent ||
                                isGraduationEvent ||
                                isCorporateEvent ||
                                isEngagementEvent ||
                                isFestivalEvent ||
                                isPartyEvent ||
                                isBabyShowerEvent
                                  ? 0.38
                                  : 0.72,
                            }}
                          />

                          {isBirthdayEvent ? (
                            <>
                              {/* Birthday — translucent washi tape */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-5 top-7 z-[2] h-11 w-40 rotate-[8deg] border-y border-white/35 bg-[linear-gradient(90deg,rgba(225,196,218,0.18),rgba(216,166,188,0.58),rgba(237,196,178,0.42))] shadow-[0_8px_22px_rgba(93,58,85,0.08)] backdrop-blur-[2px] transition duration-700 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:rotate-[5deg]"
                              >
                                <div className="absolute inset-y-0 left-3 w-px bg-white/38" />
                                <div className="absolute inset-y-0 right-4 w-px bg-white/28" />
                              </div>

                              {/* Birthday — flowing celebration ribbon */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 360 240"
                                className="pointer-events-none absolute -bottom-7 -right-6 z-[2] h-[78%] w-[72%] overflow-visible opacity-75 transition duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:scale-[1.04] group-hover:opacity-100"
                                fill="none"
                              >
                                <path
                                  d="M342 26C276 7 259 76 298 104C332 129 322 181 261 184C191 188 206 112 150 111C84 109 91 194 20 213"
                                  stroke="rgba(124,74,90,0.34)"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M349 46C291 35 278 91 309 116C337 139 317 165 280 166C230 167 231 131 192 132C149 133 140 185 91 193"
                                  stroke="rgba(222,163,178,0.42)"
                                  strokeWidth="9"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M343 28C282 14 260 72 297 101"
                                  stroke="rgba(255,255,255,0.58)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>

                              {/* Birthday — elegant confetti pieces */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[3] opacity-75 transition duration-500 group-hover:opacity-100"
                              >
                                <span className="absolute right-[21%] top-[30%] h-1.5 w-4 rotate-[24deg] rounded-full bg-[rgba(124,74,90,0.42)] transition duration-700 group-hover:-translate-y-2 group-hover:rotate-[42deg]" />

                                <span className="absolute right-[10%] top-[45%] size-2 rotate-12 rounded-[0.15rem] border border-[rgba(93,58,85,0.36)] transition duration-700 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:rotate-45" />

                                <span className="absolute right-[34%] top-[54%] h-3 w-1.5 rotate-[-28deg] rounded-full bg-[rgba(226,173,164,0.48)] transition duration-700 group-hover:-translate-x-1 group-hover:-translate-y-2 group-hover:rotate-[-48deg]" />

                                <span className="absolute bottom-[21%] right-[18%] h-1.5 w-5 rotate-[-14deg] rounded-full bg-[rgba(183,167,200,0.56)] transition duration-700 group-hover:translate-x-2 group-hover:-translate-y-1" />

                                <span className="absolute bottom-[30%] right-[40%] size-2 rotate-45 bg-[rgba(255,255,255,0.72)] shadow-[0_0_12px_rgba(255,255,255,0.82)] transition duration-700 group-hover:scale-125 group-hover:rotate-90" />

                                <span className="absolute right-[44%] top-[28%] text-sm font-black text-[rgba(124,74,90,0.34)] transition duration-700 group-hover:-translate-y-1 group-hover:rotate-12">
                                  ✦
                                </span>

                                <span className="absolute bottom-[13%] right-[9%] text-xs font-black text-[rgba(208,143,157,0.42)] transition duration-700 group-hover:translate-x-1 group-hover:-translate-y-2">
                                  ✦
                                </span>
                              </div>

                              {/* Birthday — folded paper corner */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 right-0 z-[2] size-20 overflow-hidden opacity-80"
                              >
                                <div className="absolute -bottom-8 -right-8 size-20 rotate-45 border border-white/48 bg-[linear-gradient(135deg,rgba(255,255,255,0.66),rgba(221,196,214,0.54))] shadow-[-8px_-8px_22px_rgba(93,58,85,0.07)] transition duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1" />
                              </div>
                            </>
                          ) : null}

                          {isWeddingEvent ? (
                            <>
                              {/* Wedding — veil sweep */}
                              {/* Wedding — translucent vellum sheet */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-8 bottom-5 z-[2] h-[72%] w-[62%] rotate-[-4deg] rounded-[1.4rem] border border-white/50 bg-[linear-gradient(145deg,rgba(255,255,255,0.42),rgba(243,218,226,0.16))] shadow-[-12px_14px_34px_rgba(124,74,90,0.06)] backdrop-blur-[1px] transition duration-700 group-hover:-translate-x-2 group-hover:-translate-y-1 group-hover:rotate-[-2deg]"
                              />

                              {/* Wedding — embossed inner frame */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-[1.05rem] z-[3] rounded-[1.3rem] border border-[rgba(124,74,90,0.10)] opacity-70 transition duration-500 group-hover:border-[rgba(124,74,90,0.18)] group-hover:opacity-100"
                              />

                              {/* Wedding — pressed botanical corner */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 240 280"
                                className="pointer-events-none absolute -bottom-6 -right-3 z-[4] h-[76%] w-44 opacity-65 transition duration-700 group-hover:-translate-x-1 group-hover:-translate-y-2 group-hover:rotate-[-2deg] group-hover:opacity-95"
                                fill="none"
                              >
                                <path
                                  d="M191 270C160 226 143 184 145 141C147 97 163 59 205 18"
                                  stroke="rgba(124,74,90,0.26)"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M154 208C132 194 114 174 102 150"
                                  stroke="rgba(124,74,90,0.20)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M160 145C140 129 126 108 119 84"
                                  stroke="rgba(124,74,90,0.20)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />

                                <ellipse
                                  cx="118"
                                  cy="162"
                                  rx="18"
                                  ry="8"
                                  transform="rotate(-34 118 162)"
                                  fill="rgba(214,177,190,0.30)"
                                />

                                <ellipse
                                  cx="136"
                                  cy="112"
                                  rx="17"
                                  ry="7.5"
                                  transform="rotate(29 136 112)"
                                  fill="rgba(214,177,190,0.26)"
                                />

                                <ellipse
                                  cx="170"
                                  cy="69"
                                  rx="18"
                                  ry="8"
                                  transform="rotate(-27 170 69)"
                                  fill="rgba(238,213,218,0.44)"
                                />

                                <ellipse
                                  cx="169"
                                  cy="216"
                                  rx="18"
                                  ry="8"
                                  transform="rotate(24 169 216)"
                                  fill="rgba(238,213,218,0.36)"
                                />

                                <circle cx="197" cy="39" r="4.5" fill="rgba(255,255,255,0.82)" />
                                <circle cx="157" cy="134" r="3.5" fill="rgba(255,255,255,0.72)" />
                                <circle cx="181" cy="191" r="4" fill="rgba(255,255,255,0.76)" />
                              </svg>

                              {/* Wedding — wax seal */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-7 right-7 z-[5] grid size-14 place-items-center rounded-full border border-[rgba(124,74,90,0.16)] bg-[radial-gradient(circle_at_35%_30%,rgba(248,220,227,0.95),rgba(184,126,145,0.62)_62%,rgba(124,74,90,0.38)_100%)] shadow-[0_10px_24px_rgba(124,74,90,0.16)] transition duration-700 group-hover:-translate-y-1 group-hover:rotate-[-4deg] group-hover:scale-105"
                              >
                                <span className="text-sm font-black text-white/85">✦</span>
                              </div>

                              {/* Wedding — botanical branch */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 220 260"
                                className="pointer-events-none absolute -right-4 top-10 z-[3] h-[72%] w-40 opacity-55 transition duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:rotate-[-2deg] group-hover:opacity-85"
                                fill="none"
                              >
                                <path
                                  d="M184 246C136 205 115 163 118 119C121 77 147 45 190 18"
                                  stroke="rgba(124,74,90,0.28)"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M130 176C111 166 96 151 87 132"
                                  stroke="rgba(124,74,90,0.22)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M145 114C128 99 119 82 117 62"
                                  stroke="rgba(124,74,90,0.22)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />

                                <ellipse
                                  cx="101"
                                  cy="143"
                                  rx="14"
                                  ry="7"
                                  transform="rotate(-35 101 143)"
                                  fill="rgba(212,175,190,0.28)"
                                />

                                <ellipse
                                  cx="126"
                                  cy="93"
                                  rx="13"
                                  ry="6.5"
                                  transform="rotate(32 126 93)"
                                  fill="rgba(212,175,190,0.26)"
                                />

                                <ellipse
                                  cx="154"
                                  cy="54"
                                  rx="14"
                                  ry="7"
                                  transform="rotate(-26 154 54)"
                                  fill="rgba(238,213,218,0.42)"
                                />

                                <ellipse
                                  cx="146"
                                  cy="195"
                                  rx="15"
                                  ry="7"
                                  transform="rotate(26 146 195)"
                                  fill="rgba(238,213,218,0.34)"
                                />
                              </svg>

                              {/* Wedding — pressed petal */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-8 right-[31%] z-[3] h-16 w-11 rotate-[18deg] rounded-[58%_42%_68%_32%/62%_38%_62%_38%] bg-[linear-gradient(145deg,rgba(242,213,218,0.50),rgba(204,160,176,0.16))] blur-[0.2px] transition duration-700 group-hover:-translate-y-2 group-hover:rotate-[11deg]"
                              />

                              {/* Wedding — pearl highlights */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[3] transition duration-500"
                              >
                                <span className="absolute right-[18%] top-[24%] size-2 rounded-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.92)] transition duration-700 group-hover:-translate-y-1 group-hover:scale-125" />

                                <span className="absolute right-[27%] top-[38%] size-1.5 rounded-full bg-white/72 shadow-[0_0_8px_rgba(255,255,255,0.82)] transition duration-700 group-hover:translate-x-1 group-hover:-translate-y-1" />

                                <span className="absolute bottom-[26%] right-[12%] size-2.5 rounded-full border border-white/75 bg-[rgba(255,249,247,0.68)] shadow-[0_0_12px_rgba(255,255,255,0.70)] transition duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1" />

                                <span className="absolute bottom-[16%] right-[43%] size-1.5 rounded-full bg-[rgba(241,215,220,0.82)] transition duration-700 group-hover:-translate-y-2" />
                              </div>
                            </>
                          ) : null}
                          {isGraduationEvent ? (
                            <>
                              {/* Graduation — layered certificate sheets */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-6 right-3 z-[2] h-36 w-52 rotate-[5deg] rounded-[1.15rem] border border-white/42 bg-[linear-gradient(145deg,rgba(255,255,255,0.42),rgba(221,214,177,0.20))] shadow-[0_16px_34px_rgba(113,117,76,0.08)] transition duration-700 group-hover:-translate-x-2 group-hover:-translate-y-1 group-hover:rotate-[8deg]"
                              />

                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-2 right-8 z-[3] h-36 w-52 rotate-[-3deg] rounded-[1.15rem] border border-white/54 bg-[linear-gradient(145deg,rgba(255,255,255,0.64),rgba(238,231,198,0.34))] shadow-[0_18px_42px_rgba(113,117,76,0.10)] backdrop-blur-[1px] transition duration-700 group-hover:-translate-x-1 group-hover:-translate-y-2 group-hover:rotate-[-1deg]"
                              >
                                <div className="absolute left-5 top-5 h-1.5 w-20 rounded-full bg-[rgba(113,117,76,0.18)]" />

                                <div className="absolute left-5 top-9 h-1 w-28 rounded-full bg-[rgba(113,117,76,0.11)]" />

                                <div className="absolute left-5 top-13 h-1 w-24 rounded-full bg-[rgba(113,117,76,0.09)]" />

                                <div className="absolute inset-x-5 bottom-5 border-t border-[rgba(113,117,76,0.12)]" />
                              </div>

                              {/* Graduation — gold foil strip */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-9 top-9 z-[4] h-10 w-44 rotate-[7deg] bg-[linear-gradient(90deg,rgba(255,244,200,0.12),rgba(214,185,105,0.66),rgba(255,235,171,0.36))] shadow-[0_8px_22px_rgba(150,115,57,0.12)] transition duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:rotate-[4deg]"
                              />

                              {/* Graduation — laurel branch */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 220 260"
                                className="pointer-events-none absolute -right-2 top-[20%] z-[5] h-[68%] w-40 opacity-68 transition duration-700 group-hover:-translate-x-1 group-hover:-translate-y-2 group-hover:rotate-[-2deg] group-hover:opacity-100"
                                fill="none"
                              >
                                <path
                                  d="M176 246C137 205 117 162 119 117C121 74 145 41 190 16"
                                  stroke="rgba(113,117,76,0.34)"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />

                                <ellipse
                                  cx="128"
                                  cy="181"
                                  rx="15"
                                  ry="7"
                                  transform="rotate(-33 128 181)"
                                  fill="rgba(181,184,129,0.34)"
                                />

                                <ellipse
                                  cx="119"
                                  cy="139"
                                  rx="15"
                                  ry="7"
                                  transform="rotate(28 119 139)"
                                  fill="rgba(181,184,129,0.30)"
                                />

                                <ellipse
                                  cx="135"
                                  cy="101"
                                  rx="15"
                                  ry="7"
                                  transform="rotate(-28 135 101)"
                                  fill="rgba(214,207,158,0.42)"
                                />

                                <ellipse
                                  cx="160"
                                  cy="61"
                                  rx="16"
                                  ry="7"
                                  transform="rotate(24 160 61)"
                                  fill="rgba(214,207,158,0.38)"
                                />

                                <ellipse
                                  cx="154"
                                  cy="213"
                                  rx="16"
                                  ry="7"
                                  transform="rotate(27 154 213)"
                                  fill="rgba(238,226,181,0.34)"
                                />
                              </svg>

                              {/* Graduation — embossed seal */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-6 right-8 z-[6] grid size-16 place-items-center rounded-full border border-[rgba(150,115,57,0.18)] bg-[radial-gradient(circle_at_35%_30%,rgba(255,241,190,0.96),rgba(204,168,83,0.72)_58%,rgba(132,103,53,0.44)_100%)] shadow-[0_12px_28px_rgba(150,115,57,0.18)] transition duration-700 group-hover:-translate-y-1 group-hover:rotate-[-5deg] group-hover:scale-105"
                              >
                                <span className="text-base font-black text-white/88">✦</span>
                              </div>

                              {/* Graduation — academic ribbon tails */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 right-[4.7rem] z-[5] h-14 w-5 rotate-[5deg] bg-[linear-gradient(180deg,rgba(147,122,63,0.64),rgba(100,83,49,0.28))] transition duration-700 group-hover:-translate-y-1 group-hover:rotate-[2deg]"
                                style={{
                                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
                                }}
                              />

                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 right-[3.3rem] z-[5] h-12 w-5 rotate-[-5deg] bg-[linear-gradient(180deg,rgba(214,185,105,0.74),rgba(140,109,57,0.30))] transition duration-700 group-hover:-translate-y-2 group-hover:rotate-[-2deg]"
                                style={{
                                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
                                }}
                              />

                              {/* Graduation — tiny foil sparkles */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[6] opacity-80 transition duration-500 group-hover:opacity-100"
                              >
                                <span className="absolute right-[18%] top-[24%] text-sm font-black text-[rgba(150,115,57,0.50)] transition duration-700 group-hover:-translate-y-2 group-hover:rotate-12">
                                  ✦
                                </span>

                                <span className="absolute right-[37%] top-[42%] text-[0.62rem] font-black text-white/82 drop-shadow-[0_0_8px_rgba(255,255,255,0.78)] transition duration-700 group-hover:scale-125">
                                  ✦
                                </span>

                                <span className="absolute bottom-[22%] right-[29%] size-1.5 rounded-full bg-[rgba(214,185,105,0.62)] transition duration-700 group-hover:-translate-y-1" />
                              </div>
                            </>
                          ) : null}
                          {isBabyShowerEvent ? (
                            <>
                              {/* Baby Shower — scalloped stationery layer */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-5 right-3 z-[2] h-36 w-52 rotate-[-3deg] rounded-[1.35rem] border border-white/50 bg-[linear-gradient(145deg,rgba(255,255,255,0.56),rgba(235,225,200,0.28))] shadow-[0_16px_38px_rgba(113,117,76,0.08)] backdrop-blur-[1px] transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:rotate-[-1deg]"
                              >
                                <div className="absolute inset-x-0 -top-3 flex justify-center gap-1.5">
                                  {Array.from({ length: 7 }).map((_, scallopIndex) => (
                                    <span
                                      key={scallopIndex}
                                      className="size-6 rounded-full border border-white/46 bg-[rgba(255,251,240,0.72)]"
                                    />
                                  ))}
                                </div>
                              </div>

                              {/* Baby Shower — cloud paper forms */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-7 top-[38%] z-[3] h-24 w-44 opacity-72 transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:opacity-100"
                              >
                                <span className="absolute bottom-0 left-2 h-12 w-36 rounded-full border border-white/52 bg-[rgba(255,252,244,0.64)] shadow-[0_12px_26px_rgba(113,117,76,0.06)]" />

                                <span className="absolute bottom-5 left-7 size-16 rounded-full border border-white/48 bg-[rgba(255,252,244,0.72)]" />

                                <span className="absolute bottom-4 left-[4.7rem] size-20 rounded-full border border-white/48 bg-[rgba(255,252,244,0.68)]" />

                                <span className="absolute bottom-3 right-3 size-14 rounded-full border border-white/48 bg-[rgba(255,252,244,0.62)]" />
                              </div>

                              {/* Baby Shower — crescent moon */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute right-[13%] top-[19%] z-[5] size-20 rounded-full bg-[linear-gradient(145deg,rgba(238,221,173,0.90),rgba(196,174,116,0.52))] shadow-[0_12px_28px_rgba(150,115,57,0.14)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-2 group-hover:rotate-[-6deg] group-hover:scale-105"
                              >
                                <span className="absolute -right-2 -top-1 size-[4.8rem] rounded-full bg-[rgba(250,243,226,0.96)]" />
                              </div>

                              {/* Baby Shower — hanging star threads */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 240 260"
                                className="pointer-events-none absolute -right-1 top-2 z-[4] h-[74%] w-44 overflow-visible opacity-70 transition-all duration-700 group-hover:-translate-y-1 group-hover:opacity-100"
                                fill="none"
                              >
                                <path
                                  d="M74 0V82"
                                  stroke="rgba(150,115,57,0.22)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M132 0V112"
                                  stroke="rgba(150,115,57,0.18)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M186 0V68"
                                  stroke="rgba(150,115,57,0.20)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M74 82L78 91L88 92L80 98L82 108L74 103L65 108L68 98L60 92L70 91Z"
                                  fill="rgba(214,185,105,0.52)"
                                />

                                <path
                                  d="M132 112L136 121L146 122L138 128L140 138L132 133L123 138L126 128L118 122L128 121Z"
                                  fill="rgba(183,167,200,0.42)"
                                />

                                <path
                                  d="M186 68L190 77L200 78L192 84L194 94L186 89L177 94L180 84L172 78L182 77Z"
                                  fill="rgba(214,185,105,0.46)"
                                />
                              </svg>

                              {/* Baby Shower — tiny dreamy sparkles */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[6] opacity-78 transition-opacity duration-500 group-hover:opacity-100"
                              >
                                <span className="absolute right-[34%] top-[24%] text-sm font-black text-[rgba(150,115,57,0.46)] transition-all duration-700 group-hover:-translate-y-2 group-hover:rotate-12">
                                  ✦
                                </span>

                                <span className="absolute right-[12%] top-[47%] text-xs font-black text-white/88 drop-shadow-[0_0_9px_rgba(255,255,255,0.86)] transition-all duration-700 group-hover:scale-125">
                                  ✦
                                </span>

                                <span className="absolute bottom-[25%] right-[38%] size-1.5 rounded-full bg-[rgba(183,167,200,0.52)] transition-all duration-700 group-hover:-translate-y-1" />

                                <span className="absolute bottom-[18%] right-[15%] size-2 rounded-full bg-[rgba(214,185,105,0.48)] shadow-[0_0_10px_rgba(214,185,105,0.34)] transition-all duration-700 group-hover:-translate-y-2 group-hover:scale-110" />
                              </div>

                              {/* Baby Shower — soft folded paper corner */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 right-0 z-[4] size-20 overflow-hidden opacity-80"
                              >
                                <div className="absolute -bottom-9 -right-9 size-24 rotate-45 border border-white/42 bg-[linear-gradient(135deg,rgba(255,249,224,0.82),rgba(203,205,166,0.42))] shadow-[-8px_-8px_22px_rgba(113,117,76,0.08)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1" />
                              </div>
                            </>
                          ) : null}
                          {isCorporateEvent ? (
                            <>
                              {/* Corporate — blueprint grid */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[2] opacity-40 transition-opacity duration-500 group-hover:opacity-65"
                                style={{
                                  backgroundImage: `
          linear-gradient(rgba(88,67,61,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(88,67,61,0.08) 1px, transparent 1px)
        `,
                                  backgroundSize: '28px 28px',
                                  maskImage:
                                    'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 40%, black 70%, black 100%)',
                                  WebkitMaskImage:
                                    'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 40%, black 70%, black 100%)',
                                }}
                              />

                              {/* Corporate — architectural guide lines */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute right-7 top-8 z-[3] h-[58%] w-[46%] opacity-55 transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:opacity-85"
                              >
                                <span className="absolute left-0 top-0 h-px w-full bg-[rgba(88,67,61,0.24)]" />

                                <span className="absolute left-0 top-[36%] h-px w-[82%] bg-[rgba(88,67,61,0.18)]" />

                                <span className="absolute left-[22%] top-0 h-full w-px bg-[rgba(88,67,61,0.18)]" />

                                <span className="absolute right-[16%] top-[14%] h-[74%] w-px bg-[rgba(88,67,61,0.16)]" />

                                <span className="absolute left-[22%] top-[36%] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(88,67,61,0.28)] bg-white/50" />

                                <span className="absolute right-[16%] top-[14%] size-2 translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(88,67,61,0.26)] bg-white/46" />
                              </div>

                              {/* Corporate — bronze drafting strip */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-8 top-9 z-[4] h-8 w-48 rotate-[6deg] bg-[linear-gradient(90deg,rgba(188,165,148,0.12),rgba(157,126,108,0.66),rgba(88,67,61,0.24))] shadow-[0_8px_20px_rgba(88,67,61,0.10)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:rotate-[3deg]"
                              />

                              {/* Corporate — floating information panel */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-4 right-5 z-[5] h-32 w-48 rotate-[-3deg] rounded-[1.05rem] border border-white/46 bg-[linear-gradient(145deg,rgba(255,255,255,0.42),rgba(188,165,148,0.14))] shadow-[0_18px_42px_rgba(88,67,61,0.10)] backdrop-blur-[2px] transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:rotate-[-1deg]"
                              >
                                <div className="absolute left-4 top-4 h-1.5 w-20 rounded-full bg-[rgba(88,67,61,0.20)]" />

                                <div className="absolute left-4 top-8 h-1 w-28 rounded-full bg-[rgba(88,67,61,0.12)]" />

                                <div className="absolute left-4 top-12 h-1 w-24 rounded-full bg-[rgba(88,67,61,0.10)]" />

                                <div className="absolute inset-x-4 bottom-8 grid grid-cols-3 gap-2">
                                  <span className="h-5 rounded-md border border-[rgba(88,67,61,0.12)] bg-white/26" />
                                  <span className="h-5 rounded-md border border-[rgba(88,67,61,0.12)] bg-white/22" />
                                  <span className="h-5 rounded-md border border-[rgba(88,67,61,0.12)] bg-white/18" />
                                </div>

                                <span className="absolute bottom-3 right-4 text-[0.52rem] font-black uppercase tracking-[0.18em] text-[rgba(88,67,61,0.34)]">
                                  Brief
                                </span>
                              </div>

                              {/* Corporate — measurement ticks */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-7 right-[15.5rem] z-[4] flex h-4 items-end gap-1 opacity-65 transition-all duration-700 group-hover:-translate-y-1 group-hover:opacity-90"
                              >
                                {Array.from({ length: 9 }).map((_, tickIndex) => (
                                  <span
                                    key={tickIndex}
                                    className={`w-px bg-[rgba(88,67,61,0.34)] ${
                                      tickIndex % 3 === 0
                                        ? 'h-4'
                                        : tickIndex % 2 === 0
                                          ? 'h-3'
                                          : 'h-2'
                                    }`}
                                  />
                                ))}
                              </div>

                              {/* Corporate — drafting angle */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 180 180"
                                className="pointer-events-none absolute -bottom-3 -right-1 z-[3] size-36 opacity-45 transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:opacity-70"
                                fill="none"
                              >
                                <path
                                  d="M18 162L162 18"
                                  stroke="rgba(88,67,61,0.28)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M70 162L162 70"
                                  stroke="rgba(88,67,61,0.18)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M18 162H70"
                                  stroke="rgba(88,67,61,0.22)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M162 18V70"
                                  stroke="rgba(88,67,61,0.22)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>

                              {/* Corporate — folded blueprint corner */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 right-0 z-[6] size-20 overflow-hidden opacity-78"
                              >
                                <div className="absolute -bottom-9 -right-9 size-24 rotate-45 border border-white/36 bg-[linear-gradient(135deg,rgba(227,216,207,0.76),rgba(120,96,84,0.34))] shadow-[-8px_-8px_22px_rgba(88,67,61,0.09)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1" />
                              </div>
                            </>
                          ) : null}
                          {isEngagementEvent ? (
                            <>
                              {/* Engagement — champagne silk sweep */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 420 250"
                                className="pointer-events-none absolute -bottom-10 -right-8 z-[2] h-[80%] w-[78%] overflow-visible opacity-70 transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:scale-[1.035] group-hover:opacity-100"
                                fill="none"
                              >
                                <path
                                  d="M411 42C337 18 313 70 337 112C361 154 334 205 267 201C199 197 191 135 130 140C80 144 52 181 13 217"
                                  stroke="rgba(255,248,231,0.72)"
                                  strokeWidth="20"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M411 42C337 18 313 70 337 112C361 154 334 205 267 201C199 197 191 135 130 140C80 144 52 181 13 217"
                                  stroke="rgba(205,178,115,0.26)"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M394 66C342 49 327 89 347 119C366 147 346 174 304 175"
                                  stroke="rgba(255,255,255,0.58)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>

                              {/* Engagement — interlocking rings */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute right-[8%] top-[18%] z-[5] h-32 w-44 transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-2 group-hover:rotate-[-2deg]"
                              >
                                <span className="absolute left-3 top-5 size-24 rounded-full border-[5px] border-[rgba(197,165,95,0.62)] shadow-[0_8px_20px_rgba(150,115,57,0.14),inset_0_0_10px_rgba(255,255,255,0.42)]" />

                                <span className="absolute right-2 top-8 size-24 rounded-full border-[5px] border-[rgba(224,201,145,0.74)] shadow-[0_8px_22px_rgba(150,115,57,0.16),inset_0_0_10px_rgba(255,255,255,0.50)]" />

                                <span className="absolute right-[2.9rem] top-3 size-5 rotate-45 border border-white/72 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(222,210,183,0.72))] shadow-[0_0_16px_rgba(255,255,255,0.82)] transition-all duration-700 group-hover:-translate-y-1 group-hover:scale-110 group-hover:rotate-90" />
                              </div>

                              {/* Engagement — floating proposal card */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-3 right-8 z-[4] h-28 w-44 rotate-[-4deg] rounded-[1.1rem] border border-white/52 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(235,218,182,0.20))] shadow-[0_18px_42px_rgba(150,115,57,0.10)] backdrop-blur-[2px] transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:rotate-[-1deg]"
                              >
                                <div className="absolute left-4 top-4 h-1.5 w-20 rounded-full bg-[rgba(150,115,57,0.18)]" />

                                <div className="absolute left-4 top-8 h-1 w-28 rounded-full bg-[rgba(150,115,57,0.10)]" />

                                <div className="absolute left-4 top-12 h-1 w-24 rounded-full bg-[rgba(150,115,57,0.08)]" />

                                <span className="absolute bottom-4 right-4 text-[0.56rem] font-black uppercase tracking-[0.17em] text-[rgba(150,115,57,0.38)]">
                                  A promise
                                </span>
                              </div>

                              {/* Engagement — pearl highlights */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[6] opacity-82 transition-opacity duration-500 group-hover:opacity-100"
                              >
                                <span className="absolute right-[17%] top-[25%] size-2.5 rounded-full bg-white/88 shadow-[0_0_12px_rgba(255,255,255,0.90)] transition-all duration-700 group-hover:-translate-y-2 group-hover:scale-125" />

                                <span className="absolute right-[34%] top-[39%] size-2 rounded-full border border-white/76 bg-[rgba(255,250,239,0.72)] shadow-[0_0_10px_rgba(255,255,255,0.76)] transition-all duration-700 group-hover:translate-x-1 group-hover:-translate-y-1" />

                                <span className="absolute bottom-[27%] right-[12%] size-3 rounded-full bg-[rgba(244,227,190,0.72)] shadow-[0_0_12px_rgba(244,227,190,0.54)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-2" />

                                <span className="absolute bottom-[18%] right-[39%] size-1.5 rounded-full bg-white/78 transition-all duration-700 group-hover:-translate-y-1" />
                              </div>

                              {/* Engagement — restrained diamond sparkles */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[7]"
                              >
                                <span className="absolute right-[15%] top-[17%] text-base font-black text-[rgba(150,115,57,0.54)] drop-shadow-[0_0_8px_rgba(255,238,192,0.58)] transition-all duration-700 group-hover:-translate-y-2 group-hover:rotate-12">
                                  ✦
                                </span>

                                <span className="absolute right-[43%] top-[34%] text-[0.65rem] font-black text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.86)] transition-all duration-700 group-hover:scale-125 group-hover:rotate-45">
                                  ✦
                                </span>

                                <span className="absolute bottom-[24%] right-[19%] text-xs font-black text-[rgba(205,178,115,0.56)] transition-all duration-700 group-hover:-translate-y-2 group-hover:-rotate-12">
                                  ✦
                                </span>
                              </div>

                              {/* Engagement — champagne folded corner */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 right-0 z-[5] size-20 overflow-hidden opacity-82"
                              >
                                <div className="absolute -bottom-9 -right-9 size-24 rotate-45 border border-white/40 bg-[linear-gradient(135deg,rgba(255,245,218,0.84),rgba(188,151,86,0.36))] shadow-[-8px_-8px_24px_rgba(150,115,57,0.09)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1" />
                              </div>
                            </>
                          ) : null}
                          {isFestivalEvent ? (
                            <>
                              {/* Festival — layered decorative arches */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-20 -right-16 z-[2] size-64 rounded-t-full border-[18px] border-b-0 border-[rgba(176,105,78,0.14)] transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:scale-105"
                              />

                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-14 -right-10 z-[3] size-52 rounded-t-full border-[11px] border-b-0 border-[rgba(211,165,95,0.20)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1"
                              />

                              {/* Festival — hanging ornament threads */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 360 230"
                                className="pointer-events-none absolute -right-5 top-0 z-[4] h-[62%] w-[68%] overflow-visible opacity-82 transition-all duration-700 group-hover:-translate-y-2 group-hover:opacity-100"
                                fill="none"
                              >
                                <path
                                  d="M28 0V74"
                                  stroke="rgba(124,74,90,0.24)"
                                  strokeWidth="1.5"
                                />

                                <path
                                  d="M118 0V103"
                                  stroke="rgba(150,115,57,0.22)"
                                  strokeWidth="1.5"
                                />

                                <path
                                  d="M211 0V67"
                                  stroke="rgba(124,74,90,0.22)"
                                  strokeWidth="1.5"
                                />

                                <path
                                  d="M302 0V91"
                                  stroke="rgba(150,115,57,0.22)"
                                  strokeWidth="1.5"
                                />

                                <path
                                  d="M28 74C14 85 14 109 28 122C42 109 42 85 28 74Z"
                                  fill="rgba(173,103,86,0.52)"
                                />

                                <path
                                  d="M118 103C100 116 100 144 118 160C136 144 136 116 118 103Z"
                                  fill="rgba(213,165,95,0.58)"
                                />

                                <path
                                  d="M211 67C196 80 196 105 211 119C226 105 226 80 211 67Z"
                                  fill="rgba(153,88,111,0.48)"
                                />

                                <path
                                  d="M302 91C286 105 286 131 302 146C318 131 318 105 302 91Z"
                                  fill="rgba(221,176,104,0.54)"
                                />
                              </svg>

                              {/* Festival — glowing light strand */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 420 130"
                                className="pointer-events-none absolute -right-4 top-[27%] z-[5] h-28 w-[72%] overflow-visible opacity-86 transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-1 group-hover:opacity-100"
                                fill="none"
                              >
                                <path
                                  d="M8 39C82 88 143 15 210 58C274 99 339 29 412 66"
                                  stroke="rgba(124,74,90,0.30)"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                />

                                {[
                                  [38, 54],
                                  [104, 48],
                                  [171, 49],
                                  [239, 67],
                                  [305, 55],
                                  [372, 59],
                                ].map(([cx, cy], lightIndex) => (
                                  <g key={lightIndex}>
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r="7"
                                      fill={
                                        lightIndex % 2 === 0
                                          ? 'rgba(236,187,104,0.72)'
                                          : 'rgba(183,111,102,0.64)'
                                      }
                                    />
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r="15"
                                      fill={
                                        lightIndex % 2 === 0
                                          ? 'rgba(236,187,104,0.12)'
                                          : 'rgba(183,111,102,0.10)'
                                      }
                                    />
                                  </g>
                                ))}
                              </svg>

                              {/* Festival — translucent celebration panel */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-5 right-5 z-[4] h-28 w-44 rotate-[-5deg] rounded-[1.1rem] border border-white/48 bg-[linear-gradient(145deg,rgba(255,255,255,0.46),rgba(215,161,112,0.20))] shadow-[0_18px_42px_rgba(124,74,90,0.10)] backdrop-blur-[2px] transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:rotate-[-2deg]"
                              >
                                <div className="absolute left-4 top-4 h-1.5 w-20 rounded-full bg-[rgba(124,74,90,0.20)]" />

                                <div className="absolute left-4 top-8 h-1 w-28 rounded-full bg-[rgba(124,74,90,0.11)]" />

                                <div className="absolute left-4 top-12 h-1 w-24 rounded-full bg-[rgba(124,74,90,0.09)]" />

                                <span className="absolute bottom-4 right-4 text-[0.56rem] font-black uppercase tracking-[0.17em] text-[rgba(124,74,90,0.38)]">
                                  Celebrate
                                </span>
                              </div>

                              {/* Festival — metallic dust */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[6] opacity-82 transition-opacity duration-500 group-hover:opacity-100"
                              >
                                <span className="absolute right-[16%] top-[19%] size-2 rounded-full bg-[rgba(236,187,104,0.72)] shadow-[0_0_14px_rgba(236,187,104,0.58)] transition-all duration-700 group-hover:-translate-y-2 group-hover:scale-125" />

                                <span className="absolute right-[32%] top-[34%] text-sm font-black text-[rgba(150,115,57,0.58)] transition-all duration-700 group-hover:-translate-y-2 group-hover:rotate-12">
                                  ✦
                                </span>

                                <span className="absolute bottom-[25%] right-[12%] text-base font-black text-[rgba(153,88,111,0.54)] transition-all duration-700 group-hover:-translate-y-2 group-hover:-rotate-12">
                                  ✦
                                </span>

                                <span className="absolute bottom-[18%] right-[38%] size-1.5 rounded-full bg-[rgba(255,239,198,0.82)] shadow-[0_0_10px_rgba(255,239,198,0.74)] transition-all duration-700 group-hover:-translate-y-1" />

                                <span className="absolute right-[43%] top-[22%] h-1.5 w-4 rotate-[24deg] rounded-full bg-[rgba(173,103,86,0.44)] transition-all duration-700 group-hover:-translate-y-2 group-hover:rotate-45" />
                              </div>

                              {/* Festival — metallic folded corner */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 right-0 z-[5] size-20 overflow-hidden opacity-84"
                              >
                                <div className="absolute -bottom-9 -right-9 size-24 rotate-45 border border-white/40 bg-[linear-gradient(135deg,rgba(255,236,190,0.84),rgba(154,88,89,0.42))] shadow-[-8px_-8px_24px_rgba(124,74,90,0.10)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1" />
                              </div>
                            </>
                          ) : null}
                          {isPartyEvent ? (
                            <>
                              {/* Party — diagonal evening spotlight */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-20 -top-24 z-[2] h-[150%] w-[72%] rotate-[15deg] bg-[linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.04)_26%,rgba(241,179,155,0.24)_48%,rgba(158,89,119,0.20)_66%,transparent_100%)] blur-lg transition-all duration-700 group-hover:-translate-x-4 group-hover:rotate-[10deg]"
                              />

                              {/* Party — glowing light trails */}
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 420 250"
                                className="pointer-events-none absolute -bottom-10 -right-7 z-[3] h-[78%] w-[78%] overflow-visible opacity-80 transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:scale-[1.04] group-hover:opacity-100"
                                fill="none"
                              >
                                <path
                                  d="M412 31C338 12 332 77 365 102C396 125 378 173 327 177C265 181 262 124 210 130C150 136 166 201 89 215C58 220 31 218 9 211"
                                  stroke="rgba(124,74,90,0.42)"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M406 54C351 44 346 91 372 111C395 129 377 155 342 157C299 160 297 133 261 136C218 139 212 178 169 185"
                                  stroke="rgba(226,150,128,0.52)"
                                  strokeWidth="8"
                                  strokeLinecap="round"
                                />

                                <path
                                  d="M406 32C349 20 337 72 364 98"
                                  stroke="rgba(255,255,255,0.72)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>

                              {/* Party — glass ticket card */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-4 right-7 z-[4] h-28 w-44 rotate-[-7deg] rounded-[1.05rem] border border-white/42 bg-[linear-gradient(135deg,rgba(255,255,255,0.30),rgba(194,121,144,0.20))] shadow-[0_18px_42px_rgba(93,58,85,0.12)] backdrop-blur-[2px] transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:rotate-[-3deg]"
                              >
                                <div className="absolute inset-y-3 left-[34%] border-l border-dashed border-[rgba(124,74,90,0.22)]" />

                                <div className="absolute left-4 top-4 h-1.5 w-14 rounded-full bg-[rgba(124,74,90,0.22)]" />

                                <div className="absolute left-4 top-8 h-1 w-9 rounded-full bg-[rgba(124,74,90,0.14)]" />

                                <div className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-white/40 bg-white/18 text-[0.62rem] font-black text-[rgba(124,74,90,0.48)]">
                                  E
                                </div>

                                <span className="absolute bottom-4 right-4 text-[0.56rem] font-black uppercase tracking-[0.17em] text-[rgba(124,74,90,0.38)]">
                                  Admit one
                                </span>
                              </div>

                              {/* Party — warm bokeh lights */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[3] opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                              >
                                <span className="absolute right-[11%] top-[18%] size-8 rounded-full bg-[rgba(255,205,155,0.26)] blur-sm shadow-[0_0_24px_rgba(255,205,155,0.34)] transition-all duration-700 group-hover:-translate-y-2 group-hover:scale-110" />

                                <span className="absolute right-[31%] top-[28%] size-4 rounded-full bg-[rgba(213,138,166,0.30)] blur-[1px] shadow-[0_0_18px_rgba(213,138,166,0.36)] transition-all duration-700 group-hover:translate-x-1 group-hover:-translate-y-1" />

                                <span className="absolute bottom-[28%] right-[17%] size-6 rounded-full bg-[rgba(255,229,181,0.30)] blur-[2px] shadow-[0_0_20px_rgba(255,229,181,0.38)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-2" />

                                <span className="absolute bottom-[19%] right-[42%] size-3 rounded-full bg-[rgba(176,105,143,0.34)] blur-[1px] transition-all duration-700 group-hover:scale-125" />
                              </div>

                              {/* Party — metallic starbursts */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-[5]"
                              >
                                <span className="absolute right-[19%] top-[24%] text-lg font-black text-[rgba(146,94,69,0.54)] drop-shadow-[0_0_8px_rgba(255,220,180,0.52)] transition-all duration-700 group-hover:-translate-y-2 group-hover:rotate-12 group-hover:scale-110">
                                  ✦
                                </span>

                                <span className="absolute right-[40%] top-[38%] text-xs font-black text-white/85 drop-shadow-[0_0_10px_rgba(255,255,255,0.88)] transition-all duration-700 group-hover:scale-125 group-hover:rotate-45">
                                  ✦
                                </span>

                                <span className="absolute bottom-[24%] right-[10%] text-sm font-black text-[rgba(204,132,132,0.52)] transition-all duration-700 group-hover:-translate-y-2 group-hover:-rotate-12">
                                  ✦
                                </span>
                              </div>

                              {/* Party — metallic folded corner */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute bottom-0 right-0 z-[4] size-20 overflow-hidden opacity-85"
                              >
                                <div className="absolute -bottom-9 -right-9 size-24 rotate-45 bg-[linear-gradient(135deg,rgba(255,236,205,0.82),rgba(181,111,126,0.44))] shadow-[-8px_-8px_24px_rgba(124,74,90,0.10)] transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1" />
                              </div>
                            </>
                          ) : null}
                          <div className="relative z-10 flex w-full flex-col">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p
                                  className="text-xs font-black uppercase tracking-[0.22em]"
                                  style={{
                                    color: eventCardStyle.typeColor,
                                  }}
                                >
                                  {event.eventType}
                                </p>

                                <h3 className="mt-2 line-clamp-2 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                                  {event.name}
                                </h3>
                              </div>

                              <span
                                className="status-chip shrink-0 px-3 py-1.5 text-[0.68rem]"
                                data-tone={getStatusTone(event.status)}
                              >
                                {event.status.replaceAll('_', ' ')}
                              </span>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-2 rounded-full border border-white/72 bg-white/52 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/72">
                                <CalendarDays
                                  aria-hidden="true"
                                  className="size-3.5 text-[var(--color-deep-plum)]"
                                />
                                {new Intl.DateTimeFormat('en-LK', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }).format(new Date(event.eventDate))}
                              </span>

                              <span className="inline-flex items-center gap-2 rounded-full border border-white/72 bg-white/52 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/72">
                                <MapPin
                                  aria-hidden="true"
                                  className="size-3.5 text-[var(--color-deep-plum)]"
                                />
                                <span className="max-w-32 truncate">{event.location}</span>
                              </span>

                              <span className="inline-flex items-center gap-2 rounded-full border border-white/72 bg-white/52 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/72">
                                <UsersRound
                                  aria-hidden="true"
                                  className="size-3.5 text-[var(--color-deep-plum)]"
                                />
                                {event.guestCount
                                  ? `${event.guestCount.toLocaleString('en-LK')} guests`
                                  : 'Guests not set'}
                              </span>
                            </div>

                            <div className="mt-5 border-t border-white/65 pt-4">
                              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <div>
                                  <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                                    Theme
                                  </p>

                                  <p className="mt-1 line-clamp-1 text-sm font-black text-[var(--color-deep-plum)]">
                                    {event.theme ?? 'Not set'}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                                    Planned budget
                                  </p>

                                  <p className="mt-1 line-clamp-1 text-sm font-black text-[var(--color-near-black)]">
                                    {formatCurrency(event.plannedBudget)}
                                  </p>
                                </div>
                              </div>

                              {event.requirements ? (
                                <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--color-charcoal)]/58">
                                  {event.requirements}
                                </p>
                              ) : (
                                <p className="mt-4 text-sm leading-6 text-[var(--color-charcoal)]/42">
                                  Open the workspace to continue building this event plan.
                                </p>
                              )}
                            </div>

                            <div className="mt-auto pt-5">
                              <div className="flex items-center justify-between border-t border-white/65 pt-4">
                                <div>
                                  <p className="text-sm font-black text-[var(--color-near-black)] transition group-hover:text-[var(--color-deep-plum)]">
                                    Open workspace
                                  </p>

                                  <p className="mt-1 text-xs text-[var(--color-charcoal)]/48">
                                    Continue planning
                                  </p>
                                </div>

                                <span className="grid size-10 place-items-center rounded-full bg-[var(--color-deep-plum)] text-white shadow-[0_10px_24px_rgba(93,58,85,0.22)] transition duration-300 group-hover:translate-x-1 group-hover:shadow-[0_14px_30px_rgba(93,58,85,0.30)]">
                                  <ArrowRight aria-hidden="true" className="size-4" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </section>
        </main>
      </div>

      {isCreateFormOpen ? (
        <div
          className="events-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.46)] px-4 py-6 backdrop-blur-md sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateForm();
            }
          }}
        >
          <style>
            {`
    @keyframes eventPreviewSwap {
      0% {
        opacity: 0;
        transform: translateY(10px) scale(0.985);
        filter: saturate(0.88);
      }

      55% {
        opacity: 1;
      }

      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: saturate(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .event-preview-swap {
        animation: none !important;
      }
    }
  `}
          </style>
          <div className="events-modal-panel mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-[2.25rem] border border-white/62 bg-[rgba(251,247,243,0.94)] shadow-[0_34px_110px_rgba(31,27,29,0.24)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-5 border-b border-white/65 px-6 py-6 sm:px-8">
                <div>
                  <div className="soft-chip mb-4 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Sparkles aria-hidden="true" className="size-4" />
                    New event
                  </div>

                  <h2
                    id="create-event-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    Create your event workspace.
                  </h2>

                  <p className="mt-3 max-w-2xl leading-7 text-[var(--color-charcoal)]/64">
                    Add the essential details and see your Eventure workspace take shape before it
                    is created.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/60 bg-white/44 text-[var(--color-charcoal)] shadow-[0_10px_26px_rgba(31,27,29,0.07)] transition hover:-translate-y-0.5 hover:bg-white/72 hover:text-[var(--color-deep-plum)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/45"
                  aria-label="Close create event form"
                  disabled={createEventMutation.isPending}
                  onClick={closeCreateForm}
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>

              <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                <form
                  className="grid gap-7 p-6 sm:p-8 lg:border-r lg:border-white/65"
                  noValidate
                  onSubmit={onSubmit}
                >
                  <section>
                    <div className="mb-5 flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                        <CalendarCheck2 aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Event basics
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/50">
                          Name the event and choose its identity.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                          Event name
                        </span>

                        <input
                          className="form-field"
                          placeholder="Sophia's birthday celebration"
                          type="text"
                          autoComplete="off"
                          disabled={createEventMutation.isPending}
                          aria-invalid={Boolean(form.formState.errors.name)}
                          aria-describedby={
                            form.formState.errors.name ? 'create-event-name-error' : undefined
                          }
                          {...form.register('name')}
                        />

                        {form.formState.errors.name ? (
                          <span
                            id="create-event-name-error"
                            className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
                          >
                            {form.formState.errors.name.message}
                          </span>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                          Event type
                        </span>

                        <select
                          className="form-field"
                          disabled={createEventMutation.isPending}
                          aria-invalid={Boolean(form.formState.errors.eventType)}
                          aria-describedby={
                            form.formState.errors.eventType ? 'create-event-type-error' : undefined
                          }
                          {...form.register('eventType')}
                        >
                          <option value="" disabled>
                            Choose an event type
                          </option>

                          {eventTypeOptions.map((eventType) => (
                            <option key={eventType} value={eventType}>
                              {eventType}
                            </option>
                          ))}
                        </select>

                        {form.formState.errors.eventType ? (
                          <span
                            id="create-event-type-error"
                            className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
                          >
                            {form.formState.errors.eventType.message}
                          </span>
                        ) : null}
                      </label>
                    </div>
                  </section>

                  {previewEventType ? (
                    <InvitationTemplateSelector
                      eventType={previewEventType}
                      value={
                        selectedInvitationTemplate
                          ? (selectedInvitationTemplate as EventInvitationTemplate)
                          : null
                      }
                      disabled={createEventMutation.isPending}
                      onChange={(template) => {
                        form.setValue('invitationTemplate', template, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                    />
                  ) : (
                    <section className="border-t border-white/65 pt-7">
                      <div className="rounded-[1.4rem] border border-dashed border-[rgba(93,58,85,0.20)] bg-white/26 p-5">
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Invitation design
                        </p>

                        <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/56">
                          Choose an event type first to view its available invitation designs.
                        </p>
                      </div>
                    </section>
                  )}

                  {form.formState.errors.invitationTemplate ? (
                    <p className="-mt-4 text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {form.formState.errors.invitationTemplate.message}
                    </p>
                  ) : null}

                  <section className="border-t border-white/65 pt-7">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-[rgba(175,201,216,0.20)] text-[var(--color-deep-plum)]">
                        <MapPin aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Schedule and scale
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/50">
                          Set when, where and how large the event will be.
                        </p>
                      </div>
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
                          aria-invalid={Boolean(form.formState.errors.eventDate)}
                          aria-describedby={
                            form.formState.errors.eventDate ? 'create-event-date-error' : undefined
                          }
                          {...form.register('eventDate')}
                        />

                        {form.formState.errors.eventDate ? (
                          <span
                            id="create-event-date-error"
                            className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
                          >
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
                          autoComplete="off"
                          disabled={createEventMutation.isPending}
                          aria-invalid={Boolean(form.formState.errors.location)}
                          aria-describedby={
                            form.formState.errors.location
                              ? 'create-event-location-error'
                              : undefined
                          }
                          {...form.register('location')}
                        />

                        {form.formState.errors.location ? (
                          <span
                            id="create-event-location-error"
                            className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
                          >
                            {form.formState.errors.location.message}
                          </span>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                          Estimated guests
                        </span>

                        <input
                          className="form-field"
                          placeholder="150"
                          type="number"
                          min="1"
                          max="1000000"
                          step="1"
                          inputMode="numeric"
                          disabled={createEventMutation.isPending}
                          aria-invalid={Boolean(form.formState.errors.guestCount)}
                          aria-describedby={
                            form.formState.errors.guestCount
                              ? 'create-event-guest-count-error'
                              : undefined
                          }
                          {...form.register('guestCount')}
                        />

                        {form.formState.errors.guestCount ? (
                          <span
                            id="create-event-guest-count-error"
                            className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
                          >
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
                          max="9999999999.99"
                          step="0.01"
                          inputMode="decimal"
                          disabled={createEventMutation.isPending}
                          aria-invalid={Boolean(form.formState.errors.plannedBudget)}
                          aria-describedby={
                            form.formState.errors.plannedBudget
                              ? 'create-event-budget-error'
                              : undefined
                          }
                          {...form.register('plannedBudget')}
                        />

                        {form.formState.errors.plannedBudget ? (
                          <span
                            id="create-event-budget-error"
                            className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
                          >
                            {form.formState.errors.plannedBudget.message}
                          </span>
                        ) : null}
                      </label>
                    </div>
                  </section>

                  <section className="border-t border-white/65 pt-7">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-[rgba(142,92,103,0.14)] text-[var(--color-rosewood)]">
                        <Sparkles aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Style and requirements
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/50">
                          Describe the atmosphere and important planning needs.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-5">
                      <label className="block">
                        <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                          Theme
                        </span>

                        <input
                          className="form-field"
                          placeholder="Modern ivory and plum"
                          type="text"
                          autoComplete="off"
                          disabled={createEventMutation.isPending}
                          aria-invalid={Boolean(form.formState.errors.theme)}
                          aria-describedby={
                            form.formState.errors.theme ? 'create-event-theme-error' : undefined
                          }
                          {...form.register('theme')}
                        />

                        {form.formState.errors.theme ? (
                          <span
                            id="create-event-theme-error"
                            className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
                          >
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
                          aria-invalid={Boolean(form.formState.errors.requirements)}
                          aria-describedby={
                            form.formState.errors.requirements
                              ? 'create-event-requirements-error'
                              : undefined
                          }
                          {...form.register('requirements')}
                        />

                        {form.formState.errors.requirements ? (
                          <span
                            id="create-event-requirements-error"
                            className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]"
                          >
                            {form.formState.errors.requirements.message}
                          </span>
                        ) : null}
                      </label>
                    </div>
                  </section>

                  {createEventMutation.isError ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                    >
                      {getApiErrorMessage(createEventMutation.error)}
                    </div>
                  ) : null}

                  <div className="flex flex-col-reverse gap-3 border-t border-white/65 pt-6 sm:flex-row sm:justify-end">
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
                        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                      ) : (
                        <Plus aria-hidden="true" className="size-4" />
                      )}

                      {createEventMutation.isPending ? 'Creating event...' : 'Create event'}
                    </button>
                  </div>
                </form>

                <aside className="relative overflow-hidden bg-[linear-gradient(145deg,rgba(245,237,233,0.86),rgba(235,222,228,0.82))] p-6 sm:p-8">
                  <div
                    aria-hidden="true"
                    className="absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl"
                  />

                  <div
                    aria-hidden="true"
                    className="absolute -bottom-28 -left-24 size-80 rounded-full bg-[rgba(220,186,170,0.20)] blur-3xl"
                  />

                  <div className="relative lg:sticky lg:top-8">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                          Live preview
                        </p>

                        <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                          Your event is taking shape.
                        </h3>
                      </div>

                      <span className="rounded-full border border-white/58 bg-white/38 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                        Draft
                      </span>
                    </div>

                    <div
                      key={selectedPreviewType}
                      className="event-preview-swap group relative mt-7 min-h-[24rem] origin-center overflow-hidden rounded-[2rem] border border-white/72 p-6 shadow-[0_26px_80px_rgba(31,27,29,0.16)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(31,27,29,0.20)] sm:p-7"
                      style={{
                        background: selectedPreviewTheme.background,
                        animation: 'eventPreviewSwap 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
                      }}
                    >
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-1.5"
                        style={{
                          background: selectedPreviewTheme.accent,
                        }}
                      />

                      <div
                        aria-hidden="true"
                        className="absolute -right-16 -top-16 size-52 rounded-full bg-white/34 blur-3xl transition duration-700 group-hover:scale-125"
                      />

                      {selectedPreviewTheme.decoration === 'birthday' ? (
                        <>
                          <div className="pointer-events-none absolute -right-5 top-10 h-10 w-44 rotate-[8deg] border-y border-white/38 bg-[linear-gradient(90deg,rgba(225,196,218,0.18),rgba(216,166,188,0.58),rgba(237,196,178,0.42))]" />

                          <svg
                            aria-hidden="true"
                            viewBox="0 0 300 180"
                            className="pointer-events-none absolute -bottom-4 -right-4 h-44 w-[72%] opacity-70"
                            fill="none"
                          >
                            <path
                              d="M292 24C235 7 221 61 251 83C280 105 267 143 219 145C167 148 175 91 130 91C77 91 81 153 18 163"
                              stroke="rgba(124,74,90,0.34)"
                              strokeWidth="5"
                              strokeLinecap="round"
                            />
                          </svg>

                          <span className="absolute right-[21%] top-[35%] text-lg text-[rgba(124,74,90,0.38)]">
                            ✦
                          </span>
                        </>
                      ) : null}

                      {selectedPreviewTheme.decoration === 'wedding' ? (
                        <>
                          <div className="pointer-events-none absolute -right-6 bottom-8 h-[68%] w-[58%] rotate-[-4deg] rounded-[1.4rem] border border-white/52 bg-white/22 backdrop-blur-[1px]" />

                          <svg
                            aria-hidden="true"
                            viewBox="0 0 180 240"
                            className="pointer-events-none absolute -bottom-4 right-0 h-[70%] w-36 opacity-65"
                            fill="none"
                          >
                            <path
                              d="M145 230C116 188 101 149 103 108C105 68 121 38 157 14"
                              stroke="rgba(124,74,90,0.28)"
                              strokeWidth="2.5"
                            />
                            <ellipse
                              cx="110"
                              cy="142"
                              rx="16"
                              ry="7"
                              transform="rotate(-32 110 142)"
                              fill="rgba(214,177,190,0.34)"
                            />
                            <ellipse
                              cx="130"
                              cy="87"
                              rx="16"
                              ry="7"
                              transform="rotate(28 130 87)"
                              fill="rgba(238,213,218,0.48)"
                            />
                          </svg>

                          <div className="pointer-events-none absolute bottom-9 right-8 grid size-14 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(248,220,227,0.95),rgba(184,126,145,0.62)_62%,rgba(124,74,90,0.38))] text-white/85 shadow-lg">
                            ✦
                          </div>
                        </>
                      ) : null}

                      {selectedPreviewTheme.decoration === 'graduation' ? (
                        <>
                          <div className="pointer-events-none absolute -bottom-4 right-4 h-36 w-52 rotate-[5deg] rounded-[1.1rem] border border-white/42 bg-white/22" />

                          <div className="pointer-events-none absolute bottom-2 right-8 h-36 w-52 rotate-[-3deg] rounded-[1.1rem] border border-white/56 bg-white/42 shadow-lg">
                            <div className="absolute left-5 top-5 h-1.5 w-20 rounded-full bg-[rgba(113,117,76,0.18)]" />
                            <div className="absolute left-5 top-9 h-1 w-28 rounded-full bg-[rgba(113,117,76,0.11)]" />
                          </div>

                          <div className="pointer-events-none absolute bottom-7 right-9 grid size-16 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,241,190,0.96),rgba(204,168,83,0.72)_58%,rgba(132,103,53,0.44))] text-white/90 shadow-lg">
                            ✦
                          </div>
                        </>
                      ) : null}

                      {selectedPreviewTheme.decoration === 'corporate' ? (
                        <>
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 opacity-45"
                            style={{
                              backgroundImage: `
                          linear-gradient(rgba(88,67,61,0.08) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(88,67,61,0.08) 1px, transparent 1px)
                        `,
                              backgroundSize: '26px 26px',
                            }}
                          />

                          <div className="pointer-events-none absolute bottom-6 right-6 h-32 w-48 rotate-[-3deg] rounded-[1.05rem] border border-white/48 bg-white/30 p-4 shadow-lg backdrop-blur-[2px]">
                            <div className="h-1.5 w-20 rounded-full bg-[rgba(88,67,61,0.20)]" />
                            <div className="mt-3 h-1 w-28 rounded-full bg-[rgba(88,67,61,0.12)]" />
                            <div className="mt-3 h-1 w-24 rounded-full bg-[rgba(88,67,61,0.10)]" />
                          </div>
                        </>
                      ) : null}

                      {selectedPreviewTheme.decoration === 'party' ? (
                        <>
                          <div className="pointer-events-none absolute -right-14 -top-20 h-[140%] w-[68%] rotate-[14deg] bg-[linear-gradient(100deg,transparent,rgba(255,220,195,0.38),rgba(158,89,119,0.14),transparent)] blur-lg" />

                          <div className="pointer-events-none absolute bottom-5 right-7 h-28 w-44 rotate-[-7deg] rounded-[1rem] border border-white/44 bg-white/28 shadow-lg backdrop-blur-[2px]">
                            <div className="absolute inset-y-3 left-[34%] border-l border-dashed border-[rgba(124,74,90,0.22)]" />
                            <span className="absolute bottom-4 right-4 text-[0.56rem] font-black uppercase tracking-[0.17em] text-[rgba(124,74,90,0.38)]">
                              Admit one
                            </span>
                          </div>

                          <span className="pointer-events-none absolute right-[18%] top-[26%] text-xl text-[rgba(146,94,69,0.54)]">
                            ✦
                          </span>
                        </>
                      ) : null}

                      {selectedPreviewTheme.decoration === 'baby' ? (
                        <>
                          <div className="pointer-events-none absolute right-[13%] top-[20%] size-20 rounded-full bg-[linear-gradient(145deg,rgba(238,221,173,0.90),rgba(196,174,116,0.52))] shadow-lg">
                            <span className="absolute -right-2 -top-1 size-[4.8rem] rounded-full bg-[rgba(250,243,226,0.96)]" />
                          </div>

                          <div className="pointer-events-none absolute bottom-12 right-3 h-24 w-44 opacity-80">
                            <span className="absolute bottom-0 left-2 h-12 w-36 rounded-full bg-white/58" />
                            <span className="absolute bottom-5 left-7 size-16 rounded-full bg-white/68" />
                            <span className="absolute bottom-4 left-[4.7rem] size-20 rounded-full bg-white/62" />
                          </div>

                          <span className="pointer-events-none absolute right-[36%] top-[31%] text-base text-[rgba(150,115,57,0.48)]">
                            ✦
                          </span>
                        </>
                      ) : null}

                      {selectedPreviewTheme.decoration === 'engagement' ? (
                        <>
                          <div className="pointer-events-none absolute right-[8%] top-[20%] h-32 w-44">
                            <span className="absolute left-3 top-5 size-24 rounded-full border-[5px] border-[rgba(197,165,95,0.62)]" />
                            <span className="absolute right-2 top-8 size-24 rounded-full border-[5px] border-[rgba(224,201,145,0.74)]" />
                            <span className="absolute right-[2.9rem] top-3 size-5 rotate-45 border border-white/72 bg-white/78 shadow-[0_0_16px_rgba(255,255,255,0.82)]" />
                          </div>

                          <div className="pointer-events-none absolute bottom-5 right-8 h-28 w-44 rotate-[-4deg] rounded-[1.1rem] border border-white/54 bg-white/34 shadow-lg backdrop-blur-[2px]">
                            <span className="absolute bottom-4 right-4 text-[0.56rem] font-black uppercase tracking-[0.17em] text-[rgba(150,115,57,0.38)]">
                              A promise
                            </span>
                          </div>
                        </>
                      ) : null}

                      {selectedPreviewTheme.decoration === 'festival' ? (
                        <>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 320 190"
                            className="pointer-events-none absolute -right-2 top-0 h-[58%] w-[70%] opacity-88"
                            fill="none"
                          >
                            <path d="M35 0V70" stroke="rgba(124,74,90,0.24)" />
                            <path d="M125 0V95" stroke="rgba(150,115,57,0.22)" />
                            <path d="M220 0V64" stroke="rgba(124,74,90,0.22)" />
                            <path
                              d="M35 70C21 82 21 104 35 117C49 104 49 82 35 70Z"
                              fill="rgba(173,103,86,0.58)"
                            />
                            <path
                              d="M125 95C108 108 108 134 125 149C142 134 142 108 125 95Z"
                              fill="rgba(213,165,95,0.62)"
                            />
                            <path
                              d="M220 64C205 77 205 101 220 115C235 101 235 77 220 64Z"
                              fill="rgba(153,88,111,0.52)"
                            />
                          </svg>

                          <div className="pointer-events-none absolute -bottom-16 -right-12 size-52 rounded-t-full border-[14px] border-b-0 border-[rgba(211,165,95,0.20)]" />

                          <span className="pointer-events-none absolute right-[22%] top-[36%] text-lg text-[rgba(150,115,57,0.58)]">
                            ✦
                          </span>
                        </>
                      ) : null}

                      <div className="relative z-10 flex min-h-[20rem] flex-col">
                        <div>
                          <p
                            className="text-xs font-black uppercase tracking-[0.22em]"
                            style={{
                              color: getEventCardStyle(selectedPreviewType).typeColor,
                            }}
                          >
                            {selectedPreviewType}
                          </p>

                          <h4 className="mt-3 max-w-[78%] text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                            {previewName.trim() || 'Your event name'}
                          </h4>

                          <p className="mt-3 max-w-[72%] text-sm leading-6 text-[var(--color-charcoal)]/58">
                            {selectedPreviewTheme.eyebrow}
                          </p>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/72 bg-white/54 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/70">
                            {previewFormattedDate}
                          </span>

                          <span className="max-w-40 truncate rounded-full border border-white/72 bg-white/54 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/70">
                            {previewLocation.trim() || 'Choose a location'}
                          </span>

                          <span className="rounded-full border border-white/72 bg-white/54 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/70">
                            {previewGuestCount.trim()
                              ? `${Number(previewGuestCount).toLocaleString('en-LK')} guests`
                              : 'Guests not set'}
                          </span>
                        </div>

                        <div className="mt-auto border-t border-white/66 pt-5">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                                Theme
                              </p>

                              <p className="mt-1 truncate text-sm font-black text-[var(--color-deep-plum)]">
                                {previewThemeName.trim() || 'Theme not set'}
                              </p>
                            </div>

                            <div>
                              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                                Planned budget
                              </p>

                              <p className="mt-1 truncate text-sm font-black text-[var(--color-near-black)]">
                                {previewFormattedBudget}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.4rem] border border-white/56 bg-white/32 p-4 backdrop-blur-xl">
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        {selectedPreviewType} identity
                      </p>

                      <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/58">
                        {selectedPreviewTheme.helper}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
