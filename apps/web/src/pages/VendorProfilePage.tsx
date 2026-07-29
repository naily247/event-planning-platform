import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CircleAlert,
  Clock3,
  ExternalLink,
  Globe2,
  LoaderCircle,
  MapPin,
  Phone,
  Save,
  Send,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { getServiceCategories } from '../features/categories/category.api';
import { VendorProfileHealth } from '../features/vendors/components/VendorProfileHealth';
import { VendorProfileSaveBar } from '../features/vendors/components/VendorProfileSaveBar';
import { VendorPublicPreviewCard } from '../features/vendors/components/VendorPublicPreviewCard';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';
import {
  getVendorOnboardingProfile,
  submitVendorOnboardingProfile,
  updateVendorCategories,
  updateVendorOnboardingProfile,
  type VendorOnboarding,
} from '../features/vendors/vendor.api';
import { PageBackButton } from '../components/navigation/PageBackButton';

const optionalDescriptionSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || value.length >= 20, {
    message: 'Business description must contain at least 20 characters.',
  })
  .refine((value) => value.length <= 2000, {
    message: 'Business description must not exceed 2000 characters.',
  });

const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || /^\+[1-9]\d{7,14}$/.test(value), {
    message: 'Use international format, for example +94771234567.',
  });

const optionalWebsiteSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (value.length === 0) {
      return true;
    }

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, 'Enter a valid website URL.');

const optionalLocationSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || value.length >= 2, {
    message: 'Base location must contain at least 2 characters.',
  })
  .refine((value) => value.length <= 120, {
    message: 'Base location must not exceed 120 characters.',
  });

const vendorProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Business name must contain at least 2 characters.')
    .max(120, 'Business name must not exceed 120 characters.'),

  description: optionalDescriptionSchema,

  contactPhone: optionalPhoneSchema,

  website: optionalWebsiteSchema,

  baseLocation: optionalLocationSchema,

  serviceAreas: z
    .string()
    .trim()
    .refine(
      (value) =>
        value
          .split(',')
          .map((area) => area.trim())
          .filter(Boolean).length <= 20,
      {
        message: 'You can add a maximum of 20 service areas.',
      },
    ),

  categoryIds: z.array(z.string()).max(5, 'You can select a maximum of 5 service categories.'),
});

type VendorProfileFormValues = z.infer<typeof vendorProfileSchema>;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
    details?: {
      incompleteFields?: string[];
    };
  };
};

const vendorLogoMap: Record<string, string> = {
  'luna-frame-studio': '/images/vendors/logos/luna-frame-studio.png',
  'velvet-moments': '/images/vendors/logos/velvet-moments.png',
  'aroma-catering': '/images/vendors/logos/aroma-catering.png',
  'sweet-layers': '/images/vendors/logos/sweet-layers.png',
  'bloom-atelier': '/images/vendors/logos/bloom-atelier.png',
  'echo-entertainment': '/images/vendors/logos/echo-entertainment.png',
  'elite-transport': '/images/vendors/logos/elite-transport.png',
  'grand-horizon-ballroom': '/images/vendors/logos/grand-horizon-ballroom.png',
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
};

const getStatusContent = (status: VendorOnboarding['profile']['verificationStatus']) => {
  switch (status) {
    case 'APPROVED':
      return {
        title: 'Verified vendor',
        description: 'Your business is approved and visible to customers across Eventure.',
        icon: BadgeCheck,
        tone: 'bg-[rgba(142,151,115,0.20)] text-[#3d452f]',
        statusTone: 'success',
        label: 'Approved',
      };

    case 'PENDING':
      return {
        title: 'Profile under review',
        description:
          'Your submitted profile is being reviewed. Editing is temporarily unavailable.',
        icon: Clock3,
        tone: 'bg-[rgba(184,145,87,0.18)] text-[#6f5328]',
        statusTone: 'warning',
        label: 'Pending review',
      };

    case 'REJECTED':
      return {
        title: 'Changes required',
        description:
          'Review the administrator feedback, update your information, and submit again.',
        icon: CircleAlert,
        tone: 'bg-[rgba(142,92,103,0.16)] text-[var(--color-rosewood)]',
        statusTone: 'danger',
        label: 'Needs changes',
      };

    case 'DRAFT':
    default:
      return {
        title: 'Profile in progress',
        description:
          'Complete the information customers need before submitting your business for review.',
        icon: Sparkles,
        tone: 'bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]',
        statusTone: 'plum',
        label: 'Draft',
      };
  }
};

const getServiceAreas = (value: string) =>
  value
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean)
    .filter((area, index, areas) => areas.indexOf(area) === index);

const getInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'EV';

const createVendorSlug = (businessName: string) =>
  businessName
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function VendorProfilePage() {
  const queryClient = useQueryClient();

  const onboardingQuery = useQuery({
    queryKey: ['vendors', 'me', 'onboarding'],
    queryFn: getVendorOnboardingProfile,
  });

  const categoriesQuery = useQuery({
    queryKey: ['service-categories'],
    queryFn: getServiceCategories,
  });

  const form = useForm<VendorProfileFormValues>({
    resolver: zodResolver(vendorProfileSchema),
    defaultValues: {
      businessName: '',
      description: '',
      contactPhone: '',
      website: '',
      baseLocation: '',
      serviceAreas: '',
      categoryIds: [],
    },
  });

  useEffect(() => {
    const onboarding = onboardingQuery.data;

    if (!onboarding) {
      return;
    }

    form.reset({
      businessName: onboarding.profile.businessName,
      description: onboarding.profile.description ?? '',
      contactPhone: onboarding.profile.contactPhone ?? '',
      website: onboarding.profile.website ?? '',
      baseLocation: onboarding.profile.baseLocation ?? '',
      serviceAreas: onboarding.profile.serviceAreas.join(', '),
      categoryIds: onboarding.profile.categories.map((category) => category.id),
    });
  }, [form, onboardingQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: VendorProfileFormValues) => {
      await updateVendorOnboardingProfile({
        businessName: values.businessName.trim(),
        description: values.description.trim() || null,
        contactPhone: values.contactPhone.trim() || null,
        website: values.website.trim() || null,
        baseLocation: values.baseLocation.trim() || null,
        serviceAreas: getServiceAreas(values.serviceAreas),
      });

      if (values.categoryIds.length > 0) {
        await updateVendorCategories({
          categoryIds: values.categoryIds,
        });
      }

      return getVendorOnboardingProfile();
    },

    onSuccess: (onboarding) => {
      queryClient.setQueryData(['vendors', 'me', 'onboarding'], onboarding);

      form.reset({
        businessName: onboarding.profile.businessName,
        description: onboarding.profile.description ?? '',
        contactPhone: onboarding.profile.contactPhone ?? '',
        website: onboarding.profile.website ?? '',
        baseLocation: onboarding.profile.baseLocation ?? '',
        serviceAreas: onboarding.profile.serviceAreas.join(', '),
        categoryIds: onboarding.profile.categories.map((category) => category.id),
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: submitVendorOnboardingProfile,

    onSuccess: (onboarding) => {
      queryClient.setQueryData(['vendors', 'me', 'onboarding'], onboarding);
    },
  });

  const onSave = form.handleSubmit((values) => {
    saveMutation.mutate(values);
  });

  const handleSubmitForReview = () => {
    submitMutation.mutate();
  };

  const handleDiscardChanges = () => {
    const onboarding = onboardingQuery.data;

    if (!onboarding) {
      return;
    }

    form.reset({
      businessName: onboarding.profile.businessName,
      description: onboarding.profile.description ?? '',
      contactPhone: onboarding.profile.contactPhone ?? '',
      website: onboarding.profile.website ?? '',
      baseLocation: onboarding.profile.baseLocation ?? '',
      serviceAreas: onboarding.profile.serviceAreas.join(', '),
      categoryIds: onboarding.profile.categories.map((category) => category.id),
    });

    saveMutation.reset();
  };

  const isLoading = onboardingQuery.isLoading || categoriesQuery.isLoading;
  const loadError = onboardingQuery.error ?? categoriesQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="state-surface w-full max-w-3xl">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading your vendor profile
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Preparing your business details, categories, and verification status.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !onboardingQuery.data || !categoriesQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="state-surface w-full max-w-3xl">
          <div className="max-w-lg">
            <div className="icon-tile mx-auto">
              <CircleAlert className="size-6" />
            </div>

            <h1 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Vendor profile unavailable
            </h1>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(
                loadError,
                'We could not load your vendor profile. Please try again.',
              )}
            </p>

            <button
              type="button"
              className="btn-primary mt-6 text-sm font-bold"
              onClick={() => {
                void Promise.all([onboardingQuery.refetch(), categoriesQuery.refetch()]);
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const onboarding = onboardingQuery.data;
  const categories = categoriesQuery.data;
  const statusContent = getStatusContent(onboarding.profile.verificationStatus);
  const StatusIcon = statusContent.icon;

  const isEditable =
    onboarding.profile.verificationStatus === 'DRAFT' ||
    onboarding.profile.verificationStatus === 'REJECTED';

  const canSubmit =
    onboarding.profile.verificationStatus === 'DRAFT' &&
    onboarding.completion.percentage === 100 &&
    !form.formState.isDirty;

  const selectedCategoryIds = form.watch('categoryIds');
  const watchedDescription = form.watch('description');
  const watchedServiceAreas = form.watch('serviceAreas');

  const descriptionLength = watchedDescription.length;
  const selectedServiceAreas = getServiceAreas(watchedServiceAreas);

  const saveError = saveMutation.isError
    ? getErrorMessage(saveMutation.error, 'We could not save your vendor profile.')
    : null;

  const submitError = submitMutation.isError
    ? getErrorMessage(submitMutation.error, 'We could not submit your profile for review.')
    : null;

  const businessName = onboarding.profile.businessName;
  const businessInitials = getInitials(businessName);
  const businessSlug = createVendorSlug(businessName);
  const businessLogoUrl = vendorLogoMap[businessSlug] ?? null;
  const primaryCategory = onboarding.profile.categories[0]?.name ?? 'Event services';
  const baseLocation = onboarding.profile.baseLocation ?? 'Location not added';

  return (
    <div className="workspace-shell">
      <div className="workspace-container max-w-7xl">
        <header className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageBackButton fallback="/vendor/dashboard" label="Dashboard" className="w-fit" />

            <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
              Vendor workspace
            </p>
          </div>

          <span className="status-chip w-fit" data-tone={statusContent.statusTone}>
            {statusContent.label}
          </span>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <main className="py-10">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(239,229,232,0.58))] px-6 py-10 shadow-[0_28px_70px_rgba(74,52,62,0.12)] sm:px-10 lg:px-12 lg:py-14">
            <div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 left-[38%] size-80 rounded-full bg-[rgba(142,92,103,0.13)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Store className="size-4" />
                  Business profile
                </div>

                <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.96] tracking-[-0.06em] text-[var(--color-near-black)] sm:text-6xl">
                  Shape how customers experience your business.
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Maintain the identity, story, contact details, locations, and services customers
                  use when deciding whether your business is right for their event.
                </p>
              </div>

              <article className="rounded-[1.75rem] border border-white/70 bg-white/58 p-5 shadow-[0_22px_55px_rgba(67,45,56,0.11)] backdrop-blur-xl">
                <div className="flex items-start gap-4">
                  <div
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl ${statusContent.tone}`}
                  >
                    <StatusIcon className="size-6" />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                      Profile status
                    </p>

                    <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                      {statusContent.title}
                    </h2>
                  </div>
                </div>

                <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
                  {statusContent.description}
                </p>

                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                      {onboarding.completion.percentage}%
                    </p>

                    <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">
                      Profile completion
                    </p>
                  </div>

                  <p className="text-sm font-black text-[var(--color-deep-plum)]">
                    {onboarding.completion.percentage < 100
                      ? `${100 - onboarding.completion.percentage}% remaining`
                      : 'Ready for review'}
                  </p>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.10)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] transition-[width] duration-700"
                    style={{
                      width: `${onboarding.completion.percentage}%`,
                    }}
                  />
                </div>
              </article>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/60 bg-white/58 shadow-[0_28px_68px_rgba(62,42,51,0.11)] backdrop-blur-xl">
            <div className="grid lg:grid-cols-[0.7fr_1.3fr]">
              <div className="relative flex min-h-72 flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-7 text-white sm:p-9">
                <div className="pointer-events-none absolute -right-16 -top-12 size-56 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-16 size-56 rounded-full bg-black/10 blur-3xl" />

                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/62">
                    Business identity
                  </p>

                  <div className="mt-7 grid size-24 place-items-center overflow-hidden rounded-full border border-white/25 bg-white p-1.5 shadow-[0_20px_44px_rgba(22,12,18,0.25)]">
                    {businessLogoUrl ? (
                      <img
                        src={businessLogoUrl}
                        alt={`${businessName} logo`}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#8f6277,#58374f)] text-2xl font-black text-white">
                        {businessInitials}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative mt-10">
                  <p className="text-sm font-bold text-white/66">Customer-facing identity</p>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-white/78">
                    This information shapes how customers recognise and understand your business
                    throughout Eventure.
                  </p>
                </div>
              </div>

              <div className="p-7 sm:p-9 lg:p-10">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {businessName}
                      </h2>

                      <span className="status-chip" data-tone={statusContent.statusTone}>
                        {statusContent.label}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="soft-chip text-xs font-black">
                        <Building2 className="size-4" />
                        {primaryCategory}
                      </span>

                      <span className="soft-chip text-xs font-black">
                        <MapPin className="size-4" />
                        {baseLocation}
                      </span>
                    </div>
                  </div>

                  {onboarding.profile.verificationStatus === 'APPROVED' ? (
                    <Link
                      to={`/vendors/${onboarding.profile.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary w-fit text-sm font-bold"
                    >
                      View public profile
                      <ExternalLink className="size-4" />
                    </Link>
                  ) : null}
                </div>

                <div className="mt-8">
                  <VendorPublicPreviewCard
                    businessName={businessName}
                    slug={onboarding.profile.slug}
                    logoUrl={businessLogoUrl}
                    initials={businessInitials}
                    categoryName={primaryCategory}
                    baseLocation={baseLocation}
                    verificationStatus={onboarding.profile.verificationStatus}
                    description={onboarding.profile.description}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6">
            <VendorProfileHealth
              businessName={onboarding.profile.businessName}
              description={onboarding.profile.description}
              contactPhone={onboarding.profile.contactPhone}
              website={onboarding.profile.website}
              baseLocation={onboarding.profile.baseLocation}
              serviceAreas={onboarding.profile.serviceAreas}
              categoryCount={onboarding.profile.categories.length}
              completionPercentage={onboarding.completion.percentage}
            />
          </div>

          {onboarding.profile.rejectionReason ? (
            <section className="feedback-surface mt-6" data-tone="danger">
              <div>
                <p className="text-sm font-black">Administrator feedback</p>

                <p className="mt-2 leading-7">{onboarding.profile.rejectionReason}</p>
              </div>
            </section>
          ) : null}

          <form className="mt-6 grid gap-6" onSubmit={onSave}>
            <section className="workspace-panel">
              <div className="grid gap-8 lg:grid-cols-[0.34fr_0.66fr]">
                <div>
                  <p className="section-eyebrow">Business story</p>

                  <h2 className="section-title">Introduce your business</h2>

                  <p className="section-description">
                    Give customers a clear name and a useful description of your experience,
                    services, approach, and style.
                  </p>
                </div>

                <div className="grid gap-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Business name
                    </span>

                    <span className="relative block">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !pl-12 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
                        type="text"
                        aria-invalid={Boolean(form.formState.errors.businessName)}
                        disabled={!isEditable || saveMutation.isPending}
                        {...form.register('businessName')}
                      />
                    </span>

                    {form.formState.errors.businessName ? (
                      <span className="field-error block">
                        {form.formState.errors.businessName.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center justify-between gap-4">
                      <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                        Business description
                      </span>

                      <span
                        className={
                          descriptionLength > 2000
                            ? 'text-xs font-black text-[var(--color-rosewood)]'
                            : 'text-xs font-bold text-[var(--color-charcoal)]/42'
                        }
                      >
                        {descriptionLength}/2000
                      </span>
                    </span>

                    <textarea
                      className="form-field min-h-44 resize-y disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
                      placeholder="Describe your experience, style, services, and what makes your business distinctive."
                      aria-invalid={Boolean(form.formState.errors.description)}
                      disabled={!isEditable || saveMutation.isPending}
                      {...form.register('description')}
                    />

                    <span className="mt-2 flex flex-col gap-1">
                      <span className="text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        Mention your experience, event types, service style, and what makes your
                        business distinctive.
                      </span>

                      {isEditable && descriptionLength > 0 && descriptionLength < 20 ? (
                        <span className="text-xs font-black text-[var(--color-rosewood)]">
                          Add at least {20 - descriptionLength} more characters.
                        </span>
                      ) : null}
                    </span>

                    {form.formState.errors.description ? (
                      <span className="field-error block">
                        {form.formState.errors.description.message}
                      </span>
                    ) : null}
                  </label>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="workspace-panel">
                <div>
                  <p className="section-eyebrow">Contact information</p>

                  <h2 className="section-title">How customers can reach you</h2>

                  <p className="section-description">
                    Keep your direct contact details accurate and professional.
                  </p>
                </div>

                <div className="mt-7 grid gap-5">
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between gap-4">
                      <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                        Contact phone
                      </span>

                      {!onboarding.profile.contactPhone ? (
                        <span className="rounded-full bg-[rgba(142,92,103,0.11)] px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[var(--color-rosewood)]">
                          Missing
                        </span>
                      ) : null}
                    </span>

                    <span className="relative block">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !pl-12 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
                        type="tel"
                        placeholder="+94771234567"
                        aria-invalid={Boolean(form.formState.errors.contactPhone)}
                        disabled={!isEditable || saveMutation.isPending}
                        {...form.register('contactPhone')}
                      />
                    </span>

                    <span className="mt-2 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      Use international format so customers can contact your business reliably.
                    </span>

                    {form.formState.errors.contactPhone ? (
                      <span className="field-error block">
                        {form.formState.errors.contactPhone.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Website
                    </span>

                    <span className="relative block">
                      <Globe2 className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !pl-12 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
                        type="url"
                        placeholder="https://example.com"
                        aria-invalid={Boolean(form.formState.errors.website)}
                        disabled={!isEditable || saveMutation.isPending}
                        {...form.register('website')}
                      />
                    </span>

                    {form.formState.errors.website ? (
                      <span className="field-error block">
                        {form.formState.errors.website.message}
                      </span>
                    ) : null}
                  </label>
                </div>
              </div>

              <div className="workspace-panel">
                <div>
                  <p className="section-eyebrow">Business presence</p>

                  <h2 className="section-title">Where you provide services</h2>

                  <p className="section-description">
                    Help customers understand your primary location and the areas you cover.
                  </p>
                </div>

                <div className="mt-7 grid gap-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Base location
                    </span>

                    <span className="relative block">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !pl-12 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
                        type="text"
                        placeholder="Colombo"
                        aria-invalid={Boolean(form.formState.errors.baseLocation)}
                        disabled={!isEditable || saveMutation.isPending}
                        {...form.register('baseLocation')}
                      />
                    </span>

                    {form.formState.errors.baseLocation ? (
                      <span className="field-error block">
                        {form.formState.errors.baseLocation.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center justify-between gap-4">
                      <span className="text-sm font-black text-[var(--color-charcoal)]/72">
                        Service areas
                      </span>

                      <span className="text-xs font-bold text-[var(--color-charcoal)]/42">
                        {selectedServiceAreas.length}/20
                      </span>
                    </span>

                    <input
                      className="form-field disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
                      type="text"
                      placeholder="Colombo, Gampaha, Kandy"
                      aria-invalid={Boolean(form.formState.errors.serviceAreas)}
                      disabled={!isEditable || saveMutation.isPending}
                      {...form.register('serviceAreas')}
                    />

                    <span className="mt-2 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                      Separate multiple areas using commas.
                    </span>

                    {selectedServiceAreas.length > 0 ? (
                      <span className="mt-4 flex flex-wrap gap-2">
                        {selectedServiceAreas.map((area) => (
                          <span
                            key={area}
                            className="inline-flex items-center gap-2 rounded-full border border-[rgba(93,58,85,0.12)] bg-[rgba(93,58,85,0.07)] px-3 py-1.5 text-xs font-black text-[var(--color-deep-plum)]"
                          >
                            <MapPin className="size-3.5" />
                            {area}

                            {isEditable ? (
                              <button
                                type="button"
                                className="grid size-5 place-items-center rounded-full text-[var(--color-charcoal)]/45 transition hover:bg-white/70 hover:text-[var(--color-rosewood)]"
                                aria-label={`Remove ${area}`}
                                onClick={() => {
                                  const remainingAreas = selectedServiceAreas.filter(
                                    (serviceArea) => serviceArea !== area,
                                  );

                                  form.setValue('serviceAreas', remainingAreas.join(', '), {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                              >
                                <X className="size-3" />
                              </button>
                            ) : null}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-[rgba(93,58,85,0.16)] bg-white/20 px-4 py-3 text-xs font-semibold text-[var(--color-charcoal)]/52">
                        <MapPin className="size-4 text-[var(--color-deep-plum)]/60" />
                        No additional service areas have been added.
                      </span>
                    )}

                    {form.formState.errors.serviceAreas ? (
                      <span className="field-error block">
                        {form.formState.errors.serviceAreas.message}
                      </span>
                    ) : null}
                  </label>
                </div>
              </div>
            </section>

            <section className="workspace-panel">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="section-eyebrow">Service categories</p>

                  <h2 className="section-title">What does your business provide?</h2>

                  <p className="section-description">
                    Select up to five categories. These help customers discover your business in the
                    marketplace.
                  </p>
                </div>

                <span className="soft-chip w-fit text-xs font-black">
                  {selectedCategoryIds.length}/5 selected
                </span>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => {
                  const isSelected = selectedCategoryIds.includes(category.id);

                  return (
                    <label
                      key={category.id}
                      className={
                        !isEditable
                          ? isSelected
                            ? 'rounded-2xl border border-[rgba(93,58,85,0.20)] bg-[rgba(93,58,85,0.08)] p-4'
                            : 'rounded-2xl border border-white/45 bg-white/16 p-4 opacity-55'
                          : isSelected
                            ? 'cursor-pointer rounded-2xl border border-[rgba(93,58,85,0.30)] bg-[rgba(93,58,85,0.11)] p-4 shadow-[0_12px_28px_rgba(72,49,61,0.08)] transition hover:-translate-y-0.5'
                            : 'cursor-pointer rounded-2xl border border-white/55 bg-white/24 p-4 transition hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.16)] hover:bg-white/42'
                      }
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        value={category.id}
                        disabled={
                          !isEditable ||
                          saveMutation.isPending ||
                          (!isSelected && selectedCategoryIds.length >= 5)
                        }
                        {...form.register('categoryIds')}
                      />

                      <span className="flex items-center justify-between gap-3">
                        <span>
                          <span className="block text-sm font-black text-[var(--color-near-black)]">
                            {category.name}
                          </span>

                          <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--color-charcoal)]/50">
                            Helps customers discover this service
                          </span>
                        </span>

                        <span
                          className={
                            isSelected
                              ? 'grid size-8 place-items-center rounded-xl bg-[var(--color-deep-plum)] text-white'
                              : 'grid size-8 place-items-center rounded-xl bg-white/38 text-transparent'
                          }
                        >
                          <Check className="size-4" />
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {form.formState.errors.categoryIds ? (
                <p className="field-error mt-4">{form.formState.errors.categoryIds.message}</p>
              ) : null}
            </section>

            {saveError || submitError ? (
              <div role="alert" className="feedback-surface" data-tone="danger">
                {saveError ?? submitError}
              </div>
            ) : null}

            {saveMutation.isSuccess ? (
              <div className="feedback-surface" data-tone="success">
                Your vendor profile was saved successfully.
              </div>
            ) : null}

            <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-white shadow-[0_26px_60px_rgba(75,44,62,0.22)] sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/58">
                    Profile controls
                  </p>

                  <p className="mt-3 text-xl font-black">
                    {isEditable
                      ? form.formState.isDirty
                        ? 'You have unsaved profile changes.'
                        : 'Your latest profile changes are saved.'
                      : 'This profile is currently locked for editing.'}
                  </p>

                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/68">
                    {onboarding.profile.verificationStatus === 'APPROVED'
                      ? onboarding.completion.percentage < 100
                        ? 'Your business is approved. Add the remaining details later to strengthen the information customers see.'
                        : 'Your approved business profile contains all recommended information.'
                      : onboarding.profile.verificationStatus === 'PENDING'
                        ? 'Your information is temporarily locked while the Eventure team reviews your submission.'
                        : onboarding.profile.verificationStatus === 'REJECTED'
                          ? 'Update the requested information, save your changes, and submit the profile again.'
                          : 'A draft profile must reach 100% completion before it can be submitted for verification.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {isEditable ? (
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black !text-[var(--color-deep-plum)] shadow-[0_14px_32px_rgba(28,15,23,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                      disabled={
                        saveMutation.isPending ||
                        submitMutation.isPending ||
                        !form.formState.isDirty
                      }
                    >
                      {saveMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}

                      {saveMutation.isPending ? 'Saving...' : 'Save profile'}
                    </button>
                  ) : null}

                  {onboarding.profile.verificationStatus === 'DRAFT' ? (
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/32 bg-white/10 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                      disabled={!canSubmit || saveMutation.isPending || submitMutation.isPending}
                      onClick={handleSubmitForReview}
                    >
                      {submitMutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}

                      {submitMutation.isPending ? 'Submitting...' : 'Submit for review'}
                    </button>
                  ) : null}

                  {onboarding.profile.verificationStatus === 'APPROVED' ? (
                    <Link
                      to={`/vendors/${onboarding.profile.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/32 bg-white/10 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/16"
                    >
                      View public profile
                      <ExternalLink className="size-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          </form>
        </main>
      </div>

      <VendorProfileSaveBar
        isVisible={isEditable && form.formState.isDirty && !submitMutation.isPending}
        isSaving={saveMutation.isPending}
        isDisabled={saveMutation.isPending || submitMutation.isPending || !form.formState.isDirty}
        onSave={() => {
          void onSave();
        }}
        onDiscard={handleDiscardChanges}
      />
    </div>
  );
}
