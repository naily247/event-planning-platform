import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CircleAlert,
  Layers3,
  LoaderCircle,
  PackagePlus,
  Pencil,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { DeletePackageDialog } from '../features/packages/components/DeletePackageDialog';
import { PackageForm, type PackageFormValues } from '../features/packages/components/PackageForm';
import { PackageCard } from '../features/packages/components/PackageCard';
import {
  createServicePackage,
  deleteServicePackage,
  getVendorPackages,
  updateServicePackage,
  updateServicePackageStatus,
  type VendorServicePackage,
} from '../features/packages/package.api';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';
import { getVendorOnboardingProfile } from '../features/vendors/vendor.api';

const packageFormSchema = z.object({
  categoryId: z.string().trim().min(1, 'Choose a service category.'),

  title: z
    .string()
    .trim()
    .min(2, 'Title must contain at least 2 characters.')
    .max(120, 'Title must not exceed 120 characters.'),

  description: z.string().trim().max(1000, 'Description must not exceed 1000 characters.'),

  basePrice: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) {
        return true;
      }

      const price = Number(value);

      return Number.isFinite(price) && price >= 0;
    }, 'Enter a valid non-negative price.'),

  isActive: z.boolean(),
});

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
};

const getInitialPackageFormValues = (servicePackage?: VendorServicePackage): PackageFormValues => ({
  categoryId: servicePackage?.category.id ?? '',
  title: servicePackage?.title ?? '',
  description: servicePackage?.description ?? '',
  basePrice: servicePackage?.basePrice ?? '',
  isActive: servicePackage?.isActive ?? true,
});

export function VendorPackagesPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<VendorServicePackage | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<VendorServicePackage | null>(null);
  const [updatingStatusPackageId, setUpdatingStatusPackageId] = useState<string | null>(null);

  const createForm = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: getInitialPackageFormValues(),
  });

  const editForm = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: getInitialPackageFormValues(),
  });

  const packagesQuery = useQuery({
    queryKey: ['packages', 'vendor'],
    queryFn: () => getVendorPackages(),
  });

  const onboardingQuery = useQuery({
    queryKey: ['vendors', 'me', 'onboarding'],
    queryFn: getVendorOnboardingProfile,
  });

  const sortedPackages = useMemo(() => {
    return [...(packagesQuery.data ?? [])].sort(
      (firstPackage, secondPackage) =>
        new Date(secondPackage.createdAt).getTime() - new Date(firstPackage.createdAt).getTime(),
    );
  }, [packagesQuery.data]);

  const filteredPackages = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return sortedPackages.filter((servicePackage) => {
      const matchesSearch =
        !normalizedSearch ||
        servicePackage.title.toLowerCase().includes(normalizedSearch) ||
        servicePackage.category.name.toLowerCase().includes(normalizedSearch) ||
        servicePackage.description?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && servicePackage.isActive) ||
        (statusFilter === 'inactive' && !servicePackage.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, sortedPackages, statusFilter]);

  const createMutation = useMutation({
    mutationFn: (values: PackageFormValues) =>
      createServicePackage({
        categoryId: values.categoryId,
        title: values.title.trim(),
        description: values.description.trim() || null,
        basePrice: values.basePrice.trim() ? Number(values.basePrice) : null,
        isActive: values.isActive,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['packages', 'vendor'],
      });

      createForm.reset(getInitialPackageFormValues());
      setIsCreateDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ packageId, values }: { packageId: string; values: PackageFormValues }) =>
      updateServicePackage(packageId, {
        categoryId: values.categoryId,
        title: values.title.trim(),
        description: values.description.trim() || null,
        basePrice: values.basePrice.trim() ? Number(values.basePrice) : null,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['packages', 'vendor'],
      });

      setEditingPackage(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (servicePackage: VendorServicePackage) =>
      updateServicePackageStatus(servicePackage.id, {
        isActive: !servicePackage.isActive,
      }),

    onMutate: (servicePackage) => {
      setUpdatingStatusPackageId(servicePackage.id);
    },

    onSettled: () => {
      setUpdatingStatusPackageId(null);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['packages', 'vendor'],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteServicePackage,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['packages', 'vendor'],
      });

      setDeletingPackage(null);
    },
  });

  const categories = onboardingQuery.data?.profile.categories ?? [];

  const activePackageCount = sortedPackages.filter(
    (servicePackage) => servicePackage.isActive,
  ).length;

  const inactivePackageCount = sortedPackages.length - activePackageCount;

  const openCreateDialog = () => {
    createMutation.reset();
    createForm.clearErrors();
    createForm.reset(getInitialPackageFormValues());
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createMutation.isPending) {
      return;
    }

    createMutation.reset();
    createForm.clearErrors();
    setIsCreateDialogOpen(false);
  };

  const openEditDialog = (servicePackage: VendorServicePackage) => {
    updateMutation.reset();
    editForm.clearErrors();
    editForm.reset(getInitialPackageFormValues(servicePackage));
    setEditingPackage(servicePackage);
  };

  const closeEditDialog = () => {
    if (updateMutation.isPending) {
      return;
    }

    updateMutation.reset();
    editForm.clearErrors();
    setEditingPackage(null);
  };

  if (packagesQuery.isLoading || onboardingQuery.isLoading) {
    return (
      <div className="app-shell relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute left-[8%] top-16 size-72 rounded-full bg-[rgba(183,167,200,0.24)] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-20 size-80 rounded-full bg-[rgba(175,201,216,0.2)] blur-3xl" />

        <div className="glass-card relative grid min-h-[30rem] w-full max-w-3xl place-items-center overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.15)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-[rgba(214,190,177,0.13)] blur-3xl" />

          <div className="relative max-w-lg">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.35rem] bg-[var(--color-deep-plum)] text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)]">
              <LoaderCircle className="size-7 animate-spin" />
            </div>

            <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
              Loading your packages
            </p>

            <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/62">
              Preparing your service offers, category details, pricing, and publication status.
            </p>

            <div className="mx-auto mt-7 flex max-w-sm items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/55">
                <span className="block h-full w-2/3 animate-pulse rounded-full bg-[var(--color-deep-plum)]" />
              </span>

              <Layers3 className="size-4 text-[var(--color-rosewood)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    packagesQuery.isError ||
    onboardingQuery.isError ||
    !packagesQuery.data ||
    !onboardingQuery.data
  ) {
    return (
      <div className="app-shell relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute left-[8%] top-16 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-20 size-80 rounded-full bg-[rgba(214,190,177,0.18)] blur-3xl" />

        <div className="glass-card relative grid min-h-[30rem] w-full max-w-3xl place-items-center overflow-hidden p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-red-100/65 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl" />

          <div className="relative max-w-xl">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.35rem] bg-[rgba(130,72,77,0.11)] text-[var(--color-rosewood)] shadow-[0_14px_34px_rgba(64,42,51,0.08)]">
              <CircleAlert className="size-7" />
            </div>

            <h1 className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)] sm:text-3xl">
              Packages unavailable
            </h1>

            <p className="mt-4 text-sm leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
              {getErrorMessage(
                packagesQuery.error ?? onboardingQuery.error,
                'We could not load your vendor packages.',
              )}
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                className="btn-primary text-sm font-bold"
                onClick={() => {
                  void Promise.all([packagesQuery.refetch(), onboardingQuery.refetch()]);
                }}
              >
                Try again
              </button>

              <Link to="/vendor/dashboard" className="btn-secondary text-sm font-bold">
                <ArrowLeft className="size-4" />
                Vendor dashboard
              </Link>
            </div>

            <p className="mt-6 text-xs font-semibold text-[var(--color-charcoal)]/46">
              Your saved package data will remain unchanged while you retry.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-[rgba(175,201,216,0.11)] blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/vendor/dashboard"
                className="grid size-11 place-items-center rounded-2xl border border-white/55 bg-white/38 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.1)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/50"
                aria-label="Back to vendor dashboard"
              >
                <ArrowLeft className="size-5" />
              </Link>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                  Vendor workspace
                </p>

                <p className="mt-1 text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                  Package management
                </p>

                <p className="mt-1 text-sm text-[var(--color-charcoal)]/54">
                  Create, refine, and publish customer-ready service offers.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary text-sm font-bold"
              onClick={openCreateDialog}
            >
              <PackagePlus className="size-4" />
              Create package
            </button>
          </div>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <main className="py-10">
          <section className="grid gap-6 lg:grid-cols-[1fr_0.42fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <Layers3 className="size-4" />
                Service packages
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                Turn your services into clear customer-ready offers.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-charcoal)]/70">
                Organise your services, starting prices, and package details so customers can
                understand what you offer before requesting a quotation.
              </p>
            </div>

            <article className="glass-card relative overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-[rgba(183,167,200,0.15)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 left-10 size-32 rounded-full bg-[rgba(214,190,177,0.11)] blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Package summary
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/58">
                      A quick view of your current service offer visibility.
                    </p>
                  </div>

                  <div className="grid size-11 place-items-center rounded-2xl border border-white/60 bg-white/42 text-[var(--color-deep-plum)] shadow-sm">
                    <Layers3 className="size-5" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/55 bg-white/32 p-4 shadow-[0_10px_24px_rgba(31,27,29,0.05)] backdrop-blur-xl">
                    <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                      {sortedPackages.length}
                    </p>

                    <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">Total</p>
                  </div>

                  <div className="rounded-2xl border border-white/55 bg-white/32 p-4 shadow-[0_10px_24px_rgba(31,27,29,0.05)] backdrop-blur-xl">
                    <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                      {activePackageCount}
                    </p>

                    <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">Active</p>
                  </div>

                  <div className="rounded-2xl border border-white/55 bg-white/32 p-4 shadow-[0_10px_24px_rgba(31,27,29,0.05)] backdrop-blur-xl">
                    <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                      {inactivePackageCount}
                    </p>

                    <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">
                      Inactive
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </section>

          {sortedPackages.length > 0 ? (
            <section className="glass-card relative mt-8 overflow-hidden p-4 sm:p-5">
              <div className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-1/3 size-36 rounded-full bg-[rgba(175,201,216,0.1)] blur-3xl" />

              <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <label className="relative block">
                  <span className="sr-only">Search packages</span>

                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                  <input
                    type="search"
                    className="form-field bg-white/38 pl-11 pr-11"
                    placeholder="Search by package title, category, or description"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />

                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--color-charcoal)]/48 transition hover:bg-white/50 hover:text-[var(--color-deep-plum)]"
                      aria-label="Clear package search"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </label>

                <div className="flex flex-wrap gap-2">
                  {(['all', 'active', 'inactive'] as const).map((filterOption) => {
                    const filterCount =
                      filterOption === 'all'
                        ? sortedPackages.length
                        : filterOption === 'active'
                          ? activePackageCount
                          : inactivePackageCount;

                    return (
                      <button
                        key={filterOption}
                        type="button"
                        onClick={() => setStatusFilter(filterOption)}
                        className={[
                          'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black capitalize transition duration-300',
                          statusFilter === filterOption
                            ? 'bg-[var(--color-deep-plum)] text-white shadow-[0_12px_28px_rgba(91,61,82,0.2)]'
                            : 'border border-white/60 bg-white/32 text-[var(--color-charcoal)] hover:-translate-y-0.5 hover:bg-white/46 hover:text-[var(--color-deep-plum)]',
                        ].join(' ')}
                      >
                        {filterOption}

                        <span
                          className={[
                            'rounded-full px-2 py-0.5 text-[0.68rem] font-black',
                            statusFilter === filterOption
                              ? 'bg-white/18 text-white'
                              : 'bg-white/48 text-[var(--color-charcoal)]/58',
                          ].join(' ')}
                        >
                          {filterCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          {sortedPackages.length === 0 ? (
            <section className="glass-card relative mt-8 grid min-h-[28rem] place-items-center overflow-hidden p-8 text-center sm:p-12">
              <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-[rgba(214,190,177,0.13)] blur-3xl" />

              <div className="relative max-w-xl">
                <div className="mx-auto grid size-16 place-items-center rounded-[1.35rem] bg-[var(--color-deep-plum)] text-white shadow-[0_16px_38px_rgba(91,61,82,0.22)]">
                  <PackagePlus className="size-7" />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                  No packages yet
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl">
                  Create your first customer-ready package
                </h2>

                <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                  Add a structured service offer with a category, starting price, and clear
                  description so customers can understand your services before requesting a
                  quotation.
                </p>

                <div className="mx-auto mt-7 grid max-w-lg gap-3 text-left sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/60 bg-white/34 p-4 backdrop-blur-xl">
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Define the service
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/54">
                      Give customers a clear package title.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/60 bg-white/34 p-4 backdrop-blur-xl">
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Set expectations
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/54">
                      Add pricing and package details.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/60 bg-white/34 p-4 backdrop-blur-xl">
                    <p className="text-sm font-black text-[var(--color-near-black)]">
                      Publish when ready
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[var(--color-charcoal)]/54">
                      Control customer visibility anytime.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary mt-8 text-sm font-bold"
                  onClick={openCreateDialog}
                >
                  <PackagePlus className="size-4" />
                  Create first package
                </button>
              </div>
            </section>
          ) : filteredPackages.length === 0 ? (
            <section className="glass-card relative mt-8 grid min-h-80 place-items-center overflow-hidden p-8 text-center sm:p-10">
              <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-[rgba(175,201,216,0.11)] blur-3xl" />

              <div className="relative max-w-md">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.08)]">
                  <Search className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  No matching packages
                </h2>

                <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/64">
                  No packages match your current search and status filter. Clear the filters to view
                  your full package list again.
                </p>

                <button
                  type="button"
                  className="btn-secondary mt-6 text-sm font-bold"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  <X className="size-4" />
                  Clear filters
                </button>
              </div>
            </section>
          ) : (
            <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPackages.map((servicePackage) => (
                <PackageCard
                  key={servicePackage.id}
                  servicePackage={servicePackage}
                  isUpdatingStatus={updatingStatusPackageId === servicePackage.id}
                  isDeleting={deleteMutation.isPending && deletingPackage?.id === servicePackage.id}
                  onEdit={openEditDialog}
                  onToggleStatus={(selectedPackage) => {
                    statusMutation.reset();
                    statusMutation.mutate(selectedPackage);
                  }}
                  onDelete={(selectedPackage) => {
                    deleteMutation.reset();
                    setDeletingPackage(selectedPackage);
                  }}
                />
              ))}
            </section>
          )}

          {statusMutation.isError ? (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-5 py-4 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
            >
              {getErrorMessage(statusMutation.error, 'We could not update the package status.')}
            </div>
          ) : null}
        </main>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-package-title"
        >
          <div className="mx-auto max-w-2xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <PackagePlus className="size-4" />
                    New service package
                  </div>

                  <h2
                    id="create-package-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    Create a customer-ready offer.
                  </h2>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)]"
                  disabled={createMutation.isPending}
                  onClick={closeCreateDialog}
                  aria-label="Close create package dialog"
                >
                  <X className="size-5" />
                </button>
              </div>

              <PackageForm
                mode="create"
                form={createForm}
                categories={categories}
                isSubmitting={createMutation.isPending}
                submissionError={
                  createMutation.isError
                    ? getErrorMessage(
                        createMutation.error,
                        'We could not create this service package.',
                      )
                    : null
                }
                onSubmit={(values) => createMutation.mutate(values)}
                onCancel={closeCreateDialog}
              />
            </div>
          </div>
        </div>
      ) : null}

      {editingPackage ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-package-title"
        >
          <div className="mx-auto max-w-2xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Pencil className="size-4" />
                    Edit service package
                  </div>

                  <h2
                    id="edit-package-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    Refine your package details.
                  </h2>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)]"
                  disabled={updateMutation.isPending}
                  onClick={closeEditDialog}
                  aria-label="Close edit package dialog"
                >
                  <X className="size-5" />
                </button>
              </div>

              <PackageForm
                mode="edit"
                form={editForm}
                categories={categories}
                isSubmitting={updateMutation.isPending}
                submissionError={
                  updateMutation.isError
                    ? getErrorMessage(
                        updateMutation.error,
                        'We could not update this service package.',
                      )
                    : null
                }
                onSubmit={(values) => {
                  updateMutation.mutate({
                    packageId: editingPackage.id,
                    values,
                  });
                }}
                onCancel={closeEditDialog}
              />
            </div>
          </div>
        </div>
      ) : null}

      <DeletePackageDialog
        open={Boolean(deletingPackage)}
        servicePackage={deletingPackage}
        isDeleting={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) {
            return;
          }

          deleteMutation.reset();
          setDeletingPackage(null);
        }}
        onConfirm={() => {
          if (!deletingPackage) {
            return;
          }

          deleteMutation.mutate(deletingPackage.id);
        }}
      />
    </div>
  );
}
