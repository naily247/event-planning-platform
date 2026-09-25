import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
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
import {
  getVendorOnboardingProfile,
  getVendorPortfolio,
  submitVendorOnboardingProfile,
  updateVendorCategories,
  updateVendorOnboardingProfile,
  type VendorOnboarding,
} from '../features/vendors/vendor.api';

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

  const portfolioQuery = useQuery({
    queryKey: ['vendors', 'me', 'portfolio'],
    queryFn: getVendorPortfolio,
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

  const isLoading =
    onboardingQuery.isLoading || categoriesQuery.isLoading || portfolioQuery.isLoading;

  const loadError = onboardingQuery.error ?? categoriesQuery.error ?? portfolioQuery.error;

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

  if (loadError || !onboardingQuery.data || !categoriesQuery.data || !portfolioQuery.data) {
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
                void Promise.all([
                  onboardingQuery.refetch(),
                  categoriesQuery.refetch(),
                  portfolioQuery.refetch(),
                ]);
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

  const portfolioItems = portfolioQuery.data;

  const featuredPortfolioItem =
    portfolioItems.find((item) => item.isFeatured) ??
    [...portfolioItems].sort((a, b) => a.displayOrder - b.displayOrder)[0] ??
    null;

  return (
    <div className="workspace-shell relative">
      <div className="workspace-container max-w-7xl">
        <main className="pb-8 pt-4">
          <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/62 bg-[linear-gradient(132deg,rgba(255,255,255,0.76)_0%,rgba(246,239,241,0.67)_52%,rgba(229,221,237,0.58)_100%)] shadow-[0_20px_58px_rgba(64,42,51,0.09)] backdrop-blur-2xl">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
            />

            <div className="relative grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-6 lg:py-5">
              <div className="min-w-0">
                <div className="soft-chip w-fit text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--color-deep-plum)]">
                  <Store className="size-3.5" />
                  Business profile
                </div>

                <h1 className="mt-3 max-w-3xl text-balance text-[2rem] font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-[2.25rem]">
                  Shape how customers experience your business.
                </h1>

                <p className="mt-2.5 max-w-2xl text-sm font-medium leading-6 text-[var(--color-charcoal)]/64">
                  Maintain the identity, contact details, locations, and services customers use when
                  considering your business.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="soft-chip text-xs font-black">
                    <Building2 className="size-3.5" />
                    {businessName}
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <Store className="size-3.5" />
                    {primaryCategory}
                  </span>

                  <span className="soft-chip text-xs font-black">
                    <MapPin className="size-3.5" />
                    {baseLocation}
                  </span>
                </div>
              </div>

              <article className="rounded-[1.4rem] border border-white/70 bg-white/50 p-4 shadow-[0_14px_38px_rgba(31,27,29,0.07)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${statusContent.tone}`}
                    >
                      <StatusIcon className="size-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.17em] text-[var(--color-rosewood)]">
                        Profile status
                      </p>

                      <p className="mt-0.5 text-base font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                        {statusContent.title}
                      </p>
                    </div>
                  </div>

                  <span className="status-chip shrink-0" data-tone={statusContent.statusTone}>
                    {statusContent.label}
                  </span>
                </div>

                <p className="mt-2.5 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/58">
                  {statusContent.description}
                </p>

                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                      Profile completion
                    </p>

                    <p className="mt-0.5 text-2xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                      {onboarding.completion.percentage}%
                    </p>
                  </div>

                  <p className="pb-0.5 text-right text-[0.65rem] font-black text-[var(--color-deep-plum)]">
                    {onboarding.completion.percentage < 100
                      ? `${100 - onboarding.completion.percentage}% remaining`
                      : onboarding.profile.verificationStatus === 'APPROVED'
                        ? 'Profile complete'
                        : 'Ready for review'}
                  </p>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(93,58,85,0.09)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),var(--color-valendor-lilac))] transition-[width] duration-700"
                    style={{
                      width: `${onboarding.completion.percentage}%`,
                    }}
                  />
                </div>
              </article>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/58 shadow-[0_18px_48px_rgba(62,42,51,0.08)] backdrop-blur-xl">
            <div className="grid lg:grid-cols-[0.42fr_0.58fr]">
              <div className="relative flex min-h-[25rem] flex-col overflow-hidden bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-5 text-white">
                <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl" />

                <div className="relative flex shrink-0 items-center gap-3">
                  <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/25 bg-white p-1">
                    {businessLogoUrl ? (
                      <img
                        src={businessLogoUrl}
                        alt={`${businessName} logo`}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#8f6277,#58374f)] text-sm font-black text-white">
                        {businessInitials}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-white/55">
                      Customer-facing identity
                    </p>

                    <p className="mt-1 truncate text-base font-black tracking-[-0.03em]">
                      {businessName}
                    </p>

                    <p className="mt-0.5 text-xs font-semibold text-white/60">
                      {primaryCategory} · {baseLocation}
                    </p>
                  </div>
                </div>

                <div className="relative mt-4 flex min-h-0 flex-1">
                  {featuredPortfolioItem ? (
                    <div className="group relative min-h-[18rem] w-full flex-1 overflow-hidden rounded-[1.2rem] border border-white/18 bg-black/10">
                      <img
                        src={featuredPortfolioItem.imageUrl}
                        alt={
                          featuredPortfolioItem.title
                            ? featuredPortfolioItem.title
                            : `${businessName} featured portfolio work`
                        }
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                      />

                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(24,13,20,0.82)_100%)]" />

                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="text-[0.58rem] font-black uppercase tracking-[0.17em] text-white/62">
                            {featuredPortfolioItem.isFeatured ? 'Featured work' : 'Portfolio work'}
                          </p>

                          <p className="mt-1 truncate text-sm font-black text-white">
                            {featuredPortfolioItem.title ?? 'Selected portfolio work'}
                          </p>
                        </div>

                        <Link
                          to="/vendor/portfolio"
                          className="shrink-0 rounded-full border border-white/24 bg-white/14 px-3 py-2 text-[0.65rem] font-black text-white backdrop-blur-md transition hover:bg-white/22"
                        >
                          View portfolio
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-[18rem] w-full flex-1 place-items-center rounded-[1.2rem] border border-dashed border-white/22 bg-white/[0.06] px-4 text-center">
                      <div>
                        <Sparkles className="mx-auto size-4 text-white/70" />

                        <p className="mt-2 text-xs font-black text-white">
                          Your portfolio will appear here.
                        </p>

                        <Link
                          to="/vendor/portfolio"
                          className="mt-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.65rem] font-black text-white transition hover:bg-white/16"
                        >
                          Manage portfolio
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Public profile preview
                    </p>

                    <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                      What customers currently see
                    </h2>
                  </div>

                  {onboarding.profile.verificationStatus === 'APPROVED' ? (
                    <Link
                      to={`/vendors/${onboarding.profile.slug}`}
                      state={{
                        source: 'vendor-profile',
                        returnTo: '/vendor/profile',
                        returnLabel: 'Back to business profile',
                      }}
                      className="btn-secondary w-fit text-xs font-bold"
                    >
                      View public profile
                      <ExternalLink className="size-3.5" />
                    </Link>
                  ) : null}
                </div>

                <div className="mt-3">
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

          <div className="mt-4">
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

          <form className="mt-4 grid gap-4" onSubmit={onSave}>
            <section className="workspace-panel !p-4 sm:!px-5 sm:!py-4">
              <div className="grid gap-4 lg:grid-cols-[0.28fr_0.72fr] lg:items-start">
                <div className="lg:pt-0.5">
                  <p className="section-eyebrow">Business story</p>

                  <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Introduce your business
                  </h2>

                  <p className="mt-1.5 max-w-sm text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                    Give customers a clear name and useful description of your experience, services,
                    approach, and style.
                  </p>
                </div>

                <div className="grid gap-2.5">
                  <label className="block">
                    <span className="mb-1 block text-[0.7rem] font-black text-[var(--color-charcoal)]/68">
                      Business name
                    </span>

                    <span className="relative block">
                      <Building2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !min-h-10 !py-2 !pl-10 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
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
                    <span className="mb-1 flex items-center justify-between gap-4">
                      <span className="text-[0.7rem] font-black text-[var(--color-charcoal)]/68">
                        Business description
                      </span>

                      <span
                        className={
                          descriptionLength > 2000
                            ? 'text-[0.68rem] font-black text-[var(--color-rosewood)]'
                            : 'text-[0.68rem] font-bold text-[var(--color-charcoal)]/42'
                        }
                      >
                        {descriptionLength}/2000
                      </span>
                    </span>

                    <textarea
                      className="form-field min-h-[4.25rem] resize-y !py-2.5 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
                      placeholder="Describe your experience, style, services, and what makes your business distinctive."
                      aria-invalid={Boolean(form.formState.errors.description)}
                      disabled={!isEditable || saveMutation.isPending}
                      {...form.register('description')}
                    />

                    <span className="mt-1 flex flex-col gap-0.5">
                      <span className="text-[0.65rem] font-semibold leading-4 text-[var(--color-charcoal)]/44">
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

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="workspace-panel !p-4 sm:!p-5">
                <div className="flex flex-col gap-1">
                  <p className="section-eyebrow">Contact information</p>

                  <h2 className="text-lg font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    How customers can reach you
                  </h2>

                  <p className="text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                    Keep your direct contact details accurate and professional.
                  </p>
                </div>

                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="mb-1 flex items-center justify-between gap-4">
                      <span className="text-[0.7rem] font-black text-[var(--color-charcoal)]/68">
                        Contact phone
                      </span>

                      {!onboarding.profile.contactPhone ? (
                        <span className="rounded-full bg-[rgba(142,92,103,0.11)] px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--color-rosewood)]">
                          Missing
                        </span>
                      ) : null}
                    </span>

                    <span className="relative block">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !min-h-10 !py-2 !pl-10 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
                        type="tel"
                        placeholder="+94771234567"
                        aria-invalid={Boolean(form.formState.errors.contactPhone)}
                        disabled={!isEditable || saveMutation.isPending}
                        {...form.register('contactPhone')}
                      />
                    </span>

                    <span className="mt-1 block text-[0.64rem] font-semibold leading-4 text-[var(--color-charcoal)]/46">
                      Use international format so customers can contact your business reliably.
                    </span>

                    {form.formState.errors.contactPhone ? (
                      <span className="field-error block">
                        {form.formState.errors.contactPhone.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[0.7rem] font-black text-[var(--color-charcoal)]/68">
                      Website
                    </span>

                    <span className="relative block">
                      <Globe2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !min-h-10 !py-2 !pl-10 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
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

              <div className="workspace-panel !p-4 sm:!p-5">
                <div className="flex flex-col gap-1">
                  <p className="section-eyebrow">Business presence</p>

                  <h2 className="text-lg font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    Where you provide services
                  </h2>

                  <p className="text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                    Help customers understand your primary location and the areas you cover.
                  </p>
                </div>

                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[0.7rem] font-black text-[var(--color-charcoal)]/68">
                      Base location
                    </span>

                    <span className="relative block">
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !min-h-10 !py-2 !pl-10 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
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
                    <span className="mb-1 flex items-center justify-between gap-4">
                      <span className="text-[0.7rem] font-black text-[var(--color-charcoal)]/68">
                        Service areas
                      </span>

                      <span className="text-[0.68rem] font-bold text-[var(--color-charcoal)]/42">
                        {selectedServiceAreas.length}/20
                      </span>
                    </span>

                    <input
                      className="form-field !min-h-10 !py-2 disabled:cursor-not-allowed disabled:border-[rgba(64,51,56,0.08)] disabled:bg-[rgba(227,230,232,0.58)] disabled:text-[var(--color-charcoal)]/62 disabled:opacity-100"
                      type="text"
                      placeholder="Colombo, Gampaha, Kandy"
                      aria-invalid={Boolean(form.formState.errors.serviceAreas)}
                      disabled={!isEditable || saveMutation.isPending}
                      {...form.register('serviceAreas')}
                    />

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[0.64rem] font-semibold text-[var(--color-charcoal)]/46">
                        Separate using commas.
                      </span>

                      {selectedServiceAreas.length > 0 ? (
                        selectedServiceAreas.map((area) => (
                          <span
                            key={area}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(93,58,85,0.12)] bg-[rgba(93,58,85,0.07)] px-2.5 py-1 text-[0.65rem] font-black text-[var(--color-deep-plum)]"
                          >
                            <MapPin className="size-3" />
                            {area}

                            {isEditable ? (
                              <button
                                type="button"
                                className="grid size-4 place-items-center rounded-full text-[var(--color-charcoal)]/45 transition hover:bg-white/70 hover:text-[var(--color-rosewood)]"
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
                                <X className="size-2.5" />
                              </button>
                            ) : null}
                          </span>
                        ))
                      ) : (
                        <span className="text-[0.65rem] font-semibold text-[var(--color-charcoal)]/48">
                          No additional service areas added.
                        </span>
                      )}
                    </div>

                    {form.formState.errors.serviceAreas ? (
                      <span className="field-error block">
                        {form.formState.errors.serviceAreas.message}
                      </span>
                    ) : null}
                  </label>
                </div>
              </div>
            </section>

            <section className="workspace-panel !p-4 sm:!px-5 sm:!py-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <p className="section-eyebrow">Service categories</p>

                  <h2 className="mt-1 text-lg font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                    What does your business provide?
                  </h2>

                  <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/50">
                    Select up to five categories customers can use to discover your business.
                  </p>
                </div>

                <span className="soft-chip w-fit !px-3 !py-1.5 text-[0.68rem] font-black">
                  {selectedCategoryIds.length}/5 selected
                </span>
              </div>

              <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((category) => {
                  const isSelected = selectedCategoryIds.includes(category.id);

                  return (
                    <label
                      key={category.id}
                      className={
                        !isEditable
                          ? isSelected
                            ? 'flex min-h-10 items-center justify-between gap-2 rounded-xl border border-[rgba(93,58,85,0.20)] bg-[rgba(93,58,85,0.08)] px-3 py-2'
                            : 'flex min-h-10 items-center justify-between gap-2 rounded-xl border border-white/45 bg-white/16 px-3 py-2 opacity-50'
                          : isSelected
                            ? 'flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-xl border border-[rgba(93,58,85,0.30)] bg-[rgba(93,58,85,0.11)] px-3 py-2 shadow-[0_6px_18px_rgba(72,49,61,0.06)] transition hover:-translate-y-0.5'
                            : 'flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/55 bg-white/24 px-3 py-2 transition hover:border-[rgba(93,58,85,0.16)] hover:bg-white/42'
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

                      <span className="min-w-0 truncate text-[0.7rem] font-black text-[var(--color-near-black)]">
                        {category.name}
                      </span>

                      <span
                        className={
                          isSelected
                            ? 'grid size-5 shrink-0 place-items-center rounded-md bg-[var(--color-deep-plum)] text-white'
                            : 'grid size-5 shrink-0 place-items-center rounded-md bg-white/38 text-transparent'
                        }
                      >
                        <Check className="size-3" />
                      </span>
                    </label>
                  );
                })}
              </div>

              {form.formState.errors.categoryIds ? (
                <p className="field-error mt-2">{form.formState.errors.categoryIds.message}</p>
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

            <section className="overflow-hidden rounded-[1.6rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] px-5 py-4 text-white shadow-[0_18px_46px_rgba(75,44,62,0.18)] sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/58">
                    Profile controls
                  </p>

                  <p className="mt-1.5 text-base font-black">
                    {isEditable
                      ? form.formState.isDirty
                        ? 'You have unsaved profile changes.'
                        : 'Your latest profile changes are saved.'
                      : 'This profile is currently locked for editing.'}
                  </p>

                  <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-white/66">
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
                      state={{
                        source: 'vendor-profile',
                        returnTo: '/vendor/profile',
                        returnLabel: 'Back to business profile',
                      }}
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
