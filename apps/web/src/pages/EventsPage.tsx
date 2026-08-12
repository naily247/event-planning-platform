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
import { CustomerWorkspaceHeader } from '../components/navigation/CustomerWorkspaceHeader';
import { PageBackButton } from '../components/navigation/PageBackButton';
import { useCurrentUser } from '../features/auth/useCurrentUser';
import {
  createCustomerEvent,
  eventTypeOptions,
  getCustomerEvents,
  type CreateEventPayload,
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
  image: string;
};

const eventPreviewThemes: Record<EventTypeOption, EventPreviewTheme> = {
  Birthday: {
    eyebrow: 'A joyful celebration',
    helper: 'Balloons, cake and warm celebration details.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(247,238,245,0.98) 55%, rgba(218,197,221,0.94))',
    accent: 'linear-gradient(90deg, rgba(183,167,200,1), rgba(214,190,209,1), rgba(93,58,85,1))',
    image: '/images/events/previews/birthday.png',
  },

  Wedding: {
    eyebrow: 'An elegant ceremony',
    helper: 'Floral architecture, candlelight and timeless ceremony details.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(250,239,242,0.98) 55%, rgba(225,202,211,0.94))',
    accent: 'linear-gradient(90deg, rgba(199,167,181,1), rgba(226,194,198,1), rgba(142,92,103,1))',
    image: '/images/events/previews/wedding.png',
  },

  Graduation: {
    eyebrow: 'A milestone achieved',
    helper: 'Academic details, celebration staging and restrained metallic accents.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(248,245,234,0.98) 55%, rgba(216,219,191,0.94))',
    accent: 'linear-gradient(90deg, rgba(210,207,175,1), rgba(190,188,144,1), rgba(113,117,76,1))',
    image: '/images/events/previews/graduation.png',
  },

  Corporate: {
    eyebrow: 'Executive planning',
    helper: 'Structured staging, professional lighting and a focused event environment.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(243,238,233,0.98) 55%, rgba(206,188,176,0.94))',
    accent: 'linear-gradient(90deg, rgba(188,165,148,1), rgba(157,126,108,1), rgba(88,67,61,1))',
    image: '/images/events/previews/corporate.png',
  },

  Party: {
    eyebrow: 'An evening to remember',
    helper: 'Cocktail lighting, lounge details and energetic nightlife atmosphere.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(249,239,236,0.98) 55%, rgba(227,199,190,0.94))',
    accent: 'linear-gradient(90deg, rgba(223,183,174,1), rgba(191,137,137,1), rgba(124,74,90,1))',
    image: '/images/events/previews/party.png',
  },

  'Baby Shower': {
    eyebrow: 'A gentle celebration',
    helper: 'Soft balloons, teddy details and a calm nursery-inspired atmosphere.',
    background:
      'linear-gradient(145deg, rgba(255,253,247,0.99), rgba(249,245,230,0.98) 55%, rgba(218,218,191,0.94))',
    accent: 'linear-gradient(90deg, rgba(234,221,181,1), rgba(199,193,151,1), rgba(135,139,94,1))',
    image: '/images/events/previews/babyshower.png',
  },

  Engagement: {
    eyebrow: 'A promise begins',
    helper: 'Champagne light, floral details and an intimate romantic setting.',
    background:
      'linear-gradient(145deg, rgba(255,253,248,0.99), rgba(250,245,231,0.98) 55%, rgba(231,213,174,0.94))',
    accent: 'linear-gradient(90deg, rgba(235,219,176,1), rgba(205,178,115,1), rgba(150,115,57,1))',
    image: '/images/events/previews/engagement.png',
  },

  Festival: {
    eyebrow: 'A glowing celebration',
    helper: 'Lanterns, rich drapery and vibrant cultural celebration details.',
    background:
      'linear-gradient(145deg, rgba(255,252,246,0.99), rgba(250,237,224,0.98) 55%, rgba(223,183,157,0.94))',
    accent: 'linear-gradient(90deg, rgba(236,187,104,1), rgba(183,111,102,1), rgba(124,74,90,1))',
    image: '/images/events/previews/festival.png',
  },

  Anniversary: {
    eyebrow: 'A story worth celebrating',
    helper: 'Keepsake memories, candlelight and an intimate milestone atmosphere.',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99), rgba(247,239,234,0.98) 54%, rgba(214,194,180,0.94))',
    accent: 'linear-gradient(90deg, rgba(217,194,167,1), rgba(179,143,112,1), rgba(105,72,58,1))',
    image: '/images/events/previews/anniversary.png',
  },

  Reception: {
    eyebrow: 'An evening of elegance',
    helper: 'Crystal light, ballroom tables and refined formal-evening details.',
    background:
      'linear-gradient(145deg, rgba(253,252,255,0.99), rgba(235,238,247,0.98) 54%, rgba(190,202,221,0.94))',
    accent: 'linear-gradient(90deg, rgba(204,215,232,1), rgba(139,164,193,1), rgba(68,91,122,1))',
    image: '/images/events/previews/reception.png',
  },

  'Product Launch': {
    eyebrow: 'Something new is arriving',
    helper: 'Futuristic staging, focused lighting and a precise reveal environment.',
    background:
      'linear-gradient(145deg, rgba(246,249,253,0.99), rgba(224,232,242,0.98) 54%, rgba(145,166,193,0.94))',
    accent: 'linear-gradient(90deg, rgba(125,205,235,1), rgba(96,132,188,1), rgba(53,61,93,1))',
    image: '/images/events/previews/productlaunch.png',
  },
};

const createEventFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Event name must be at least 3 characters.')
    .max(120, 'Event name cannot exceed 120 characters.'),

  eventType: z.enum(eventTypeOptions, {
    message: 'Choose an event type.',
  }),

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
  label: EventTypeOption;
  background: string;
  accent: string;
  glow: string;
  typeColor: string;
  image: string;
  imagePosition: string;
};

const eventCardStyles: Record<EventTypeOption, EventCardStyle> = {
  Birthday: {
    label: 'Birthday',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(247,238,245,0.97) 56%, rgba(218,197,221,0.90) 100%)',
    accent:
      'linear-gradient(90deg, rgba(183,167,200,1) 0%, rgba(214,190,209,1) 50%, rgba(93,58,85,1) 100%)',
    glow: 'rgba(183,167,200,0.26)',
    typeColor: 'var(--color-deep-plum)',
    image: '/images/events/previews/birthday.png',
    imagePosition: '70% center',
  },

  Wedding: {
    label: 'Wedding',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(250,239,242,0.97) 56%, rgba(225,202,211,0.90) 100%)',
    accent:
      'linear-gradient(90deg, rgba(199,167,181,1) 0%, rgba(226,194,198,1) 48%, rgba(142,92,103,1) 100%)',
    glow: 'rgba(199,167,181,0.24)',
    typeColor: 'var(--color-rosewood)',
    image: '/images/events/previews/wedding.png',
    imagePosition: '70% center',
  },

  Graduation: {
    label: 'Graduation',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(244,240,235,0.97) 56%, rgba(204,194,184,0.91) 100%)',
    accent:
      'linear-gradient(90deg, rgba(198,184,168,1) 0%, rgba(142,101,94,1) 50%, rgba(54,48,51,1) 100%)',
    glow: 'rgba(142,101,94,0.23)',
    typeColor: '#78544f',
    image: '/images/events/previews/graduation.png',
    imagePosition: '72% center',
  },

  Corporate: {
    label: 'Corporate',
    background:
      'linear-gradient(145deg, rgba(250,252,255,0.99) 0%, rgba(234,240,246,0.97) 56%, rgba(185,201,217,0.91) 100%)',
    accent:
      'linear-gradient(90deg, rgba(166,190,211,1) 0%, rgba(91,126,157,1) 50%, rgba(42,57,74,1) 100%)',
    glow: 'rgba(91,126,157,0.23)',
    typeColor: '#445f78',
    image: '/images/events/previews/corporate.png',
    imagePosition: '72% center',
  },

  Party: {
    label: 'Party',
    background:
      'linear-gradient(145deg, rgba(255,250,248,0.99) 0%, rgba(248,231,239,0.97) 55%, rgba(205,162,185,0.91) 100%)',
    accent:
      'linear-gradient(90deg, rgba(233,158,154,1) 0%, rgba(181,91,137,1) 48%, rgba(91,43,92,1) 100%)',
    glow: 'rgba(181,91,137,0.25)',
    typeColor: '#8d466c',
    image: '/images/events/previews/party.png',
    imagePosition: '72% center',
  },

  'Baby Shower': {
    label: 'Baby Shower',
    background:
      'linear-gradient(145deg, rgba(255,253,247,0.99) 0%, rgba(246,245,230,0.97) 56%, rgba(206,216,194,0.91) 100%)',
    accent:
      'linear-gradient(90deg, rgba(234,221,181,1) 0%, rgba(181,198,169,1) 50%, rgba(104,126,103,1) 100%)',
    glow: 'rgba(181,198,169,0.25)',
    typeColor: '#65775f',
    image: '/images/events/previews/babyshower.png',
    imagePosition: '72% center',
  },

  Engagement: {
    label: 'Engagement',
    background:
      'linear-gradient(145deg, rgba(255,253,248,0.99) 0%, rgba(250,242,229,0.97) 56%, rgba(226,201,167,0.91) 100%)',
    accent:
      'linear-gradient(90deg, rgba(235,219,176,1) 0%, rgba(205,178,115,1) 50%, rgba(150,115,57,1) 100%)',
    glow: 'rgba(205,178,115,0.24)',
    typeColor: '#856631',
    image: '/images/events/previews/engagement.png',
    imagePosition: '72% center',
  },

  Festival: {
    label: 'Festival',
    background:
      'linear-gradient(145deg, rgba(255,251,245,0.99) 0%, rgba(249,231,216,0.97) 55%, rgba(220,166,142,0.91) 100%)',
    accent:
      'linear-gradient(90deg, rgba(236,187,104,1) 0%, rgba(183,111,102,1) 50%, rgba(124,74,90,1) 100%)',
    glow: 'rgba(210,139,103,0.25)',
    typeColor: '#975d51',
    image: '/images/events/previews/festival.png',
    imagePosition: '72% center',
  },

  Anniversary: {
    label: 'Anniversary',
    background:
      'linear-gradient(145deg, rgba(255,252,247,0.99) 0%, rgba(247,239,234,0.97) 55%, rgba(214,194,180,0.91) 100%)',
    accent:
      'linear-gradient(90deg, rgba(217,194,167,1) 0%, rgba(179,143,112,1) 50%, rgba(105,72,58,1) 100%)',
    glow: 'rgba(179,143,112,0.25)',
    typeColor: '#755044',
    image: '/images/events/previews/anniversary.png',
    imagePosition: '72% center',
  },

  Reception: {
    label: 'Reception',
    background:
      'linear-gradient(145deg, rgba(253,252,255,0.99) 0%, rgba(235,238,247,0.97) 55%, rgba(190,202,221,0.91) 100%)',
    accent:
      'linear-gradient(90deg, rgba(204,215,232,1) 0%, rgba(139,164,193,1) 50%, rgba(68,91,122,1) 100%)',
    glow: 'rgba(139,164,193,0.25)',
    typeColor: '#506d91',
    image: '/images/events/previews/reception.png',
    imagePosition: '72% center',
  },

  'Product Launch': {
    label: 'Product Launch',
    background:
      'linear-gradient(145deg, rgba(248,251,255,0.99) 0%, rgba(226,235,246,0.97) 54%, rgba(151,172,204,0.92) 100%)',
    accent:
      'linear-gradient(90deg, rgba(125,205,235,1) 0%, rgba(96,132,188,1) 48%, rgba(53,61,93,1) 100%)',
    glow: 'rgba(96,132,188,0.27)',
    typeColor: '#465f91',
    image: '/images/events/previews/productlaunch.png',
    imagePosition: '74% center',
  },
};

const normalizeEventType = (eventType: string) =>
  eventType.trim().replaceAll('_', ' ').replace(/\s+/g, ' ').toLowerCase();

const getEventCardStyle = (eventType: string): EventCardStyle => {
  const normalizedType = normalizeEventType(eventType);

  const matchedEventType = eventTypeOptions.find(
    (option) => option.toLowerCase() === normalizedType,
  );

  return matchedEventType ? eventCardStyles[matchedEventType] : eventCardStyles.Birthday;
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
      eventDate: '',
      location: '',
      guestCount: '',
      plannedBudget: '',
      theme: '',
      requirements: '',
    },
  });

  const previewEventType = form.watch('eventType');
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

  const selectedPreviewTheme = eventPreviewThemes[selectedPreviewType];

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

  const currentUserQuery = useCurrentUser();

  const eventsQuery = useQuery({
    queryKey: ['customer', 'events'],
    queryFn: () =>
      getCustomerEvents({
        page: 1,
        limit: 20,
        sort: 'upcoming',
      }),
  });

  const currentUser = currentUserQuery.data;

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
        <div className="space-y-4">
          {currentUser ? (
            <CustomerWorkspaceHeader user={currentUser} unreadNotificationCount={0} />
          ) : null}

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

            <button
              type="button"
              className="btn-primary text-sm font-bold"
              onClick={openCreateForm}
            >
              <Plus aria-hidden="true" className="size-4" />
              Create event
            </button>
          </header>
        </div>

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
                          <img
                            src={eventCardStyle.image}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 size-full object-cover transition duration-1000 group-hover:scale-[1.035]"
                            style={{
                              objectPosition: eventCardStyle.imagePosition,
                              filter: 'saturate(0.88) contrast(0.94)',
                            }}
                          />

                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,248,0.99)_0%,rgba(255,252,248,0.97)_22%,rgba(255,252,248,0.88)_43%,rgba(255,252,248,0.60)_62%,rgba(255,252,248,0.24)_79%,rgba(255,252,248,0.07)_100%)]"
                          />

                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_42%,rgba(31,27,29,0.10)_100%)]"
                          />

                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 left-0 w-[72%] bg-[radial-gradient(ellipse_at_left,rgba(255,252,248,0.32)_0%,rgba(255,252,248,0.13)_58%,transparent_84%)]"
                          />

                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-1.5 shadow-[0_4px_18px_rgba(93,58,85,0.10)]"
                            style={{
                              background: eventCardStyle.accent,
                            }}
                          />

                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-16 -top-14 z-[3] size-40 rounded-full blur-3xl opacity-38 transition duration-700 group-hover:scale-125 group-hover:opacity-60"
                            style={{
                              backgroundColor: eventCardStyle.glow,
                            }}
                          />
                          <div className="relative z-10 flex w-full flex-col drop-shadow-[0_1px_0_rgba(255,255,255,0.24)]">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p
                                  className="text-xs font-black uppercase tracking-[0.22em]"
                                  style={{
                                    color: eventCardStyle.typeColor,
                                  }}
                                >
                                  {eventCardStyle.label}
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
                      className="event-preview-swap group relative mt-7 min-h-[24rem] origin-center overflow-hidden rounded-[2rem] border border-white/72 shadow-[0_26px_80px_rgba(31,27,29,0.16)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(31,27,29,0.20)]"
                      style={{
                        background: selectedPreviewTheme.background,
                        animation: 'eventPreviewSwap 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
                      }}
                    >
                      <img
                        src={selectedPreviewTheme.image}
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 size-full object-cover object-center transition duration-1000 group-hover:scale-[1.025]"
                        style={{
                          objectPosition: '72% center',
                          filter: 'saturate(0.92) contrast(0.96)',
                        }}
                      />

                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,252,248,0.99)_0%,rgba(255,252,248,0.97)_22%,rgba(255,252,248,0.88)_42%,rgba(255,252,248,0.56)_61%,rgba(255,252,248,0.18)_79%,rgba(255,252,248,0.04)_100%)]"
                      />

                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10)_0%,transparent_45%,rgba(31,27,29,0.08)_100%)]"
                      />

                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-0 w-[64%] bg-[radial-gradient(ellipse_at_left,rgba(255,252,248,0.38)_0%,rgba(255,252,248,0.14)_56%,transparent_82%)]"
                      />

                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 z-[3] h-1.5"
                        style={{
                          background: selectedPreviewTheme.accent,
                        }}
                      />

                      <div className="relative z-10 flex min-h-[24rem] flex-col p-6 sm:p-7">
                        <div>
                          <p
                            className="text-xs font-black uppercase tracking-[0.22em]"
                            style={{
                              color: getEventCardStyle(selectedPreviewType).typeColor,
                            }}
                          >
                            {selectedPreviewType}
                          </p>

                          <h4 className="mt-3 max-w-[72%] text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                            {previewName.trim() || 'Your event name'}
                          </h4>

                          <p className="mt-3 max-w-[66%] text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {selectedPreviewTheme.eyebrow}
                          </p>
                        </div>

                        <div className="mt-6 flex max-w-[76%] flex-wrap gap-2">
                          <span className="rounded-full border border-white/82 bg-white/72 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/74 shadow-[0_8px_20px_rgba(31,27,29,0.06)] backdrop-blur-md">
                            {previewFormattedDate}
                          </span>

                          <span className="max-w-40 truncate rounded-full border border-white/82 bg-white/72 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/74 shadow-[0_8px_20px_rgba(31,27,29,0.06)] backdrop-blur-md">
                            {previewLocation.trim() || 'Choose a location'}
                          </span>

                          <span className="rounded-full border border-white/82 bg-white/72 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/74 shadow-[0_8px_20px_rgba(31,27,29,0.06)] backdrop-blur-md">
                            {previewGuestCount.trim() && Number.isFinite(Number(previewGuestCount))
                              ? `${Number(previewGuestCount).toLocaleString('en-LK')} guests`
                              : 'Guests not set'}
                          </span>
                        </div>

                        <div className="mt-auto max-w-[78%] rounded-[1.25rem] border border-white/74 bg-white/64 p-4 shadow-[0_14px_32px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="min-w-0">
                              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
                                Theme
                              </p>

                              <p className="mt-1 truncate text-sm font-black text-[var(--color-deep-plum)]">
                                {previewThemeName.trim() || 'Theme not set'}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/46">
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
