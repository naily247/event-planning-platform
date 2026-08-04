import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MailCheck,
  Search,
  Sparkles,
  UserCheck,
  UserRoundPlus,
  UsersRound,
  UserX,
  Save,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  createGuest,
  deleteGuest,
  getGuestSummary,
  getGuests,
  guestStatuses,
  updateGuest,
  updateGuestRsvp,
  type Guest,
  type GuestSort,
  type GuestStatus,
} from '../features/guests/guest.api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PageBackButton } from '../components/navigation/PageBackButton';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const guestFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required.')
    .max(100, 'First name cannot exceed 100 characters.'),

  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required.')
    .max(100, 'Last name cannot exceed 100 characters.'),

  email: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || z.string().email().safeParse(value).success,
      'Enter a valid email address.',
    ),

  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || value.length >= 7,
      'Phone number must contain at least 7 characters.',
    )
    .refine((value) => value.length <= 30, 'Phone number cannot exceed 30 characters.'),

  groupName: z.string().trim().max(100, 'Group name cannot exceed 100 characters.'),

  status: z.enum(guestStatuses),

  partySize: z
    .string()
    .min(1, 'Party size is required.')
    .refine((value) => {
      const partySize = Number(value);

      return Number.isInteger(partySize) && partySize >= 1 && partySize <= 100;
    }, 'Party size must be a whole number between 1 and 100.'),

  mealPreference: z.string().trim().max(255, 'Meal preference cannot exceed 255 characters.'),

  dietaryRequirements: z
    .string()
    .trim()
    .max(1000, 'Dietary requirements cannot exceed 1000 characters.'),

  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters.'),
});

type GuestFormValues = z.infer<typeof guestFormSchema>;

const guestStatusLabels: Record<GuestStatus, string> = {
  NOT_INVITED: 'Not invited',
  INVITED: 'Invited',
  CONFIRMED: 'Confirmed',
  DECLINED: 'Declined',
  MAYBE: 'Maybe',
};

const getStatusTone = (status: GuestStatus) => {
  switch (status) {
    case 'CONFIRMED':
      return 'green';

    case 'DECLINED':
      return 'rose';

    case 'INVITED':
    case 'MAYBE':
      return 'plum';

    case 'NOT_INVITED':
    default:
      return 'neutral';
  }
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load this guest workspace. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load this guest workspace. Please try again.'
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const formatGuestName = (guest: Guest) => `${guest.firstName} ${guest.lastName}`.trim();

export function GuestWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();

  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GuestStatus | ''>('');
  const [sort, setSort] = useState<GuestSort>('newest');
  const [page, setPage] = useState(1);
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const guestForm = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      groupName: '',
      status: 'NOT_INVITED',
      partySize: '1',
      mealPreference: '',
      dietaryRequirements: '',
      notes: '',
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
    enabled: Boolean(eventId),
    queryFn: () => getGuestSummary(eventId!),
  });

  const guestsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'guests',
      'list',
      {
        page,
        search: searchQuery,
        status: statusFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getGuests(eventId!, {
        page,
        limit: 20,
        sort,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      }),
  });

  const createGuestMutation = useMutation({
    mutationFn: async (values: GuestFormValues) => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      return createGuest(eventId, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        groupName: values.groupName.trim() || null,
        status: values.status,
        partySize: Number(values.partySize),
        mealPreference: values.mealPreference.trim() || null,
        dietaryRequirements: values.dietaryRequirements.trim() || null,
        notes: values.notes.trim() || null,
      });
    },

    onSuccess: async () => {
      setIsGuestFormOpen(false);
      guestForm.reset();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'list'],
        }),
      ]);
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async (values: GuestFormValues) => {
      if (!eventId || !guestToEdit) {
        throw new Error('Guest details are missing.');
      }

      const input: {
        firstName?: string;
        lastName?: string;
        email?: string | null;
        phone?: string | null;
        groupName?: string | null;
        partySize?: number;
        mealPreference?: string | null;
        dietaryRequirements?: string | null;
        notes?: string | null;
      } = {};

      const nextFirstName = values.firstName.trim();
      const nextLastName = values.lastName.trim();
      const nextEmail = values.email.trim().toLowerCase() || null;
      const nextPhone = values.phone.trim() || null;
      const nextGroupName = values.groupName.trim() || null;
      const nextPartySize = Number(values.partySize);
      const nextMealPreference = values.mealPreference.trim() || null;
      const nextDietaryRequirements = values.dietaryRequirements.trim() || null;
      const nextNotes = values.notes.trim() || null;

      if (nextFirstName !== guestToEdit.firstName) {
        input.firstName = nextFirstName;
      }

      if (nextLastName !== guestToEdit.lastName) {
        input.lastName = nextLastName;
      }

      if (nextEmail !== guestToEdit.email) {
        input.email = nextEmail;
      }

      if (nextPhone !== guestToEdit.phone) {
        input.phone = nextPhone;
      }

      if (nextGroupName !== guestToEdit.groupName) {
        input.groupName = nextGroupName;
      }

      if (nextPartySize !== guestToEdit.partySize) {
        input.partySize = nextPartySize;
      }

      if (nextMealPreference !== guestToEdit.mealPreference) {
        input.mealPreference = nextMealPreference;
      }

      if (nextDietaryRequirements !== guestToEdit.dietaryRequirements) {
        input.dietaryRequirements = nextDietaryRequirements;
      }

      if (nextNotes !== guestToEdit.notes) {
        input.notes = nextNotes;
      }

      return updateGuest(eventId, guestToEdit.id, input);
    },

    onSuccess: async () => {
      setGuestToEdit(null);
      setIsGuestFormOpen(false);
      guestForm.reset();

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'list'],
        }),
      ]);
    },
  });

  const updateGuestRsvpMutation = useMutation({
    mutationFn: async ({ guestId, status }: { guestId: string; status: GuestStatus }) => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      return updateGuestRsvp(eventId, guestId, {
        status,
      });
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'list'],
        }),
      ]);
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !guestToDelete) {
        throw new Error('Guest details are missing.');
      }

      await deleteGuest(eventId, guestToDelete.id);
    },

    onSuccess: async () => {
      setGuestToDelete(null);
      setIsDeleteDialogOpen(false);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'guests', 'list'],
        }),
      ]);
    },
  });
  const openEditGuestForm = (guest: Guest) => {
    createGuestMutation.reset();
    updateGuestMutation.reset();
    guestForm.clearErrors();

    guestForm.reset({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email ?? '',
      phone: guest.phone ?? '',
      groupName: guest.groupName ?? '',
      status: guest.status,
      partySize: String(guest.partySize),
      mealPreference: guest.mealPreference ?? '',
      dietaryRequirements: guest.dietaryRequirements ?? '',
      notes: guest.notes ?? '',
    });

    setGuestToEdit(guest);
    setIsGuestFormOpen(true);
  };

  const openDeleteGuestDialog = (guest: Guest) => {
    deleteGuestMutation.reset();
    setGuestToDelete(guest);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteGuestDialog = () => {
    if (deleteGuestMutation.isPending) {
      return;
    }

    deleteGuestMutation.reset();
    setGuestToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const openGuestForm = () => {
    createGuestMutation.reset();
    updateGuestMutation.reset();
    guestForm.clearErrors();

    guestForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      groupName: '',
      status: 'NOT_INVITED',
      partySize: '1',
      mealPreference: '',
      dietaryRequirements: '',
      notes: '',
    });

    setGuestToEdit(null);
    setIsGuestFormOpen(true);
  };

  const closeGuestForm = () => {
    if (createGuestMutation.isPending || updateGuestMutation.isPending) {
      return;
    }

    createGuestMutation.reset();
    updateGuestMutation.reset();
    guestForm.clearErrors();
    setGuestToEdit(null);
    setIsGuestFormOpen(false);
  };

  const submitGuest = guestForm.handleSubmit((values) => {
    guestForm.clearErrors('root');

    if (guestToEdit) {
      const nextFirstName = values.firstName.trim();
      const nextLastName = values.lastName.trim();
      const nextEmail = values.email.trim().toLowerCase() || null;
      const nextPhone = values.phone.trim() || null;
      const nextGroupName = values.groupName.trim() || null;
      const nextPartySize = Number(values.partySize);
      const nextMealPreference = values.mealPreference.trim() || null;
      const nextDietaryRequirements = values.dietaryRequirements.trim() || null;
      const nextNotes = values.notes.trim() || null;

      const hasChanges =
        nextFirstName !== guestToEdit.firstName ||
        nextLastName !== guestToEdit.lastName ||
        nextEmail !== guestToEdit.email ||
        nextPhone !== guestToEdit.phone ||
        nextGroupName !== guestToEdit.groupName ||
        nextPartySize !== guestToEdit.partySize ||
        nextMealPreference !== guestToEdit.mealPreference ||
        nextDietaryRequirements !== guestToEdit.dietaryRequirements ||
        nextNotes !== guestToEdit.notes;

      if (!hasChanges) {
        guestForm.setError('root', {
          type: 'manual',
          message: 'No guest details were changed.',
        });

        return;
      }

      updateGuestMutation.mutate(values);
      return;
    }

    createGuestMutation.mutate(values);
  });

  const submitGuestSearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearGuestFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('');
    setSort('newest');
    setPage(1);
  };

  const isLoading = summaryQuery.isLoading || guestsQuery.isLoading;
  const isError = summaryQuery.isError || guestsQuery.isError;
  const firstError = summaryQuery.error ?? guestsQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading guest workspace
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Gathering guest details, RSVP responses and attendance totals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !summaryQuery.data || !guestsQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Guest workspace unavailable
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
                    void Promise.all([summaryQuery.refetch(), guestsQuery.refetch()]);
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

  const guestSummary = summaryQuery.data;
  const guests = guestsQuery.data.guests;
  const pagination = guestsQuery.data.pagination;
  const isGuestMutationPending = createGuestMutation.isPending || updateGuestMutation.isPending;

  const summaryCards = [
    {
      label: 'Guest records',
      value: guestSummary.summary.totalGuests,
      helper: `${guestSummary.summary.totalExpectedAttendees} expected attendees`,
      icon: UsersRound,
      tone: 'bg-[rgba(183,167,200,0.26)] text-[var(--color-deep-plum)]',
    },
    {
      label: 'Confirmed',
      value: guestSummary.summary.confirmed,
      helper: `${guestSummary.summary.confirmedAttendees} attending`,
      icon: UserCheck,
      tone: 'bg-[linear-gradient(145deg,rgba(142,151,115,0.30),rgba(214,222,190,0.42))] text-[#3d452f]',
    },
    {
      label: 'Awaiting response',
      value: guestSummary.summary.invited + guestSummary.summary.notInvited,
      helper: `${guestSummary.summary.invited} already invited`,
      icon: Clock3,
      tone: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
    },
    {
      label: 'Declined',
      value: guestSummary.summary.declined,
      helper: `${guestSummary.summary.maybe} marked maybe`,
      icon: UserX,
      tone: 'bg-[linear-gradient(145deg,rgba(142,92,103,0.20),rgba(226,196,202,0.40))] text-[var(--color-rosewood)]',
    },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PageBackButton
              fallback={`/events/${eventId}`}
              label="Event workspace"
              className="shrink-0"
            />

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Guest management
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {guestSummary.event.name}
              </h1>
            </div>
          </div>

          <span className="status-chip w-fit" data-tone="plum">
            {guestSummary.event.status.replaceAll('_', ' ')}
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[8%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.22)] blur-3xl" />

            <div className="relative grid gap-7 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div className="flex flex-col justify-center">
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Guest planning
                </div>

                <h2 className="max-w-4xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl sm:leading-[0.98] lg:text-[3.65rem]">
                  Keep every guest, response and party detail organised.
                </h2>

                <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--color-charcoal)]/70 sm:text-lg sm:leading-8">
                  Manage contact details, party sizes, groups, meal preferences, dietary needs and
                  RSVP responses from one workspace.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <div className="soft-chip">
                    <UsersRound
                      aria-hidden="true"
                      className="size-4 text-[var(--color-deep-plum)]"
                    />
                    {guestSummary.summary.totalExpectedAttendees} expected attendees
                  </div>

                  <div className="soft-chip">
                    <MailCheck
                      aria-hidden="true"
                      className="size-4 text-[var(--color-deep-plum)]"
                    />
                    {guestSummary.summary.respondedGuests} responses
                  </div>

                  <div className="soft-chip">
                    <Clock3 aria-hidden="true" className="size-4 text-[var(--color-deep-plum)]" />

                    {formatEventDate(guestSummary.event.eventDate)}
                  </div>
                </div>
              </div>

              <aside className="group/response relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_28px_80px_rgba(93,58,85,0.28)] transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_34px_92px_rgba(93,58,85,0.32)] sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-white/10 blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-[rgba(175,201,216,0.10)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">
                        RSVP response rate
                      </p>

                      <p className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
                        {guestSummary.summary.responseRate}%
                      </p>

                      <p className="mt-2 text-sm font-semibold text-white/58">
                        {guestSummary.summary.respondedGuests} of{' '}
                        {guestSummary.summary.invitedGuests} invited guests responded
                      </p>
                    </div>

                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/10 text-[var(--color-powder-blue)] shadow-[0_12px_28px_rgba(31,27,29,0.12)] backdrop-blur transition duration-300 group-hover/response:-translate-y-0.5 group-hover/response:scale-105">
                      <MailCheck aria-hidden="true" className="size-5" />
                    </span>
                  </div>

                  <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-powder-blue),#fff4ea)] shadow-[0_0_18px_rgba(255,244,234,0.24)] transition-[width] duration-700"
                      style={{
                        width: `${Math.min(Math.max(guestSummary.summary.responseRate, 0), 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.12]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Confirmed
                      </p>

                      <p className="mt-2 text-2xl font-black">{guestSummary.summary.confirmed}</p>

                      <p className="mt-1 text-xs font-semibold text-white/48">
                        {guestSummary.summary.confirmedAttendees} attending
                      </p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.12]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Awaiting
                      </p>

                      <p className="mt-2 text-2xl font-black">
                        {guestSummary.summary.invited + guestSummary.summary.notInvited}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-white/48">
                        Still needs attention
                      </p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.12]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Maybe
                      </p>

                      <p className="mt-2 text-2xl font-black">{guestSummary.summary.maybe}</p>
                    </div>

                    <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.12]">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/46">
                        Declined
                      </p>

                      <p className="mt-2 text-2xl font-black">{guestSummary.summary.declined}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/12 pt-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">
                        Expected attendance
                      </p>

                      <p className="mt-1 text-sm font-black text-white/82">
                        {guestSummary.summary.totalExpectedAttendees} people currently expected
                      </p>
                    </div>

                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(142,151,115,0.22)] text-[#e7efd5]">
                      <UsersRound aria-hidden="true" className="size-4" />
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label, value, helper, icon: Icon, tone }) => (
              <article
                key={label}
                className={`group/guest-summary luxe-card relative overflow-hidden border-white/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/95 hover:shadow-[0_30px_72px_rgba(31,27,29,0.14)] ${
                  label === 'Guest records'
                    ? 'bg-white/50 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(225,208,234,0.92))]'
                    : label === 'Confirmed'
                      ? 'bg-white/50 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(210,222,181,0.90))]'
                      : label === 'Awaiting response'
                        ? 'bg-white/50 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(198,223,234,0.92))]'
                        : 'bg-white/50 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(232,196,205,0.92))]'
                }`}
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-16 -top-16 size-44 rounded-full blur-3xl opacity-50 transition duration-500 group-hover/guest-summary:scale-125 group-hover/guest-summary:opacity-100 ${
                    label === 'Guest records'
                      ? 'bg-[rgba(164,126,184,0.42)]'
                      : label === 'Confirmed'
                        ? 'bg-[rgba(142,151,115,0.40)]'
                        : label === 'Awaiting response'
                          ? 'bg-[rgba(130,179,201,0.42)]'
                          : 'bg-[rgba(170,100,117,0.40)]'
                  }`}
                />

                <div className="relative">
                  <div
                    className={`grid size-11 place-items-center rounded-2xl shadow-[0_10px_24px_rgba(31,27,29,0.06)] transition duration-300 group-hover/guest-summary:-translate-y-0.5 group-hover/guest-summary:scale-110 group-hover/guest-summary:shadow-[0_14px_30px_rgba(31,27,29,0.12)] ${tone}`}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-5 transition duration-300 group-hover/guest-summary:rotate-[4deg]"
                    />
                  </div>

                  <p className="mt-8 text-xs font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/48 transition duration-300 group-hover/guest-summary:text-[var(--color-rosewood)]/74">
                    {label}
                  </p>

                  <p className="mt-3 text-3xl font-black tracking-[-0.055em] text-[var(--color-near-black)] transition duration-300 group-hover/guest-summary:translate-x-0.5 group-hover/guest-summary:text-[var(--color-deep-plum)] sm:text-[2.15rem]">
                    {value}
                  </p>

                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/55 transition duration-300 group-hover/guest-summary:text-[var(--color-charcoal)]/68">
                    {helper}
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Guest list
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Everyone invited to the celebration.
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="soft-chip w-fit">{pagination.total} guests</span>

                  <button
                    type="button"
                    className="btn-primary text-sm font-bold"
                    onClick={openGuestForm}
                  >
                    <UserRoundPlus className="size-4" />
                    Add guest
                  </button>
                </div>
              </div>

              <form
                className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitGuestSearch();
                }}
              >
                <div className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/24 px-4 backdrop-blur-xl">
                  <Search className="size-5 shrink-0 text-[var(--color-charcoal)]/42" />

                  <input
                    className="min-h-12 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--color-charcoal)]/42"
                    type="search"
                    placeholder="Search by name, email, phone or group"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                    }}
                  />
                </div>

                <select
                  className="form-field min-h-12 lg:w-44"
                  aria-label="Filter guests by RSVP status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as GuestStatus | '');
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>

                  {guestStatuses.map((status) => (
                    <option key={status} value={status}>
                      {guestStatusLabels[status]}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12 lg:w-52"
                  aria-label="Sort guests"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as GuestSort);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name_asc">Name A–Z</option>
                  <option value="name_desc">Name Z–A</option>
                  <option value="party_size_highest">Largest party first</option>
                  <option value="party_size_lowest">Smallest party first</option>
                </select>

                <div className="flex flex-wrap gap-3 lg:col-span-3">
                  <button type="submit" className="btn-primary text-sm font-bold">
                    <Search className="size-4" />
                    Search
                  </button>

                  {searchQuery || statusFilter || sort !== 'newest' ? (
                    <button
                      type="button"
                      className="btn-secondary text-sm font-bold"
                      onClick={clearGuestFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </form>

              {guests.length > 0 ? (
                <div className="mt-8 grid gap-4">
                  {guests.map((guest) => (
                    <article
                      key={guest.id}
                      className="group/guest relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.38),rgba(255,255,255,0.20))] p-5 shadow-[0_18px_45px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/90 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.78),rgba(235,225,241,0.54))] hover:shadow-[0_28px_68px_rgba(31,27,29,0.11)] sm:p-6"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[rgba(183,167,200,0.16)] opacity-60 blur-3xl transition duration-500 group-hover/guest:scale-125 group-hover/guest:bg-[rgba(183,167,200,0.28)] group-hover/guest:opacity-100"
                      />

                      <div className="relative">
                        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                          <div className="flex min-w-0 items-start gap-4">
                            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/55 bg-[rgba(183,167,200,0.22)] text-sm font-black text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(93,58,85,0.08)] transition duration-300 group-hover/guest:-translate-y-0.5 group-hover/guest:scale-105 group-hover/guest:bg-[rgba(183,167,200,0.34)] group-hover/guest:shadow-[0_16px_34px_rgba(93,58,85,0.14)]">
                              {guest.firstName.charAt(0)}
                              {guest.lastName.charAt(0)}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/guest:translate-x-0.5 group-hover/guest:text-[var(--color-deep-plum)]">
                                {formatGuestName(guest)}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-[var(--color-charcoal)]/58 transition duration-300 group-hover/guest:text-[var(--color-charcoal)]/72">
                                  {guest.groupName ?? 'No guest group'}
                                </span>

                                <span className="size-1 rounded-full bg-[var(--color-charcoal)]/24" />

                                <span className="text-sm font-semibold text-[var(--color-charcoal)]/52">
                                  Party of {guest.partySize}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-3">
                            <select
                              className="min-h-10 rounded-2xl border border-white/60 bg-white/38 px-4 text-xs font-black tracking-[0.04em] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.04)] outline-none backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.28)] hover:bg-white/54 hover:shadow-[0_14px_30px_rgba(31,27,29,0.08)] focus:border-[rgba(93,58,85,0.34)] focus:ring-2 focus:ring-[var(--color-deep-plum)]/15"
                              aria-label={`Update RSVP status for ${formatGuestName(guest)}`}
                              value={guest.status}
                              disabled={
                                updateGuestRsvpMutation.isPending &&
                                updateGuestRsvpMutation.variables?.guestId === guest.id
                              }
                              onChange={(event) => {
                                const status = event.target.value as GuestStatus;

                                if (status === guest.status) {
                                  return;
                                }

                                updateGuestRsvpMutation.mutate({
                                  guestId: guest.id,
                                  status,
                                });
                              }}
                            >
                              {guestStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {guestStatusLabels[status]}
                                </option>
                              ))}
                            </select>

                            <span
                              className="status-chip w-fit transition duration-300 group-hover/guest:-translate-y-0.5 group-hover/guest:scale-[1.02] group-hover/guest:shadow-[0_8px_20px_rgba(31,27,29,0.08)]"
                              data-tone={getStatusTone(guest.status)}
                            >
                              {guestStatusLabels[guest.status]}
                            </span>

                            <button
                              type="button"
                              className="grid size-10 place-items-center rounded-2xl border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.04)] transition duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-[rgba(93,58,85,0.30)] hover:bg-[rgba(93,58,85,0.16)] hover:shadow-[0_14px_30px_rgba(93,58,85,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/30"
                              aria-label={`Edit ${formatGuestName(guest)}`}
                              onClick={() => {
                                openEditGuestForm(guest);
                              }}
                            >
                              <Pencil
                                aria-hidden="true"
                                className="size-4 transition duration-300 group-hover/guest:rotate-[3deg]"
                              />
                            </button>

                            <button
                              type="button"
                              className="grid size-10 place-items-center rounded-2xl border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] shadow-[0_10px_24px_rgba(31,27,29,0.04)] transition duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-[rgba(124,74,90,0.30)] hover:bg-[rgba(124,74,90,0.16)] hover:shadow-[0_14px_30px_rgba(124,74,90,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-muted-burgundy)]/30"
                              aria-label={`Delete ${formatGuestName(guest)}`}
                              onClick={() => {
                                openDeleteGuestDialog(guest);
                              }}
                            >
                              <Trash2
                                aria-hidden="true"
                                className="size-4 transition duration-300 group-hover/guest:rotate-[4deg]"
                              />
                            </button>
                          </div>
                        </div>
                        {updateGuestRsvpMutation.isError &&
                        updateGuestRsvpMutation.variables?.guestId === guest.id ? (
                          <div
                            role="alert"
                            className="mt-4 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                          >
                            {getApiErrorMessage(updateGuestRsvpMutation.error)}
                          </div>
                        ) : null}

                        <div className="mt-6 grid gap-3 border-t border-[rgba(93,58,85,0.08)] pt-5 text-sm sm:grid-cols-3">
                          <div className="rounded-2xl border border-white/45 bg-white/22 p-4 transition duration-300 group-hover/guest:border-white/72 group-hover/guest:bg-white/38">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                              Meal preference
                            </p>

                            <p className="mt-2 font-black leading-6 text-[var(--color-near-black)] transition duration-300 group-hover/guest:text-[var(--color-deep-plum)]">
                              {guest.mealPreference ?? 'Not specified'}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/45 bg-white/22 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                              Email
                            </p>

                            <p className="mt-2 break-words font-black leading-6 text-[var(--color-near-black)] transition duration-300 group-hover/guest:text-[var(--color-deep-plum)]">
                              {guest.email ?? 'Not provided'}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/45 bg-white/22 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                              Phone
                            </p>

                            <p className="mt-2 break-words font-black leading-6 text-[var(--color-near-black)] transition duration-300 group-hover/guest:text-[var(--color-deep-plum)]">
                              {guest.phone ?? 'Not provided'}
                            </p>
                          </div>
                        </div>

                        <>
                          {guest.dietaryRequirements ? (
                            <div className="mt-5 rounded-2xl border border-[rgba(142,92,103,0.10)] bg-[rgba(255,255,255,0.28)] p-4 transition duration-300 group-hover/guest:border-[rgba(142,92,103,0.20)] group-hover/guest:bg-[rgba(248,230,234,0.34)]">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                                Dietary requirements
                              </p>

                              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                                {guest.dietaryRequirements}
                              </p>
                            </div>
                          ) : null}

                          {guest.notes ? (
                            <div className="mt-4 rounded-2xl border border-[rgba(93,58,85,0.10)] bg-[rgba(255,255,255,0.28)] p-4 transition duration-300 group-hover/guest:border-[rgba(93,58,85,0.20)] group-hover/guest:bg-[rgba(235,225,241,0.34)]">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                                Notes
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                                {guest.notes}
                              </p>
                            </div>
                          ) : null}
                        </>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-dashed border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.24))] p-8 text-center shadow-[0_16px_42px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-10">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                  />

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-16 -left-12 size-40 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
                  />

                  <div className="relative">
                    <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.06)]">
                      <UsersRound aria-hidden="true" className="size-8" />
                    </div>

                    <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      {searchQuery || statusFilter
                        ? 'No guests match these filters'
                        : 'No guests added yet'}
                    </p>

                    <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                      {searchQuery || statusFilter
                        ? 'Try changing the search term, RSVP status or sort order.'
                        : 'Add the first guest to begin tracking invitations, attendance, contact details and meal requirements.'}
                    </p>

                    {searchQuery || statusFilter || sort !== 'newest' ? (
                      <button
                        type="button"
                        className="btn-secondary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                        onClick={clearGuestFilters}
                      >
                        Clear filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="group/first-guest btn-primary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                        onClick={openGuestForm}
                      >
                        <UserRoundPlus
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/first-guest:scale-105"
                        />
                        Add first guest
                      </button>
                    )}
                  </div>
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="relative mt-8 overflow-hidden rounded-[1.5rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(228,238,243,0.32))] p-4 shadow-[0_14px_38px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:p-5">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                  />

                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[var(--color-deep-plum)] shadow-[0_8px_20px_rgba(31,27,29,0.05)]">
                        <UsersRound aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-near-black)]">
                          Page {pagination.page} of {pagination.totalPages}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/50">
                          {pagination.total} {pagination.total === 1 ? 'guest' : 'guests'} in total
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                        disabled={!pagination.hasPreviousPage || guestsQuery.isFetching}
                        onClick={() => {
                          setPage((currentPage) => Math.max(currentPage - 1, 1));
                        }}
                      >
                        Previous
                      </button>

                      <button
                        type="button"
                        className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                        disabled={!pagination.hasNextPage || guestsQuery.isFetching}
                        onClick={() => {
                          setPage((currentPage) => currentPage + 1);
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>

            <aside className="self-start space-y-5">
              <article className="group/target relative overflow-hidden rounded-[2rem] border border-white/68 bg-[linear-gradient(145deg,rgba(255,255,255,0.76),rgba(242,234,246,0.82))] p-6 shadow-[0_24px_70px_rgba(31,27,29,0.08)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/86 hover:shadow-[0_30px_78px_rgba(31,27,29,0.11)] sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl transition duration-500 group-hover/target:scale-125 group-hover/target:bg-[rgba(183,167,200,0.34)]"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                        Attendance target
                      </p>

                      <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                        Planned versus expected.
                      </h2>
                    </div>

                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(31,27,29,0.08)] transition duration-300 group-hover/target:-translate-y-0.5 group-hover/target:scale-105">
                      <UsersRound aria-hidden="true" className="size-5" />
                    </span>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.45rem] border border-white/62 bg-white/36 p-5 backdrop-blur-xl transition duration-300 group-hover/target:bg-white/48">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                        Planned
                      </p>

                      <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {guestSummary.event.plannedGuestCount ?? '—'}
                      </p>

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        Event guest target
                      </p>
                    </div>

                    <div className="rounded-[1.45rem] border border-white/62 bg-white/36 p-5 backdrop-blur-xl transition duration-300 group-hover/target:bg-white/48">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                        Expected
                      </p>

                      <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-deep-plum)]">
                        {guestSummary.summary.totalExpectedAttendees}
                      </p>

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        Based on guest responses
                      </p>
                    </div>
                  </div>

                  {guestSummary.event.plannedGuestCount ? (
                    <>
                      <div className="mt-6 flex items-center justify-between gap-4">
                        <p className="text-xs font-black uppercase tracking-[0.17em] text-[var(--color-charcoal)]/42">
                          Target coverage
                        </p>

                        <p className="text-sm font-black text-[var(--color-deep-plum)]">
                          {Math.min(
                            Math.round(
                              (guestSummary.summary.totalExpectedAttendees /
                                guestSummary.event.plannedGuestCount) *
                                100,
                            ),
                            100,
                          )}
                          %
                        </p>
                      </div>

                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(93,58,85,0.08)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),#d7b7c3)] shadow-[0_0_14px_rgba(142,92,103,0.20)] transition-[width] duration-700"
                          style={{
                            width: `${Math.min(
                              Math.max(
                                (guestSummary.summary.totalExpectedAttendees /
                                  guestSummary.event.plannedGuestCount) *
                                  100,
                                0,
                              ),
                              100,
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/54">
                        {guestSummary.summary.totalExpectedAttendees >=
                        guestSummary.event.plannedGuestCount
                          ? 'Expected attendance has reached the planned guest target.'
                          : `${guestSummary.event.plannedGuestCount - guestSummary.summary.totalExpectedAttendees} more expected attendees are needed to reach the target.`}
                      </p>
                    </>
                  ) : (
                    <div className="mt-6 rounded-[1.35rem] border border-dashed border-white/68 bg-white/24 px-4 py-4">
                      <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/54">
                        Add a planned guest count in the event details to compare attendance against
                        a target.
                      </p>
                    </div>
                  )}
                </div>
              </article>

              <article className="group/rsvp relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_82px_rgba(93,58,85,0.32)] sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-white/10 blur-3xl"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-[rgba(175,201,216,0.10)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/48">
                        RSVP overview
                      </p>

                      <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">
                        Invitation health.
                      </h2>

                      <p className="mt-3 leading-7 text-white/64">
                        See which guests have responded and where follow-up is still needed.
                      </p>
                    </div>

                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/10 text-[var(--color-powder-blue)] shadow-[0_12px_28px_rgba(31,27,29,0.12)] backdrop-blur transition duration-300 group-hover/rsvp:-translate-y-0.5 group-hover/rsvp:scale-105">
                      <MailCheck aria-hidden="true" className="size-5" />
                    </span>
                  </div>

                  <div className="mt-7 rounded-[1.45rem] border border-white/12 bg-white/[0.07] p-5 backdrop-blur-xl">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.17em] text-white/44">
                          Response rate
                        </p>

                        <p className="mt-2 text-4xl font-black tracking-[-0.055em]">
                          {guestSummary.summary.responseRate}%
                        </p>
                      </div>

                      <p className="text-right text-xs font-bold leading-5 text-white/46">
                        {guestSummary.summary.respondedGuests}
                        <br />
                        responses
                      </p>
                    </div>

                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/12">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-powder-blue),#fff4ea)] shadow-[0_0_18px_rgba(255,244,234,0.24)] transition-[width] duration-700"
                        style={{
                          width: `${Math.min(
                            Math.max(guestSummary.summary.responseRate, 0),
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {(
                      [
                        {
                          label: 'Not invited',
                          value: guestSummary.summary.notInvited,
                          tone: 'bg-white/[0.07]',
                        },
                        {
                          label: 'Invited',
                          value: guestSummary.summary.invited,
                          tone: 'bg-[rgba(175,201,216,0.10)]',
                        },
                        {
                          label: 'Confirmed',
                          value: guestSummary.summary.confirmed,
                          tone: 'bg-[rgba(142,151,115,0.18)]',
                        },
                        {
                          label: 'Maybe',
                          value: guestSummary.summary.maybe,
                          tone: 'bg-[rgba(183,167,200,0.14)]',
                        },
                        {
                          label: 'Declined',
                          value: guestSummary.summary.declined,
                          tone: 'bg-[rgba(142,92,103,0.16)]',
                        },
                      ] as const
                    ).map(({ label, value, tone }) => (
                      <div
                        key={label}
                        className={`rounded-[1.25rem] border border-white/10 px-4 py-3.5 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-white/18 ${tone}`}
                      >
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-white/46">
                          {label}
                        </p>

                        <p className="mt-2 text-xl font-black text-white/92">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/12 pt-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">
                        Follow-up needed
                      </p>

                      <p className="mt-1 text-sm font-black text-white/82">
                        {guestSummary.summary.invited + guestSummary.summary.notInvited} guests
                        still need attention
                      </p>
                    </div>

                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white/72">
                      <Clock3 aria-hidden="true" className="size-4" />
                    </span>
                  </div>
                </div>
              </article>

              <article className="group/date relative overflow-hidden rounded-[1.75rem] border border-white/64 bg-white/30 p-5 shadow-[0_18px_48px_rgba(31,27,29,0.06)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-white/42 hover:shadow-[0_24px_58px_rgba(31,27,29,0.09)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl transition duration-500 group-hover/date:scale-125"
                />

                <div className="relative flex items-center gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.26)] text-[#334954] shadow-[0_10px_24px_rgba(31,27,29,0.06)] transition duration-300 group-hover/date:-translate-y-0.5 group-hover/date:scale-105">
                    <Clock3 aria-hidden="true" className="size-5" />
                  </span>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Event date
                    </p>

                    <p className="mt-2 text-lg font-black leading-6 tracking-[-0.025em] text-[var(--color-near-black)]">
                      {formatEventDate(guestSummary.event.eventDate)}
                    </p>
                  </div>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>
      {isGuestFormOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.62)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-guest-title"
          onClick={() => {
            if (!isGuestMutationPending) {
              closeGuestForm();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-3xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(240,231,246,0.86))] shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[14%] top-[-8rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(255,228,210,0.14)] blur-3xl"
              />

              <div className="relative max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8">
                <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.06)]">
                        {guestToEdit ? (
                          <Pencil aria-hidden="true" className="size-6" />
                        ) : (
                          <UserRoundPlus aria-hidden="true" className="size-6" />
                        )}
                      </span>

                      <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                        {guestToEdit ? 'Edit guest' : 'New guest'}
                      </span>
                    </div>

                    <h2
                      id="create-guest-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      {guestToEdit ? 'Refine this guest record.' : 'Add someone to the guest list.'}
                    </h2>

                    <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      {guestToEdit
                        ? 'Update contact details, party information, RSVP progress, meal preferences or planning notes.'
                        : 'Record contact details, party size, RSVP status and meal requirements in one organised guest profile.'}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="status-chip" data-tone="plum">
                        <UsersRound aria-hidden="true" className="size-3.5" />
                        Guest record
                      </span>

                      <span className="status-chip" data-tone="blue">
                        <MailCheck aria-hidden="true" className="size-3.5" />
                        RSVP tracking
                      </span>

                      <span className="status-chip" data-tone="gray">
                        <UserCheck aria-hidden="true" className="size-3.5" />
                        Party details
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close guest form"
                    disabled={isGuestMutationPending}
                    onClick={closeGuestForm}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <form className="mt-7 grid gap-5" onSubmit={submitGuest}>
                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/32 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                          <UsersRound aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Basic information
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            Identify the guest
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Add the guest’s name exactly as you want it to appear across the event.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            First name
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="text"
                            placeholder="First name"
                            disabled={isGuestMutationPending}
                            {...guestForm.register('firstName')}
                          />

                          {guestForm.formState.errors.firstName ? (
                            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                              <CircleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                              />

                              <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                                {guestForm.formState.errors.firstName.message}
                              </p>
                            </div>
                          ) : null}
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Last name
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="text"
                            placeholder="Last name"
                            disabled={isGuestMutationPending}
                            {...guestForm.register('lastName')}
                          />

                          {guestForm.formState.errors.lastName ? (
                            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                              <CircleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                              />

                              <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                                {guestForm.formState.errors.lastName.message}
                              </p>
                            </div>
                          ) : null}
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(220,235,242,0.38))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#334954]">
                          <MailCheck aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Contact information
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            Add reliable contact details
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Save the best email address and phone number for invitations and
                            updates.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Email
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="email"
                            placeholder="guest@example.com"
                            disabled={isGuestMutationPending}
                            {...guestForm.register('email')}
                          />

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Optional, but recommended for digital invitations.
                          </p>

                          {guestForm.formState.errors.email ? (
                            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                              <CircleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                              />

                              <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                                {guestForm.formState.errors.email.message}
                              </p>
                            </div>
                          ) : null}
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Phone
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="tel"
                            placeholder="+94 77 123 4567"
                            disabled={isGuestMutationPending}
                            {...guestForm.register('phone')}
                          />

                          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                            Optional. Include the country code where useful.
                          </p>

                          {guestForm.formState.errors.phone ? (
                            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                              <CircleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                              />

                              <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                                {guestForm.formState.errors.phone.message}
                              </p>
                            </div>
                          ) : null}
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(240,231,246,0.38))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                          <UserCheck aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Attendance details
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            Organise the guest’s attendance
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Set their group, party size and current RSVP progress.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-5 sm:grid-cols-3">
                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Guest group
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="text"
                            placeholder="Family"
                            disabled={isGuestMutationPending}
                            {...guestForm.register('groupName')}
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Party size
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            disabled={isGuestMutationPending}
                            {...guestForm.register('partySize')}
                          />

                          {guestForm.formState.errors.partySize ? (
                            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                              <CircleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                              />

                              <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                                {guestForm.formState.errors.partySize.message}
                              </p>
                            </div>
                          ) : null}
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            RSVP status
                            <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                          </span>

                          <select
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            disabled={isGuestMutationPending}
                            {...guestForm.register('status')}
                          >
                            {guestStatuses.map((status) => (
                              <option key={status} value={status}>
                                {guestStatusLabels[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.66),rgba(248,235,223,0.38))] p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(255,228,210,0.18)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(233,221,207,0.72)] text-[var(--color-deep-plum)]">
                          <Sparkles aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Meal preferences
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            Capture catering needs
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Record meal choices and any dietary requirements that affect planning.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-5">
                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Meal preference
                          </span>

                          <input
                            className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                            type="text"
                            placeholder="Vegetarian"
                            disabled={isGuestMutationPending}
                            {...guestForm.register('mealPreference')}
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                            Dietary requirements
                          </span>

                          <textarea
                            className="form-field mt-2 min-h-28 resize-y transition duration-300 focus:bg-white/52"
                            placeholder="Allergies, intolerances or special requirements"
                            disabled={isGuestMutationPending}
                            {...guestForm.register('dietaryRequirements')}
                          />

                          {guestForm.formState.errors.dietaryRequirements ? (
                            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                              <CircleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                              />

                              <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                                {guestForm.formState.errors.dietaryRequirements.message}
                              </p>
                            </div>
                          ) : null}
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/32 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl"
                    />

                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                          <Pencil aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                            Additional notes
                          </p>

                          <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                            Preserve useful context
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                            Add any optional information that may help during event planning.
                          </p>
                        </div>
                      </div>

                      <label className="mt-6 block">
                        <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                          Notes
                        </span>

                        <textarea
                          className="form-field mt-2 min-h-32 resize-y transition duration-300 focus:bg-white/52"
                          placeholder="Optional guest notes"
                          disabled={isGuestMutationPending}
                          {...guestForm.register('notes')}
                        />

                        {guestForm.formState.errors.notes ? (
                          <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-3 py-2.5">
                            <CircleAlert
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-[var(--color-muted-burgundy)]"
                            />

                            <p className="text-sm font-bold leading-5 text-[var(--color-muted-burgundy)]">
                              {guestForm.formState.errors.notes.message}
                            </p>
                          </div>
                        ) : null}
                      </label>
                    </div>
                  </section>

                  {guestForm.formState.errors.root?.message ? (
                    <div
                      role="alert"
                      className="rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                          <CircleAlert aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                            No guest changes detected
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {guestForm.formState.errors.root.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {createGuestMutation.isError || updateGuestMutation.isError ? (
                    <div
                      role="alert"
                      className="rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                          <CircleAlert aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                            Guest record could not be saved
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                            {getApiErrorMessage(
                              guestToEdit ? updateGuestMutation.error : createGuestMutation.error,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <UsersRound aria-hidden="true" className="size-4" />
                      </span>

                      <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                        {guestToEdit
                          ? 'Saving updates this guest across the guest list and invitation workspace.'
                          : 'You can update attendance, contact and meal details later as plans change.'}
                      </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-bold"
                        disabled={isGuestMutationPending}
                        onClick={closeGuestForm}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="group/save-guest btn-primary min-w-40 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                        disabled={isGuestMutationPending}
                      >
                        {isGuestMutationPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Save
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/save-guest:scale-105"
                          />
                        )}

                        {updateGuestMutation.isPending
                          ? 'Saving guest...'
                          : createGuestMutation.isPending
                            ? 'Adding guest...'
                            : guestToEdit
                              ? 'Save changes'
                              : 'Add guest'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteDialogOpen && guestToDelete ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.64)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-guest-title"
          onClick={() => {
            if (!deleteGuestMutation.isPending) {
              closeDeleteGuestDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(249,235,240,0.87))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-5 border-b border-[rgba(93,58,85,0.10)] pb-7">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_14px_30px_rgba(124,74,90,0.08)]">
                        <Trash2 aria-hidden="true" className="size-7" />
                      </span>

                      <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                        Permanent action
                      </span>
                    </div>

                    <h2
                      id="delete-guest-title"
                      className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Remove this guest?
                    </h2>

                    <p className="mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                      This permanently removes the guest and their saved attendance, contact, meal
                      and planning details from the event.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close delete guest dialog"
                    disabled={deleteGuestMutation.isPending}
                    onClick={closeDeleteGuestDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <section className="relative mt-7 overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(240,231,246,0.40))] p-5 shadow-[0_16px_42px_rgba(31,27,29,0.05)] backdrop-blur-xl sm:p-6">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
                  />

                  <div className="relative">
                    <div className="flex items-start gap-4">
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/55 bg-[rgba(183,167,200,0.24)] text-base font-black text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        {guestToDelete.firstName.charAt(0)}
                        {guestToDelete.lastName.charAt(0)}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                          {formatGuestName(guestToDelete)}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/56">
                          {guestToDelete.groupName ?? 'No guest group'}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className="status-chip"
                            data-tone={getStatusTone(guestToDelete.status)}
                          >
                            {guestStatusLabels[guestToDelete.status]}
                          </span>

                          <span className="status-chip" data-tone="gray">
                            Party of {guestToDelete.partySize}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Email
                        </p>

                        <p className="mt-2 break-words text-sm font-black leading-6 text-[var(--color-near-black)]">
                          {guestToDelete.email ?? 'Not provided'}
                        </p>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Phone
                        </p>

                        <p className="mt-2 break-words text-sm font-black leading-6 text-[var(--color-near-black)]">
                          {guestToDelete.phone ?? 'Not provided'}
                        </p>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          Meal preference
                        </p>

                        <p className="mt-2 text-sm font-black leading-6 text-[var(--color-near-black)]">
                          {guestToDelete.mealPreference ?? 'Not specified'}
                        </p>
                      </div>

                      <div className="rounded-[1.3rem] border border-white/60 bg-white/34 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                          RSVP status
                        </p>

                        <div className="mt-3">
                          <span
                            className="status-chip"
                            data-tone={getStatusTone(guestToDelete.status)}
                          >
                            {guestStatusLabels[guestToDelete.status]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="relative mt-5 overflow-hidden rounded-[1.5rem] border border-[rgba(124,74,90,0.20)] bg-[linear-gradient(145deg,rgba(249,235,240,0.78),rgba(255,255,255,0.40))] p-5">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(210,146,160,0.18)] blur-3xl"
                  />

                  <div className="relative flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                      <CircleAlert aria-hidden="true" className="size-5" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        Related invitation access may also be affected
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/60">
                        Removing the guest may also remove or invalidate invitation records linked
                        to their guest profile.
                      </p>
                    </div>
                  </div>
                </section>

                {guestToDelete.dietaryRequirements || guestToDelete.notes ? (
                  <section className="mt-5 rounded-[1.45rem] border border-dashed border-white/70 bg-white/28 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Pencil aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        Any saved dietary requirements and planning notes will be permanently
                        removed with this guest.
                      </p>
                    </div>
                  </section>
                ) : null}

                {deleteGuestMutation.isError ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
                        <CircleAlert aria-hidden="true" className="size-4" />
                      </span>

                      <div>
                        <p className="text-sm font-black text-[var(--color-muted-burgundy)]">
                          Guest could not be deleted
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                          {getApiErrorMessage(deleteGuestMutation.error)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)]">
                      <Trash2 aria-hidden="true" className="size-4" />
                    </span>

                    <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                      This guest record cannot be restored after it has been deleted.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={deleteGuestMutation.isPending}
                      onClick={closeDeleteGuestDialog}
                    >
                      Keep guest
                    </button>

                    <button
                      type="button"
                      className="group/delete-guest-confirm flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--color-muted-burgundy),var(--color-rosewood))] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deleteGuestMutation.isPending}
                      onClick={() => {
                        deleteGuestMutation.mutate();
                      }}
                    >
                      {deleteGuestMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/delete-guest-confirm:scale-105"
                        />
                      )}

                      {deleteGuestMutation.isPending ? 'Deleting guest...' : 'Delete guest'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
