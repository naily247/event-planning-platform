import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  Send,
  Sparkles,
  UtensilsCrossed,
  UsersRound,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  getPublicInvitation,
  publicRsvpStatuses,
  submitPublicRsvp,
  type PublicInvitation,
  type PublicRsvpStatus,
} from '../features/invitations/invitation.api';
import { InvitationHero } from '../features/events/InvitationHero';
import {
  resolveInvitationTemplate,
  type InvitationFontOption,
} from '../features/events/invitationTemplates';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const publicRsvpSchema = z.object({
  status: z.enum(publicRsvpStatuses),
  partySize: z
    .string()
    .min(1, 'Party size is required.')
    .refine((value) => {
      const partySize = Number(value);

      return Number.isInteger(partySize) && partySize >= 1 && partySize <= 100;
    }, 'Party size must be a whole number between 1 and 100.'),
  mealPreference: z.string().trim().max(100, 'Meal preference cannot exceed 100 characters.'),
  dietaryRequirements: z
    .string()
    .trim()
    .max(500, 'Dietary requirements cannot exceed 500 characters.'),
});

type PublicRsvpFormValues = z.infer<typeof publicRsvpSchema>;

const rsvpLabels: Record<PublicRsvpStatus, string> = {
  CONFIRMED: 'Yes, I’ll be there',
  DECLINED: 'Sorry, I can’t attend',
  MAYBE: 'I might attend',
};

const rsvpDescriptions: Record<PublicRsvpStatus, string> = {
  CONFIRMED: 'Count me in',
  DECLINED: 'Unable to attend',
  MAYBE: 'Still deciding',
};

const rsvpToneClasses: Record<PublicRsvpStatus, string> = {
  CONFIRMED:
    'border-[rgba(89,133,113,0.34)] bg-[linear-gradient(145deg,rgba(89,133,113,0.16),rgba(255,255,255,0.38))] shadow-[0_16px_34px_rgba(63,115,93,0.08)]',
  DECLINED:
    'border-[rgba(130,72,77,0.32)] bg-[linear-gradient(145deg,rgba(130,72,77,0.14),rgba(255,255,255,0.36))] shadow-[0_16px_34px_rgba(130,72,77,0.07)]',
  MAYBE:
    'border-[rgba(93,58,85,0.32)] bg-[linear-gradient(145deg,rgba(93,58,85,0.14),rgba(255,255,255,0.36))] shadow-[0_16px_34px_rgba(93,58,85,0.08)]',
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'Something went wrong. Please try again.'
  );
};

const getInvitationPageFontFamily = (font: string | null | undefined): string => {
  const selectedFont = font as InvitationFontOption | null | undefined;

  switch (selectedFont) {
    case 'classic':
      return '"Times New Roman", Times, serif';

    case 'editorial':
      return 'Georgia, "Times New Roman", serif';

    case 'playful':
      return '"Brush Script MT", "Segoe Script", "Apple Chancery", cursive';

    case 'modern':
    default:
      return 'Aptos, Calibri, "Helvetica Neue", Arial, sans-serif';
  }
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));

const getInitialFormValues = (invitation: PublicInvitation): PublicRsvpFormValues => {
  const initialStatus: PublicRsvpStatus =
    invitation.guest.status === 'CONFIRMED' ||
    invitation.guest.status === 'DECLINED' ||
    invitation.guest.status === 'MAYBE'
      ? invitation.guest.status
      : 'CONFIRMED';

  return {
    status: initialStatus,
    partySize: String(invitation.guest.partySize),
    mealPreference: invitation.guest.mealPreference ?? '',
    dietaryRequirements: invitation.guest.dietaryRequirements ?? '',
  };
};

const hasRsvpChanges = (invitation: PublicInvitation, values: PublicRsvpFormValues) => {
  const nextMealPreference = values.mealPreference.trim() || null;
  const nextDietaryRequirements = values.dietaryRequirements.trim() || null;

  return (
    values.status !== invitation.guest.status ||
    Number(values.partySize) !== invitation.guest.partySize ||
    nextMealPreference !== invitation.guest.mealPreference ||
    nextDietaryRequirements !== invitation.guest.dietaryRequirements
  );
};

export function PublicInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();

  const invitationQuery = useQuery({
    queryKey: ['public', 'invitation', token],
    enabled: Boolean(token),
    queryFn: () => getPublicInvitation(token!),
  });

  const form = useForm<PublicRsvpFormValues>({
    resolver: zodResolver(publicRsvpSchema),
    defaultValues: {
      status: 'CONFIRMED',
      partySize: '1',
      mealPreference: '',
      dietaryRequirements: '',
    },
    values: invitationQuery.data ? getInitialFormValues(invitationQuery.data) : undefined,
  });

  const submitRsvpMutation = useMutation({
    mutationFn: async (values: PublicRsvpFormValues) => {
      if (!token) {
        throw new Error('Invitation token is missing.');
      }

      return submitPublicRsvp(token, {
        status: values.status,
        partySize: Number(values.partySize),
        mealPreference: values.mealPreference.trim() || null,
        dietaryRequirements: values.dietaryRequirements.trim() || null,
      });
    },
    onSuccess: (updatedInvitation) => {
      queryClient.setQueryData(['public', 'invitation', token], updatedInvitation);
      form.reset(getInitialFormValues(updatedInvitation));
    },
  });

  const selectedStatus = form.watch('status');

  const clearSubmissionState = () => {
    submitRsvpMutation.reset();
    form.clearErrors('root');
  };

  if (invitationQuery.isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card relative grid min-h-80 w-full max-w-3xl overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl" />

          <div className="relative m-auto">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.4rem] border border-white/55 bg-white/30 shadow-[0_18px_45px_rgba(31,27,29,0.06)] backdrop-blur-xl">
              <LoaderCircle className="size-8 animate-spin text-[var(--color-deep-plum)]" />
            </div>

            <p className="mt-6 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              Opening your invitation
            </p>

            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
              Loading the celebration details and your RSVP information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (invitationQuery.isError || !token || !invitationQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card relative grid min-h-80 w-full max-w-3xl overflow-hidden p-8 text-center sm:p-10">
          <div className="pointer-events-none absolute right-0 top-0 size-56 rounded-full bg-[rgba(130,72,77,0.12)] blur-3xl" />

          <div className="relative m-auto max-w-lg">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.4rem] bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)] shadow-[0_16px_38px_rgba(130,72,77,0.08)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
              Invitation unavailable
            </p>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {token
                ? getApiErrorMessage(invitationQuery.error)
                : 'This invitation link is incomplete or invalid.'}
            </p>

            {token ? (
              <button
                type="button"
                className="btn-primary mt-7 justify-center text-sm font-bold"
                onClick={() => {
                  void invitationQuery.refetch();
                }}
              >
                <RefreshCcw className="size-4" />
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const invitation = invitationQuery.data;
  const hasResponded = invitation.invitation.hasResponded;

  const selectedInvitationTemplate = resolveInvitationTemplate({
    eventType: invitation.event.eventType,
    invitationTemplate: invitation.event.invitationTemplate,
  });

  const invitationPageBackground =
    invitation.event.invitationArtwork === 2
      ? selectedInvitationTemplate?.backgrounds[0]
      : selectedInvitationTemplate?.backgrounds[1];

  const invitationPageFontFamily = getInvitationPageFontFamily(invitation.event.invitationFont);

  return (
    <div
  className="app-shell relative isolate min-h-screen overflow-hidden px-4 pb-4 pt-2 text-[var(--color-charcoal)] sm:px-6 sm:pb-5 sm:pt-3 lg:px-8"
  style={{
    fontFamily: invitationPageFontFamily,
  }}
>
      {invitationPageBackground ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[5vw] -top-16 -z-20 hidden h-[62rem] w-[76vw] min-w-[58rem] lg:block"
          style={{
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 8%, rgba(0,0,0,0.22) 18%, rgba(0,0,0,0.55) 31%, rgba(0,0,0,0.88) 44%, black 56%, black 100%)',
            maskImage:
              'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 8%, rgba(0,0,0,0.22) 18%, rgba(0,0,0,0.55) 31%, rgba(0,0,0,0.88) 44%, black 56%, black 100%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              WebkitMaskImage:
                'linear-gradient(180deg, black 0%, black 48%, rgba(0,0,0,0.96) 57%, rgba(0,0,0,0.78) 67%, rgba(0,0,0,0.48) 77%, rgba(0,0,0,0.20) 87%, rgba(0,0,0,0.05) 94%, transparent 100%)',
              maskImage:
                'linear-gradient(180deg, black 0%, black 48%, rgba(0,0,0,0.96) 57%, rgba(0,0,0,0.78) 67%, rgba(0,0,0,0.48) 77%, rgba(0,0,0,0.20) 87%, rgba(0,0,0,0.05) 94%, transparent 100%)',
            }}
          >
            <img
              src={invitationPageBackground.imagePath}
              alt=""
              className="absolute inset-0 size-full object-cover"
              style={{
                objectPosition: '72% top',
                opacity: 0.94,
                filter: 'saturate(0.92) contrast(0.97)',
              }}
            />

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,239,233,0.96)_0%,rgba(246,239,233,0.78)_15%,rgba(246,239,233,0.42)_29%,rgba(246,239,233,0.16)_43%,rgba(246,239,233,0.04)_56%,transparent_70%)]" />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_47%,rgba(239,228,219,0.08)_59%,rgba(239,228,219,0.24)_71%,rgba(239,228,219,0.48)_83%,rgba(239,228,219,0.74)_100%)]" />

            <div className="absolute bottom-[4%] left-[8%] h-[40%] w-[96%] bg-[radial-gradient(ellipse_at_bottom,rgba(239,228,219,0.64)_0%,rgba(229,215,207,0.32)_38%,rgba(229,215,207,0.10)_61%,transparent_79%)] blur-3xl" />

            <div className="absolute -right-24 -top-24 size-[32rem] rounded-full bg-[rgba(255,232,215,0.05)] blur-3xl" />
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto w-full max-w-[86rem]">

        <main className="pt-0 pb-3 sm:pb-4">
          <InvitationHero
            eventName={invitation.event.name}
            eventType={invitation.event.eventType}
            invitationTemplate={invitation.event.invitationTemplate}
            invitationArtwork={invitation.event.invitationArtwork}
            invitationFont={invitation.event.invitationFont}
            guestFirstName={invitation.guest.firstName}
            expiresAt={invitation.invitation.expiresAt}
          />

          <section className="mt-5 grid gap-4 xl:grid-cols-[0.72fr_1.28fr] xl:items-stretch">
  <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 xl:grid-rows-[auto_1fr]">
    <article className="glass-card overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.24))] p-5 shadow-[0_20px_48px_rgba(31,27,29,0.06)] backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
            Event details
          </p>

          <h2 className="mt-1.5 text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
            Everything you need to know.
          </h2>

          <p className="mt-1.5 text-[0.7rem] font-semibold leading-4 text-[var(--color-charcoal)]/52">
            Essential details for your arrival.
          </p>
        </div>

        <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/55 bg-white/30 text-[var(--color-rosewood)] shadow-[0_10px_24px_rgba(31,27,29,0.04)]">
          <CalendarDays className="size-4" />
        </div>
      </div>

      <div className="mt-4 grid gap-2.5">
        <div className="rounded-[1.05rem] border border-white/55 bg-white/28 px-3.5 py-3 shadow-[0_8px_20px_rgba(31,27,29,0.03)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(124,74,90,0.10)] text-[var(--color-rosewood)]">
              <CalendarDays className="size-3.5" />
            </div>

            <div className="min-w-0">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                Date & time
              </p>

              <p className="mt-0.5 text-xs font-black leading-4 text-[var(--color-near-black)]">
                {formatDateTime(invitation.event.eventDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <div className="rounded-[1.05rem] border border-white/55 bg-white/28 px-3.5 py-3 shadow-[0_8px_20px_rgba(31,27,29,0.03)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(124,74,90,0.10)] text-[var(--color-rosewood)]">
                <MapPin className="size-3.5" />
              </div>

              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                  Venue
                </p>

                <p className="mt-0.5 truncate text-xs font-black text-[var(--color-near-black)]">
                  {invitation.event.location}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.05rem] border border-white/55 bg-white/28 px-3.5 py-3 shadow-[0_8px_20px_rgba(31,27,29,0.03)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(124,74,90,0.10)] text-[var(--color-rosewood)]">
                <Sparkles className="size-3.5" />
              </div>

              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/42">
                  Theme
                </p>

                <p className="mt-0.5 truncate text-xs font-black text-[var(--color-near-black)]">
                  {invitation.event.theme ?? 'No theme specified'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>

    <article className="group relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-5 text-[#fffaf5] shadow-[0_22px_60px_rgba(93,58,85,0.26)]">
      <div className="pointer-events-none absolute -right-12 -top-14 size-40 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-6 size-36 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-4">
          <div className="grid size-9 place-items-center rounded-xl border border-white/12 bg-white/10 text-[var(--color-powder-blue)] backdrop-blur-xl">
            <UsersRound className="size-4.5" />
          </div>

          <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white/72">
            {invitation.guest.partySize} guest
            {invitation.guest.partySize === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-[0.64rem] font-black uppercase tracking-[0.19em] text-white/48">
            Guest information
          </p>

          <h2 className="mt-1.5 text-xl font-black tracking-[-0.04em]">Your party</h2>

          <p className="mt-2 text-xs font-semibold leading-5 text-white/64">
            Update your party size and share meal preferences or dietary needs so the host can
            plan confidently.
          </p>
        </div>

        <div className="mt-auto pt-4">
          <div className="rounded-[1.1rem] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-xl">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-white/42">
              Invited guest
            </p>

            <p className="mt-1 text-sm font-black">
              {invitation.guest.firstName} {invitation.guest.lastName}
            </p>
          </div>

          {hasResponded ? (
            <div className="mt-2.5 flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/8 px-3.5 py-2.5 text-[0.68rem] font-bold text-white/74 backdrop-blur-xl">
              <CheckCircle2 className="size-3.5 text-[var(--color-powder-blue)]" />
              Current response: {rsvpLabels[invitation.guest.status as PublicRsvpStatus]}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  </aside>

  <article className="glass-card relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
    <div className="pointer-events-none absolute -right-16 top-20 size-56 rounded-full bg-[rgba(183,167,200,0.13)] blur-3xl" />

    <div className="relative">
      {submitRsvpMutation.isSuccess ? (
        <div className="mb-4 rounded-[1.2rem] border border-[rgba(142,151,115,0.28)] bg-[linear-gradient(145deg,rgba(142,151,115,0.16),rgba(255,255,255,0.30))] px-4 py-3 shadow-[0_12px_28px_rgba(61,69,47,0.05)]">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(142,151,115,0.24)] text-[#3d452f]">
              <CheckCircle2 className="size-4" />
            </div>

            <div>
              <p className="text-sm font-black tracking-[-0.02em] text-[var(--color-near-black)]">
                RSVP saved successfully
              </p>

              <p className="mt-0.5 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/56">
                The host has received your latest response and guest information.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
            RSVP
          </p>

          <h2 className="mt-1.5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
            {hasResponded ? 'Update your response.' : 'Will you be joining us?'}
          </h2>

          <p className="mt-1.5 max-w-2xl text-[0.7rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
            Choose the response that best reflects your plans, then confirm your party details.
          </p>
        </div>

        {hasResponded ? (
          <span className="status-chip shrink-0" data-tone="green">
            <Check className="size-3.5" />
            Response on file
          </span>
        ) : null}
      </div>

      <form
        className="mt-4 grid gap-3.5"
        onSubmit={form.handleSubmit((values) => {
          form.clearErrors('root');

          if (!hasRsvpChanges(invitation, values)) {
            form.setError('root', {
              type: 'manual',
              message: 'No RSVP details were changed.',
            });

            return;
          }

          submitRsvpMutation.mutate(values);
        })}
      >
        <fieldset disabled={submitRsvpMutation.isPending}>
          <legend className="mb-2 text-[0.68rem] font-black text-[var(--color-charcoal)]/68">
            Your response
          </legend>

          <div className="grid gap-2.5 sm:grid-cols-3">
            {publicRsvpStatuses.map((status) => {
              const isSelected = selectedStatus === status;

              return (
                <label
                  key={status}
                  className={`group relative cursor-pointer overflow-hidden rounded-[1.05rem] border p-3 transition duration-300 focus-within:ring-2 focus-within:ring-[rgba(93,58,85,0.26)] focus-within:ring-offset-2 focus-within:ring-offset-transparent ${
                    isSelected
                      ? rsvpToneClasses[status]
                      : 'border-white/55 bg-white/24 hover:-translate-y-0.5 hover:bg-white/38 hover:shadow-[0_12px_26px_rgba(31,27,29,0.05)]'
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    value={status}
                    {...form.register('status', {
                      onChange: clearSubmissionState,
                    })}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="block text-xs font-black leading-4 text-[var(--color-near-black)]">
                        {rsvpLabels[status]}
                      </span>

                      <span className="mt-1 block text-[0.6rem] font-bold uppercase tracking-[0.09em] text-[var(--color-charcoal)]/40">
                        {rsvpDescriptions[status]}
                      </span>
                    </div>

                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${
                        isSelected
                          ? 'border-[var(--color-deep-plum)] bg-[var(--color-deep-plum)] text-white'
                          : 'border-[rgba(31,27,29,0.18)] bg-white/30 text-transparent'
                      }`}
                    >
                      <Check className="size-3" />
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-3 lg:grid-cols-[0.68fr_1.32fr] lg:items-stretch">
          <div className="rounded-[1.25rem] border border-white/52 bg-white/18 p-3.5 shadow-[0_10px_26px_rgba(31,27,29,0.03)]">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(93,58,85,0.10)] text-[var(--color-deep-plum)]">
                <UsersRound className="size-3.5" />
              </div>

              <div>
                <p className="text-xs font-black text-[var(--color-near-black)]">Party details</p>
                <p className="text-[0.62rem] font-semibold text-[var(--color-charcoal)]/44">
                  Tell the host who to plan for.
                </p>
              </div>
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-[0.68rem] font-black text-[var(--color-charcoal)]/68">
                Party size
              </span>

              <div className="rounded-[0.95rem] border border-white/55 bg-white/24 p-1 shadow-[0_8px_20px_rgba(31,27,29,0.025)] backdrop-blur-xl transition focus-within:border-[rgba(93,58,85,0.28)] focus-within:bg-white/34">
                <input
                  className="w-full rounded-[0.75rem] border-0 bg-transparent px-3 py-2 text-xs font-bold text-[var(--color-near-black)] outline-none placeholder:text-[var(--color-charcoal)]/32"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  disabled={submitRsvpMutation.isPending}
                  {...form.register('partySize', {
                    onChange: clearSubmissionState,
                  })}
                />
              </div>

              {form.formState.errors.partySize ? (
                <span className="mt-1.5 block text-[0.66rem] font-bold leading-4 text-[var(--color-muted-burgundy)]">
                  {form.formState.errors.partySize.message}
                </span>
              ) : (
                <span className="mt-1.5 block text-[0.6rem] font-semibold leading-3.5 text-[var(--color-charcoal)]/40">
                  Include yourself and everyone attending with you.
                </span>
              )}
            </label>
          </div>

          <div className="rounded-[1.25rem] border border-white/52 bg-white/18 p-3.5 shadow-[0_10px_26px_rgba(31,27,29,0.03)]">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[rgba(124,74,90,0.10)] text-[var(--color-rosewood)]">
                <UtensilsCrossed className="size-3.5" />
              </div>

              <div>
                <p className="text-xs font-black text-[var(--color-near-black)]">
                  Meal information
                </p>

                <p className="text-[0.62rem] font-semibold text-[var(--color-charcoal)]/44">
                  Optional details that help the host prepare.
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-[0.8fr_1.2fr]">
              <label className="block">
                <span className="mb-1.5 block text-[0.68rem] font-black text-[var(--color-charcoal)]/68">
                  Meal preference
                </span>

                <div className="rounded-[0.95rem] border border-white/55 bg-white/24 p-1 shadow-[0_8px_20px_rgba(31,27,29,0.025)] backdrop-blur-xl transition focus-within:border-[rgba(93,58,85,0.28)] focus-within:bg-white/34">
                  <input
                    className="w-full rounded-[0.75rem] border-0 bg-transparent px-3 py-2 text-xs font-bold text-[var(--color-near-black)] outline-none placeholder:text-[var(--color-charcoal)]/32"
                    type="text"
                    placeholder="e.g. Vegetarian"
                    disabled={submitRsvpMutation.isPending}
                    {...form.register('mealPreference', {
                      onChange: clearSubmissionState,
                    })}
                  />
                </div>

                {form.formState.errors.mealPreference ? (
                  <span className="mt-1.5 block text-[0.66rem] font-bold leading-4 text-[var(--color-muted-burgundy)]">
                    {form.formState.errors.mealPreference.message}
                  </span>
                ) : (
                  <span className="mt-1.5 block text-[0.6rem] font-semibold leading-3.5 text-[var(--color-charcoal)]/40">
                    Preferred meal type, if applicable.
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[0.68rem] font-black text-[var(--color-charcoal)]/68">
                  Dietary requirements
                </span>

                <div className="rounded-[0.95rem] border border-white/55 bg-white/24 p-1 shadow-[0_8px_20px_rgba(31,27,29,0.025)] backdrop-blur-xl transition focus-within:border-[rgba(93,58,85,0.28)] focus-within:bg-white/34">
                  <textarea
                    className="min-h-[3.9rem] w-full resize-y rounded-[0.75rem] border-0 bg-transparent px-3 py-2 text-xs font-bold leading-4 text-[var(--color-near-black)] outline-none placeholder:text-[var(--color-charcoal)]/32"
                    placeholder="Share allergies, intolerances or other dietary needs"
                    disabled={submitRsvpMutation.isPending}
                    {...form.register('dietaryRequirements', {
                      onChange: clearSubmissionState,
                    })}
                  />
                </div>

                {form.formState.errors.dietaryRequirements ? (
                  <span className="mt-1.5 block text-[0.66rem] font-bold leading-4 text-[var(--color-muted-burgundy)]">
                    {form.formState.errors.dietaryRequirements.message}
                  </span>
                ) : (
                  <span className="mt-1.5 block text-[0.6rem] font-semibold leading-3.5 text-[var(--color-charcoal)]/40">
                    Shared with the event host.
                  </span>
                )}
              </label>
            </div>
          </div>
        </div>

        {form.formState.errors.root?.message ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-3.5 py-2.5 text-xs font-bold leading-5 text-[var(--color-muted-burgundy)]"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {form.formState.errors.root.message}
          </div>
        ) : null}

        {submitRsvpMutation.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-3.5 py-2.5 text-xs font-bold leading-5 text-[var(--color-muted-burgundy)]"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {getApiErrorMessage(submitRsvpMutation.error)}
          </div>
        ) : null}

        <div className="rounded-[1.15rem] border border-white/52 bg-[linear-gradient(145deg,rgba(255,255,255,0.30),rgba(255,255,255,0.18))] px-4 py-2.5 shadow-[0_10px_26px_rgba(31,27,29,0.03)] sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="mb-3 sm:mb-0">
            <p className="text-[0.68rem] font-black text-[var(--color-near-black)]">
              Ready to send your response?
            </p>

            <p className="mt-0.5 text-[0.6rem] font-semibold leading-3.5 text-[var(--color-charcoal)]/46">
              You can return to this link and update your RSVP before it expires.
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary min-h-10 w-full shrink-0 justify-center rounded-[0.95rem] px-5 text-xs font-black shadow-[0_12px_26px_rgba(93,58,85,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(93,58,85,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
            disabled={submitRsvpMutation.isPending}
          >
            {submitRsvpMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}

            {submitRsvpMutation.isPending
              ? 'Submitting RSVP...'
              : hasResponded
                ? 'Update my RSVP'
                : 'Submit my RSVP'}
          </button>
        </div>
      </form>
    </div>
  </article>
</section>
        </main>
      </div>
    </div>
  );
}
