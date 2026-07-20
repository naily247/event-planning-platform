import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CircleAlert,
  ImagePlus,
  Images,
  LoaderCircle,
  Pencil,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import {
  deleteVendorPortfolioItem,
  getVendorPortfolio,
  reorderVendorPortfolioItems,
  updateVendorPortfolioItem,
  uploadVendorPortfolioImage,
  type VendorPortfolioItem,
} from '../features/vendors/vendor.api';
import { VendorWorkspaceNav } from '../features/vendors/components/VendorWorkspaceNav';

const portfolioFormSchema = z.object({
  title: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 2, {
      message: 'Title must contain at least 2 characters.',
    })
    .refine((value) => value.length <= 120, {
      message: 'Title must not exceed 120 characters.',
    }),

  description: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 3, {
      message: 'Description must contain at least 3 characters.',
    })
    .refine((value) => value.length <= 500, {
      message: 'Description must not exceed 500 characters.',
    }),

  displayOrder: z
    .string()
    .trim()
    .refine((value) => {
      const order = Number(value);

      return Number.isInteger(order) && order >= 0 && order <= 1000;
    }, 'Display order must be a whole number between 0 and 1000.'),

  isFeatured: z.boolean(),
});

type PortfolioFormValues = z.infer<typeof portfolioFormSchema>;

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

const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getInitialFormValues = (portfolioItem?: VendorPortfolioItem): PortfolioFormValues => ({
  title: portfolioItem?.title ?? '',
  description: portfolioItem?.description ?? '',
  displayOrder: String(portfolioItem?.displayOrder ?? 0),
  isFeatured: portfolioItem?.isFeatured ?? false,
});

export function VendorPortfolioPage() {
  const queryClient = useQueryClient();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VendorPortfolioItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<VendorPortfolioItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadForm = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: getInitialFormValues(),
  });

  const editForm = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: getInitialFormValues(),
  });

  const portfolioQuery = useQuery({
    queryKey: ['vendors', 'me', 'portfolio'],
    queryFn: getVendorPortfolio,
  });

  const sortedPortfolio = useMemo(() => {
    return [...(portfolioQuery.data ?? [])].sort((first, second) => {
      if (first.displayOrder !== second.displayOrder) {
        return first.displayOrder - second.displayOrder;
      }

      return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
    });
  }, [portfolioQuery.data]);

  useEffect(() => {
    if (!editingItem) {
      return;
    }

    editForm.reset(getInitialFormValues(editingItem));
  }, [editForm, editingItem]);

  const uploadMutation = useMutation({
    mutationFn: async ({ values, file }: { values: PortfolioFormValues; file: File }) =>
      uploadVendorPortfolioImage({
        file,
        title: values.title.trim() || undefined,
        description: values.description.trim() || undefined,
        displayOrder: Number(values.displayOrder),
        isFeatured: values.isFeatured,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'portfolio'],
      });

      uploadForm.reset(getInitialFormValues());
      setSelectedFile(null);
      setIsUploadDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      portfolioItemId,
      values,
    }: {
      portfolioItemId: string;
      values: PortfolioFormValues;
    }) =>
      updateVendorPortfolioItem(portfolioItemId, {
        title: values.title.trim() || null,
        description: values.description.trim() || null,
        displayOrder: Number(values.displayOrder),
        isFeatured: values.isFeatured,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'portfolio'],
      });

      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendorPortfolioItem,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'portfolio'],
      });

      setDeletingItem(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({
      portfolioItemId,
      direction,
    }: {
      portfolioItemId: string;
      direction: 'up' | 'down';
    }) => {
      const currentIndex = sortedPortfolio.findIndex((item) => item.id === portfolioItemId);

      if (currentIndex === -1) {
        return;
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= sortedPortfolio.length) {
        return;
      }

      const reorderedItems = [...sortedPortfolio];

      const currentItem = reorderedItems[currentIndex];
      const targetItem = reorderedItems[targetIndex];

      reorderedItems[currentIndex] = targetItem;
      reorderedItems[targetIndex] = currentItem;

      await reorderVendorPortfolioItems({
        items: reorderedItems.map((item, index) => ({
          portfolioItemId: item.id,
          displayOrder: index,
        })),
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendors', 'me', 'portfolio'],
      });
    },
  });

  const openUploadDialog = () => {
    uploadMutation.reset();
    uploadForm.clearErrors();
    uploadForm.reset(getInitialFormValues());
    setSelectedFile(null);
    setIsUploadDialogOpen(true);
  };

  const closeUploadDialog = () => {
    if (uploadMutation.isPending) {
      return;
    }

    uploadMutation.reset();
    uploadForm.clearErrors();
    setSelectedFile(null);
    setIsUploadDialogOpen(false);
  };

  const closeEditDialog = () => {
    if (updateMutation.isPending) {
      return;
    }

    updateMutation.reset();
    editForm.clearErrors();
    setEditingItem(null);
  };

  const onUpload = uploadForm.handleSubmit((values) => {
    if (!selectedFile) {
      uploadForm.setError('root', {
        type: 'manual',
        message: 'Choose an image before uploading.',
      });

      return;
    }

    uploadMutation.mutate({
      values,
      file: selectedFile,
    });
  });

  const onEdit = editForm.handleSubmit((values) => {
    if (!editingItem) {
      return;
    }

    updateMutation.mutate({
      portfolioItemId: editingItem.id,
      values,
    });
  });

  if (portfolioQuery.isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Loading your portfolio
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Gathering your uploaded work and preparing the portfolio manager.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (portfolioQuery.isError || !portfolioQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <CircleAlert className="mx-auto size-10 text-[var(--color-rosewood)]" />

            <h1 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Portfolio unavailable
            </h1>

            <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
              {getErrorMessage(portfolioQuery.error, 'We could not load your vendor portfolio.')}
            </p>

            <button
              type="button"
              className="btn-primary mt-6 text-sm font-bold"
              onClick={() => {
                void portfolioQuery.refetch();
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const featuredCount = sortedPortfolio.filter((item) => item.isFeatured).length;

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
                Portfolio management
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary text-sm font-bold"
            onClick={openUploadDialog}
          >
            <ImagePlus className="size-4" />
            Upload image
          </button>
        </header>

        <div className="mt-5">
          <VendorWorkspaceNav />
        </div>

        <main className="py-10">
          <section className="grid gap-6 lg:grid-cols-[1fr_0.38fr] lg:items-end">
            <div>
              <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                <Images className="size-4" />
                Portfolio
              </div>

              <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                Show customers what your business does best.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-charcoal)]/70">
                Upload selected work, add meaningful context, organise the display order, and
                feature the images that best represent your services.
              </p>
            </div>

            <article className="glass-card p-5">
              <p className="text-sm font-bold text-[var(--color-charcoal)]/58">Portfolio summary</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/28 p-4">
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {sortedPortfolio.length}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">
                    Total images
                  </p>
                </div>

                <div className="rounded-2xl bg-white/28 p-4">
                  <p className="text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {featuredCount}
                  </p>

                  <p className="mt-1 text-xs font-bold text-[var(--color-charcoal)]/52">Featured</p>
                </div>
              </div>
            </article>
          </section>

          {sortedPortfolio.length === 0 ? (
            <section className="glass-card mt-8 grid min-h-96 place-items-center p-10 text-center">
              <div className="max-w-lg">
                <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <ImagePlus className="size-8" />
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                  Build your visual portfolio
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/64">
                  Upload examples of your work so customers can understand your style before
                  requesting a quotation.
                </p>

                <button
                  type="button"
                  className="btn-primary mt-7 text-sm font-bold"
                  onClick={openUploadDialog}
                >
                  <Upload className="size-4" />
                  Upload your first image
                </button>
              </div>
            </section>
          ) : (
            <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedPortfolio.map((portfolioItem, index) => (
                <article key={portfolioItem.id} className="luxe-card overflow-hidden p-4">
                  <div className="group relative min-h-72 overflow-hidden rounded-[1.5rem] bg-[var(--color-light-champagne)]">
                    <img
                      src={portfolioItem.imageUrl}
                      alt={portfolioItem.title ?? `Vendor portfolio item ${index + 1}`}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.74)] via-transparent to-transparent" />

                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full border border-white/40 bg-white/26 px-3 py-2 text-xs font-black text-white backdrop-blur-xl">
                        Order {portfolioItem.displayOrder}
                      </span>

                      {portfolioItem.isFeatured ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/26 px-3 py-2 text-xs font-black text-white backdrop-blur-xl">
                          <Star className="size-3.5 fill-white" />
                          Featured
                        </span>
                      ) : null}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h2 className="text-xl font-black tracking-[-0.035em] text-white">
                        {portfolioItem.title ?? `Portfolio item ${index + 1}`}
                      </h2>

                      {portfolioItem.description ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/76">
                          {portfolioItem.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[var(--color-charcoal)]/48">
                        {portfolioItem.originalName}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/42">
                        {formatFileSize(portfolioItem.fileSize)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="grid size-10 place-items-center rounded-xl border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Move portfolio item up"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => {
                          reorderMutation.mutate({
                            portfolioItemId: portfolioItem.id,
                            direction: 'up',
                          });
                        }}
                      >
                        <ArrowUp className="size-4" />
                      </button>

                      <button
                        type="button"
                        className="grid size-10 place-items-center rounded-xl border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Move portfolio item down"
                        disabled={index === sortedPortfolio.length - 1 || reorderMutation.isPending}
                        onClick={() => {
                          reorderMutation.mutate({
                            portfolioItemId: portfolioItem.id,
                            direction: 'down',
                          });
                        }}
                      >
                        <ArrowDown className="size-4" />
                      </button>

                      <button
                        type="button"
                        className="grid size-10 place-items-center rounded-xl border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                        aria-label="Edit portfolio item"
                        onClick={() => {
                          updateMutation.reset();
                          setEditingItem(portfolioItem);
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>

                      <button
                        type="button"
                        className="grid size-10 place-items-center rounded-xl border border-[rgba(124,74,90,0.20)] bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
                        aria-label="Delete portfolio item"
                        onClick={() => {
                          deleteMutation.reset();
                          setDeletingItem(portfolioItem);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}

          {reorderMutation.isError ? (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-5 py-4 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
            >
              {getErrorMessage(reorderMutation.error, 'We could not reorder your portfolio.')}
            </div>
          ) : null}
        </main>
      </div>

      {isUploadDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-portfolio-title"
          onClick={closeUploadDialog}
        >
          <div
            className="mx-auto max-w-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <ImagePlus className="size-4" />
                    Add portfolio work
                  </div>

                  <h2
                    id="upload-portfolio-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    Upload a portfolio image.
                  </h2>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)]"
                  disabled={uploadMutation.isPending}
                  onClick={closeUploadDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              <form className="mt-8 grid gap-5" onSubmit={onUpload}>
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Image
                  </span>

                  <input
                    className="form-field"
                    type="file"
                    accept="image/*"
                    disabled={uploadMutation.isPending}
                    onChange={(event) => {
                      setSelectedFile(event.target.files?.[0] ?? null);
                      uploadForm.clearErrors('root');
                    }}
                  />

                  {selectedFile ? (
                    <p className="mt-2 text-sm font-semibold text-[var(--color-deep-plum)]">
                      {selectedFile.name} · {formatFileSize(selectedFile.size)}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Title
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    placeholder="Elegant garden ceremony"
                    disabled={uploadMutation.isPending}
                    {...uploadForm.register('title')}
                  />

                  {uploadForm.formState.errors.title ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {uploadForm.formState.errors.title.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Description
                  </span>

                  <textarea
                    className="form-field min-h-28 resize-y"
                    placeholder="Add useful context about the event, style, or service shown."
                    disabled={uploadMutation.isPending}
                    {...uploadForm.register('description')}
                  />

                  {uploadForm.formState.errors.description ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {uploadForm.formState.errors.description.message}
                    </span>
                  ) : null}
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Display order
                    </span>

                    <input
                      className="form-field"
                      type="number"
                      min="0"
                      max="1000"
                      step="1"
                      disabled={uploadMutation.isPending}
                      {...uploadForm.register('displayOrder')}
                    />

                    {uploadForm.formState.errors.displayOrder ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {uploadForm.formState.errors.displayOrder.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/24 px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-deep-plum)]"
                      disabled={uploadMutation.isPending}
                      {...uploadForm.register('isFeatured')}
                    />

                    <span className="text-sm font-black text-[var(--color-near-black)]">
                      Feature this image
                    </span>
                  </label>
                </div>

                {uploadForm.formState.errors.root?.message ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                  >
                    {uploadForm.formState.errors.root.message}
                  </div>
                ) : null}

                {uploadMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                  >
                    {getErrorMessage(
                      uploadMutation.error,
                      'We could not upload this portfolio image.',
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={uploadMutation.isPending}
                    onClick={closeUploadDialog}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}

                    {uploadMutation.isPending ? 'Uploading...' : 'Upload image'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-portfolio-title"
          onClick={closeEditDialog}
        >
          <div
            className="mx-auto max-w-2xl"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Pencil className="size-4" />
                    Edit portfolio item
                  </div>

                  <h2
                    id="edit-portfolio-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                  >
                    Refine the portfolio details.
                  </h2>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)]"
                  disabled={updateMutation.isPending}
                  onClick={closeEditDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              <form className="mt-8 grid gap-5" onSubmit={onEdit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Title
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    disabled={updateMutation.isPending}
                    {...editForm.register('title')}
                  />

                  {editForm.formState.errors.title ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {editForm.formState.errors.title.message}
                    </span>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Description
                  </span>

                  <textarea
                    className="form-field min-h-28 resize-y"
                    disabled={updateMutation.isPending}
                    {...editForm.register('description')}
                  />

                  {editForm.formState.errors.description ? (
                    <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                      {editForm.formState.errors.description.message}
                    </span>
                  ) : null}
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Display order
                    </span>

                    <input
                      className="form-field"
                      type="number"
                      min="0"
                      max="1000"
                      step="1"
                      disabled={updateMutation.isPending}
                      {...editForm.register('displayOrder')}
                    />

                    {editForm.formState.errors.displayOrder ? (
                      <span className="mt-2 block text-sm font-bold text-[var(--color-muted-burgundy)]">
                        {editForm.formState.errors.displayOrder.message}
                      </span>
                    ) : null}
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/24 px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-deep-plum)]"
                      disabled={updateMutation.isPending}
                      {...editForm.register('isFeatured')}
                    />

                    <span className="text-sm font-black text-[var(--color-near-black)]">
                      Featured image
                    </span>
                  </label>
                </div>

                {updateMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                  >
                    {getErrorMessage(
                      updateMutation.error,
                      'We could not update this portfolio item.',
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={updateMutation.isPending}
                    onClick={closeEditDialog}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}

                    {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {deletingItem ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-portfolio-title"
          onClick={() => {
            if (!deleteMutation.isPending) {
              setDeletingItem(null);
              deleteMutation.reset();
            }
          }}
        >
          <div
            className="glass-card w-full max-w-lg p-6 sm:p-8"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Trash2 className="size-7" />
            </div>

            <h2
              id="delete-portfolio-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Delete this portfolio image?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              This permanently removes{' '}
              <strong>{deletingItem.title ?? deletingItem.originalName}</strong> from your portfolio
              and Cloudinary storage.
            </p>

            {deleteMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getErrorMessage(deleteMutation.error, 'We could not delete this portfolio item.')}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setDeletingItem(null);
                  deleteMutation.reset();
                }}
              >
                Keep image
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deletingItem.id);
                }}
              >
                {deleteMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteMutation.isPending ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
