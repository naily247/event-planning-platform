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
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading your packages
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Preparing your services, pricing, and category details.
            </p>
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
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <CircleAlert className="mx-auto size-10 text-[var(--color-rosewood)]" />

            <h1 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Packages unavailable
            </h1>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(
                packagesQuery.error ?? onboardingQuery.error,
                'We could not load your vendor packages.',
              )}
            </p>

            <button
              type="button"
              className="btn-primary mt-6 text-sm font-bold"
              onClick={() => {
                void Promise.all([packagesQuery.refetch(), onboardingQuery.refetch()]);
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                Vendor workspace
              </p>

              <p className="mt-1 font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                Package management
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

            <article className="glass-card p-5">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Package summary</p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/28 p-4">
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {sortedPackages.length}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">Total</p>
                </div>

                <div className="rounded-2xl bg-white/28 p-4">
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {activePackageCount}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">Active</p>
                </div>

                <div className="rounded-2xl bg-white/28 p-4">
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {inactivePackageCount}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">Inactive</p>
                </div>
              </div>
            </article>
          </section>

          {sortedPackages.length > 0 ? (
            <section className="glass-card mt-8 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                  <input
                    type="search"
                    className="form-field pl-11"
                    placeholder="Search packages or categories"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {(['all', 'active', 'inactive'] as const).map((filterOption) => (
                    <button
                      key={filterOption}
                      type="button"
                      onClick={() => setStatusFilter(filterOption)}
                      className={[
                        'rounded-2xl px-4 py-3 text-sm font-black capitalize transition',
                        statusFilter === filterOption
                          ? 'bg-[var(--color-deep-plum)] text-white'
                          : 'border border-white/55 bg-white/28 text-[var(--color-charcoal)] hover:text-[var(--color-deep-plum)]',
                      ].join(' ')}
                    >
                      {filterOption}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {sortedPackages.length === 0 ? (
            <section className="glass-card mt-8 grid min-h-96 place-items-center p-10 text-center">
              <div className="max-w-lg">
                <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <PackagePlus className="size-8" />
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Create your first package
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/64">
                  Add a structured service package so customers can quickly understand what you
                  offer and where your pricing begins.
                </p>

                <button
                  type="button"
                  className="btn-primary mt-7 text-sm font-bold"
                  onClick={openCreateDialog}
                >
                  <PackagePlus className="size-4" />
                  Create package
                </button>
              </div>
            </section>
          ) : filteredPackages.length === 0 ? (
            <section className="glass-card mt-8 grid min-h-72 place-items-center p-10 text-center">
              <div className="max-w-md">
                <Search className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  No matching packages
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/64">
                  Try changing the search term or selecting a different package status.
                </p>
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
