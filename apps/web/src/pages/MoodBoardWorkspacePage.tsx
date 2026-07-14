import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CircleAlert,
  ExternalLink,
  Image,
  Images,
  Link2,
  LoaderCircle,
  Palette,
  Plus,
  Search,
  Sparkles,
  Store,
  Save,
  Upload,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createMoodBoardItem,
  createMoodBoardItemWithUpload,
  getMoodBoardItems,
  getMoodBoardSummary,
  moodBoardCategories,
  updateMoodBoardItem,
  deleteMoodBoardItem,
  type MoodBoardCategory,
  type MoodBoardItem,
  type MoodBoardSort,
} from '../features/moodBoards/moodBoard.api';
import { getPublicVendors, type PublicVendor } from '../features/vendors/vendor.api';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type MoodBoardCreationMode = 'upload' | 'url';

const categoryLabels: Record<MoodBoardCategory, string> = {
  DECORATION: 'Decoration',
  FLOWERS: 'Flowers',
  OUTFIT: 'Outfit',
  CAKE: 'Cake',
  INVITATION: 'Invitation',
  PHOTOGRAPHY: 'Photography',
  VENUE: 'Venue',
  TABLE_SETTING: 'Table setting',
  COLOR_PALETTE: 'Colour palette',
  ENTERTAINMENT: 'Entertainment',
  OTHER: 'Other',
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return 'We could not load this mood board. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load this mood board. Please try again.'
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const getEventStatusTone = (status: string) => {
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

export function MoodBoardWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();

  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<MoodBoardCreationMode>('upload');

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MoodBoardCategory>('OTHER');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [colorTagsInput, setColorTagsInput] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [itemToEdit, setItemToEdit] = useState<MoodBoardItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MoodBoardItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MoodBoardCategory | ''>('');
  const [visualFilter, setVisualFilter] = useState<'all' | 'images' | 'sources'>('all');
  const [sort, setSort] = useState<MoodBoardSort>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!selectedImage) {
      setSelectedImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedImage);

    setSelectedImagePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedImage]);

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'mood-board', 'summary'],
    enabled: Boolean(eventId),
    queryFn: () => getMoodBoardSummary(eventId!),
  });

  const itemsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'mood-board',
      'items',
      {
        page,
        search: searchQuery,
        category: categoryFilter,
        visualFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getMoodBoardItems(eventId!, {
        page,
        limit: 20,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        hasImage: visualFilter === 'images' ? true : undefined,
        hasSource: visualFilter === 'sources' ? true : undefined,
        sort,
      }),
  });

  const vendorsQuery = useQuery({
    queryKey: ['public', 'vendors', 'mood-board-options'],
    queryFn: () =>
      getPublicVendors({
        page: 1,
        limit: 50,
        sort: 'name_asc',
      }),
  });

  const getColorTags = () => [
    ...new Set(
      colorTagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];

  const createMoodBoardItemMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim();
      const normalizedImageUrl = imageUrl.trim();
      const normalizedSourceUrl = sourceUrl.trim();
      const colorTags = getColorTags();

      if (!normalizedTitle) {
        throw new Error('Enter a title for this inspiration item.');
      }

      if (normalizedTitle.length > 150) {
        throw new Error('Title cannot exceed 150 characters.');
      }

      if (normalizedDescription.length > 2000) {
        throw new Error('Description cannot exceed 2000 characters.');
      }

      if (colorTags.length > 20) {
        throw new Error('A mood-board item cannot contain more than 20 colour tags.');
      }

      if (colorTags.some((tag) => tag.length > 50)) {
        throw new Error('Each colour tag cannot exceed 50 characters.');
      }

      if (creationMode === 'upload') {
        if (!selectedImage) {
          throw new Error('Choose an image to upload.');
        }

        return createMoodBoardItemWithUpload(eventId, {
          image: selectedImage,
          title: normalizedTitle,
          description: normalizedDescription || null,
          category,
          sourceUrl: normalizedSourceUrl || null,
          colorTags,
          vendorId: vendorId || null,
        });
      }

      if (!normalizedImageUrl && !normalizedSourceUrl) {
        throw new Error('Enter either an image URL or a source URL.');
      }

      return createMoodBoardItem(eventId, {
        title: normalizedTitle,
        description: normalizedDescription || null,
        category,
        imageUrl: normalizedImageUrl || null,
        sourceUrl: normalizedSourceUrl || null,
        colorTags,
        vendorId: vendorId || null,
      });
    },

    onSuccess: async () => {
      setIsCreateDialogOpen(false);
      setCreationMode('upload');
      setSelectedImage(null);
      setSelectedImagePreviewUrl(null);
      setTitle('');
      setDescription('');
      setCategory('OTHER');
      setImageUrl('');
      setSourceUrl('');
      setColorTagsInput('');
      setVendorId('');

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'items'],
        }),
      ]);
    },
  });

  const updateMoodBoardItemMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !itemToEdit) {
        throw new Error('Mood-board item details are missing.');
      }

      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim() || null;
      const normalizedImageUrl = imageUrl.trim() || null;
      const normalizedSourceUrl = sourceUrl.trim() || null;
      const colorTags = getColorTags();

      if (!normalizedTitle) {
        throw new Error('Enter a title for this inspiration item.');
      }

      if (normalizedTitle.length > 150) {
        throw new Error('Title cannot exceed 150 characters.');
      }

      if (description.trim().length > 2000) {
        throw new Error('Description cannot exceed 2000 characters.');
      }

      if (!normalizedImageUrl && !normalizedSourceUrl) {
        throw new Error('The item must keep either an image URL or a source URL.');
      }

      if (colorTags.length > 20) {
        throw new Error('A mood-board item cannot contain more than 20 colour tags.');
      }

      if (colorTags.some((tag) => tag.length > 50)) {
        throw new Error('Each colour tag cannot exceed 50 characters.');
      }

      const input: {
        title?: string;
        description?: string | null;
        category?: MoodBoardCategory;
        imageUrl?: string | null;
        sourceUrl?: string | null;
        colorTags?: string[];
        vendorId?: string | null;
      } = {};

      if (normalizedTitle !== itemToEdit.title) {
        input.title = normalizedTitle;
      }

      if (normalizedDescription !== itemToEdit.description) {
        input.description = normalizedDescription;
      }

      if (category !== itemToEdit.category) {
        input.category = category;
      }

      if (normalizedImageUrl !== itemToEdit.imageUrl) {
        input.imageUrl = normalizedImageUrl;
      }

      if (normalizedSourceUrl !== itemToEdit.sourceUrl) {
        input.sourceUrl = normalizedSourceUrl;
      }

      const currentColorTags = [...itemToEdit.colorTags].sort();
      const nextColorTags = [...colorTags].sort();

      if (JSON.stringify(currentColorTags) !== JSON.stringify(nextColorTags)) {
        input.colorTags = colorTags;
      }

      const normalizedVendorId = vendorId || null;

      if (normalizedVendorId !== itemToEdit.vendorId) {
        input.vendorId = normalizedVendorId;
      }

      if (Object.keys(input).length === 0) {
        throw new Error('No inspiration details were changed.');
      }

      return updateMoodBoardItem(eventId, itemToEdit.id, input);
    },

    onSuccess: async () => {
      setItemToEdit(null);
      setIsEditDialogOpen(false);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'items'],
        }),
      ]);
    },
  });

  const deleteMoodBoardItemMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !itemToDelete) {
        throw new Error('Mood-board item details are missing.');
      }

      await deleteMoodBoardItem(eventId, itemToDelete.id);
    },

    onSuccess: async () => {
      setItemToDelete(null);
      setIsDeleteDialogOpen(false);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'summary'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'mood-board', 'items'],
        }),
      ]);
    },
  });

  const openDeleteDialog = (item: MoodBoardItem) => {
    deleteMoodBoardItemMutation.reset();
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleteMoodBoardItemMutation.isPending) {
      return;
    }

    deleteMoodBoardItemMutation.reset();
    setItemToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const openEditDialog = (item: MoodBoardItem) => {
    updateMoodBoardItemMutation.reset();

    setItemToEdit(item);
    setTitle(item.title);
    setDescription(item.description ?? '');
    setCategory(item.category);
    setImageUrl(item.imageUrl ?? '');
    setSourceUrl(item.sourceUrl ?? '');
    setColorTagsInput(item.colorTags.join(', '));
    setVendorId(item.vendorId ?? '');
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    if (updateMoodBoardItemMutation.isPending) {
      return;
    }

    updateMoodBoardItemMutation.reset();
    setItemToEdit(null);
    setIsEditDialogOpen(false);
  };

  const openCreateDialog = () => {
    createMoodBoardItemMutation.reset();
    setCreationMode('upload');
    setSelectedImage(null);
    setSelectedImagePreviewUrl(null);
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setImageUrl('');
    setSourceUrl('');
    setColorTagsInput('');
    setVendorId('');
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createMoodBoardItemMutation.isPending) {
      return;
    }

    createMoodBoardItemMutation.reset();
    setSelectedImage(null);
    setSelectedImagePreviewUrl(null);
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setImageUrl('');
    setSourceUrl('');
    setColorTagsInput('');
    setVendorId('');
    setCreationMode('upload');
    setIsCreateDialogOpen(false);
  };

  const submitSearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategoryFilter('');
    setVisualFilter('all');
    setSort('newest');
    setPage(1);
  };

  const isLoading = summaryQuery.isLoading || itemsQuery.isLoading;
  const isError = summaryQuery.isError || itemsQuery.isError;
  const firstError = summaryQuery.error ?? itemsQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening your mood board
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading inspiration, colour ideas and visual references.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !summaryQuery.data || !itemsQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Mood board unavailable
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
                    void Promise.all([summaryQuery.refetch(), itemsQuery.refetch()]);
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

  const moodBoardSummary = summaryQuery.data;
  const items = itemsQuery.data.items;
  const pagination = itemsQuery.data.pagination;

  const activeCategoryCount = Object.values(moodBoardSummary.summary.categoryCounts).filter(
    (count) => count > 0,
  ).length;

  const filtersAreActive =
    Boolean(searchQuery) || Boolean(categoryFilter) || visualFilter !== 'all' || sort !== 'newest';

  const summaryCards = [
    {
      label: 'Inspiration items',
      value: moodBoardSummary.summary.totalItems,
      helper: `${activeCategoryCount} active categories`,
      icon: Images,
    },
    {
      label: 'Visual references',
      value: moodBoardSummary.summary.itemsWithImages,
      helper: 'Items with saved images',
      icon: Image,
    },
    {
      label: 'External sources',
      value: moodBoardSummary.summary.itemsWithSources,
      helper: 'Items with reference links',
      icon: Link2,
    },
    {
      label: 'Linked vendors',
      value: moodBoardSummary.summary.linkedVendorItems,
      helper: 'Ideas connected to vendors',
      icon: Store,
    },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/events/${eventId}`}
              className="grid size-11 place-items-center rounded-2xl border border-white/45 bg-white/30 text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(31,27,29,0.10)] backdrop-blur-xl"
              aria-label="Back to event workspace"
            >
              <ArrowLeft className="size-5" />
            </Link>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                Mood board
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {moodBoardSummary.event.name}
              </h1>
            </div>
          </div>

          <span
            className="status-chip w-fit"
            data-tone={getEventStatusTone(moodBoardSummary.event.status)}
          >
            {moodBoardSummary.event.status.replaceAll('_', ' ')}
          </span>
        </header>

        <main className="py-10">
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-[7%] top-8 h-72 w-72 rounded-full bg-[rgba(183,167,200,0.28)] blur-3xl" />
            <div className="pointer-events-none absolute right-[8%] top-14 h-80 w-80 rounded-full bg-[rgba(175,201,216,0.24)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
              <div>
                <div className="soft-chip mb-6 w-fit text-xs font-black uppercase tracking-[0.24em] text-[var(--color-deep-plum)]">
                  <Sparkles className="size-4" />
                  Creative direction
                </div>

                <h2 className="max-w-4xl text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-6xl">
                  Shape the look and feeling of your event.
                </h2>

                <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-charcoal)]/70">
                  Collect inspiration, save visual references, organise colour ideas and connect
                  creative decisions to trusted vendors.
                </p>
              </div>

              <div className="glass-card p-5">
                <Palette className="size-6 text-[var(--color-deep-plum)]" />

                <p className="mt-6 text-sm font-bold text-[var(--color-charcoal)]/58">Event date</p>

                <p className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  {formatEventDate(moodBoardSummary.event.eventDate)}
                </p>

                <p className="mt-3 text-sm font-semibold text-[var(--color-rosewood)]">
                  {moodBoardSummary.summary.totalItems} ideas collected
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label, value, helper, icon: Icon }) => (
              <article key={label} className="luxe-card p-6">
                <div className="grid size-11 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)]">
                  <Icon className="size-5" />
                </div>

                <p className="mt-8 text-sm font-bold text-[var(--color-charcoal)]/58">{label}</p>

                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {value}
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-charcoal)]/55">
                  {helper}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.28fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Inspiration board
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Ideas collected for this celebration.
                  </h2>
                </div>

                <button
                  type="button"
                  className="btn-primary shrink-0 text-sm font-bold"
                  onClick={openCreateDialog}
                >
                  <Plus className="size-4" />
                  Add inspiration
                </button>
              </div>

              <form
                className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitSearch();
                }}
              >
                <div className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/24 px-4 backdrop-blur-xl">
                  <Search className="size-5 shrink-0 text-[var(--color-charcoal)]/42" />

                  <input
                    className="min-h-12 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--color-charcoal)]/42"
                    type="search"
                    placeholder="Search titles, descriptions, sources or vendors"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                    }}
                  />
                </div>

                <select
                  className="form-field min-h-12 lg:w-48"
                  aria-label="Filter mood-board items by category"
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value as MoodBoardCategory | '');
                    setPage(1);
                  }}
                >
                  <option value="">All categories</option>

                  {moodBoardCategories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12 lg:w-44"
                  aria-label="Filter mood-board items by reference type"
                  value={visualFilter}
                  onChange={(event) => {
                    setVisualFilter(event.target.value as 'all' | 'images' | 'sources');
                    setPage(1);
                  }}
                >
                  <option value="all">All references</option>
                  <option value="images">With images</option>
                  <option value="sources">With source links</option>
                </select>

                <select
                  className="form-field min-h-12 lg:w-48"
                  aria-label="Sort mood-board items"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as MoodBoardSort);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title_asc">Title A–Z</option>
                  <option value="title_desc">Title Z–A</option>
                  <option value="category_asc">Category A–Z</option>
                  <option value="category_desc">Category Z–A</option>
                </select>

                <div className="flex flex-wrap gap-3 lg:col-span-4">
                  <button type="submit" className="btn-primary text-sm font-bold">
                    <Search className="size-4" />
                    Search
                  </button>

                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </form>

              {items.length > 0 ? (
                <div className="mt-8 columns-1 gap-5 sm:columns-2 xl:columns-3">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="mb-5 break-inside-avoid overflow-hidden rounded-[1.5rem] border border-white/55 bg-white/24 backdrop-blur-2xl"
                    >
                      {item.imageUrl ? (
                        <img
                          className="aspect-[4/3] w-full object-cover"
                          src={item.imageUrl}
                          alt={item.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid aspect-[4/3] place-items-center bg-[linear-gradient(135deg,rgba(183,167,200,0.28),rgba(175,201,216,0.24))]">
                          <Link2 className="size-9 text-[var(--color-deep-plum)]" />
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                              {item.title}
                            </p>

                            <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                              {categoryLabels[item.category]}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.sourceUrl ? (
                              <a
                                className="grid size-9 place-items-center rounded-full border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.16)]"
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open source for ${item.title}`}
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            ) : null}

                            <button
                              type="button"
                              className="grid size-9 place-items-center rounded-full border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] transition hover:bg-[rgba(93,58,85,0.16)]"
                              aria-label={`Edit ${item.title}`}
                              onClick={() => {
                                openEditDialog(item);
                              }}
                            >
                              <Pencil className="size-4" />
                            </button>

                            <button
                              type="button"
                              className="grid size-9 place-items-center rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] transition hover:bg-[rgba(124,74,90,0.16)]"
                              aria-label={`Delete ${item.title}`}
                              onClick={() => {
                                openDeleteDialog(item);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        {item.description ? (
                          <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64">
                            {item.description}
                          </p>
                        ) : null}

                        {item.colorTags.length > 0 ? (
                          <div className="mt-5 flex flex-wrap gap-2">
                            {item.colorTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/60 bg-white/30 px-3 py-1 text-xs font-black text-[var(--color-deep-plum)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {item.vendor ? (
                          <Link
                            className="mt-5 flex items-center gap-2 rounded-2xl bg-white/28 px-4 py-3 text-sm font-black text-[var(--color-deep-plum)] transition hover:bg-white/38"
                            to={`/vendors/${item.vendor.slug}`}
                          >
                            <Store className="size-4" />
                            {item.vendor.businessName}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <Palette className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    {filtersAreActive
                      ? 'No inspiration matches these filters'
                      : 'No inspiration added yet'}
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    {filtersAreActive
                      ? 'Try changing the search term or mood-board filters.'
                      : 'Add your first visual reference, source link or creative idea.'}
                  </p>
                  {filtersAreActive ? (
                    <button
                      type="button"
                      className="btn-secondary mt-5 text-sm font-bold"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary mt-5 text-sm font-bold"
                      onClick={openCreateDialog}
                    >
                      <Plus className="size-4" />
                      Add inspiration
                    </button>
                  )}
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} items)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || itemsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || itemsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => currentPage + 1);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </article>

            <aside className="space-y-5">
              <article className="rounded-[2rem] bg-[linear-gradient(135deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)]">
                <Palette className="size-6 text-[var(--color-powder-blue)]" />

                <h2 className="mt-8 text-3xl font-black tracking-[-0.045em]">
                  Creative categories
                </h2>

                <p className="mt-3 leading-7 text-white/68">
                  See which areas of the event already have saved inspiration.
                </p>

                <div className="mt-8 space-y-3">
                  {moodBoardCategories
                    .filter((category) => moodBoardSummary.summary.categoryCounts[category] > 0)
                    .map((category) => (
                      <div
                        key={category}
                        className="flex items-center justify-between rounded-2xl bg-white/14 px-4 py-3 backdrop-blur"
                      >
                        <span className="text-sm font-bold text-white/72">
                          {categoryLabels[category]}
                        </span>

                        <span className="text-lg font-black">
                          {moodBoardSummary.summary.categoryCounts[category]}
                        </span>
                      </div>
                    ))}

                  {activeCategoryCount === 0 ? (
                    <p className="rounded-2xl bg-white/12 px-4 py-4 text-sm font-semibold leading-6 text-white/64">
                      Categories will appear here after inspiration items are added.
                    </p>
                  ) : null}
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>
      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-mood-board-item-title"
        >
          <div className="mx-auto max-w-3xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Palette className="size-4" />
                    New inspiration
                  </div>

                  <h2
                    id="create-mood-board-item-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    Add an idea to your mood board.
                  </h2>

                  <p className="mt-3 max-w-xl leading-7 text-[var(--color-charcoal)]/66">
                    Upload an image or save a visual reference from another website.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close inspiration form"
                  disabled={createMoodBoardItemMutation.isPending}
                  onClick={closeCreateDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 rounded-[1.5rem] border border-white/55 bg-white/20 p-2">
                <button
                  type="button"
                  className={
                    creationMode === 'upload'
                      ? 'flex items-center justify-center gap-2 rounded-2xl bg-[rgba(93,58,85,0.92)] px-4 py-3 text-sm font-black text-white'
                      : 'flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-[var(--color-charcoal)]/66 transition hover:bg-white/30'
                  }
                  disabled={createMoodBoardItemMutation.isPending}
                  onClick={() => {
                    createMoodBoardItemMutation.reset();
                    setImageUrl('');
                    setCreationMode('upload');
                  }}
                >
                  <Upload className="size-4" />
                  Upload image
                </button>

                <button
                  type="button"
                  className={
                    creationMode === 'url'
                      ? 'flex items-center justify-center gap-2 rounded-2xl bg-[rgba(93,58,85,0.92)] px-4 py-3 text-sm font-black text-white'
                      : 'flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-[var(--color-charcoal)]/66 transition hover:bg-white/30'
                  }
                  disabled={createMoodBoardItemMutation.isPending}
                  onClick={() => {
                    createMoodBoardItemMutation.reset();
                    setSelectedImage(null);
                    setSelectedImagePreviewUrl(null);
                    setCreationMode('url');
                  }}
                >
                  <Link2 className="size-4" />
                  Use URL
                </button>
              </div>

              <div className="mt-6 grid gap-5">
                {creationMode === 'upload' ? (
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Inspiration image
                    </span>

                    <div className="rounded-[1.5rem] border border-dashed border-[rgba(93,58,85,0.28)] bg-white/20 p-5">
                      <input
                        className="block w-full text-sm font-semibold text-[var(--color-charcoal)]/66 file:mr-4 file:rounded-xl file:border-0 file:bg-[rgba(93,58,85,0.12)] file:px-4 file:py-2 file:text-sm file:font-black file:text-[var(--color-deep-plum)]"
                        type="file"
                        accept="image/*"
                        disabled={createMoodBoardItemMutation.isPending}
                        onChange={(event) => {
                          createMoodBoardItemMutation.reset();
                          setSelectedImage(event.target.files?.[0] ?? null);
                        }}
                      />

                      {selectedImage && selectedImagePreviewUrl ? (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white/24">
                          <img
                            src={selectedImagePreviewUrl}
                            alt="Selected inspiration preview"
                            className="aspect-[16/9] w-full object-cover"
                          />

                          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                                {selectedImage.name}
                              </p>

                              <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/52">
                                {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>

                            <button
                              type="button"
                              className="btn-secondary shrink-0 justify-center text-sm font-bold"
                              disabled={createMoodBoardItemMutation.isPending}
                              onClick={() => {
                                createMoodBoardItemMutation.reset();
                                setSelectedImage(null);
                                setSelectedImagePreviewUrl(null);
                              }}
                            >
                              <X className="size-4" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                          Choose a supported image from your device.
                        </p>
                      )}
                    </div>
                  </label>
                ) : (
                  <>
                    <label>
                      <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                        Image URL
                      </span>

                      <input
                        className="form-field"
                        type="url"
                        placeholder="https://example.com/inspiration.jpg"
                        value={imageUrl}
                        disabled={createMoodBoardItemMutation.isPending}
                        onChange={(event) => {
                          createMoodBoardItemMutation.reset();
                          setImageUrl(event.target.value);
                        }}
                      />
                    </label>

                    <p className="-mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      At least one image URL or source URL must be provided.
                    </p>
                  </>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Title
                    </span>

                    <input
                      className="form-field"
                      type="text"
                      maxLength={150}
                      value={title}
                      disabled={createMoodBoardItemMutation.isPending}
                      onChange={(event) => {
                        createMoodBoardItemMutation.reset();
                        setTitle(event.target.value);
                      }}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Category
                    </span>

                    <select
                      className="form-field"
                      value={category}
                      disabled={createMoodBoardItemMutation.isPending}
                      onChange={(event) => {
                        createMoodBoardItemMutation.reset();
                        setCategory(event.target.value as MoodBoardCategory);
                      }}
                    >
                      {moodBoardCategories.map((itemCategory) => (
                        <option key={itemCategory} value={itemCategory}>
                          {categoryLabels[itemCategory]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Description
                  </span>

                  <textarea
                    className="form-field min-h-28 resize-y"
                    maxLength={2000}
                    value={description}
                    disabled={createMoodBoardItemMutation.isPending}
                    onChange={(event) => {
                      createMoodBoardItemMutation.reset();
                      setDescription(event.target.value);
                    }}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Source URL
                  </span>

                  <input
                    className="form-field"
                    type="url"
                    placeholder="https://example.com/reference"
                    value={sourceUrl}
                    disabled={createMoodBoardItemMutation.isPending}
                    onChange={(event) => {
                      createMoodBoardItemMutation.reset();
                      setSourceUrl(event.target.value);
                    }}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Optional when uploading an image. Useful for crediting or revisiting the
                    original inspiration.
                  </p>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Colour tags
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    placeholder="Ivory, sage green, gold"
                    value={colorTagsInput}
                    disabled={createMoodBoardItemMutation.isPending}
                    onChange={(event) => {
                      createMoodBoardItemMutation.reset();
                      setColorTagsInput(event.target.value);
                    }}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Separate multiple colour names or codes with commas.
                  </p>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Linked vendor
                  </span>

                  <select
                    className="form-field"
                    value={vendorId}
                    disabled={createMoodBoardItemMutation.isPending || vendorsQuery.isLoading}
                    onChange={(event) => {
                      createMoodBoardItemMutation.reset();
                      setVendorId(event.target.value);
                    }}
                  >
                    <option value="">
                      {vendorsQuery.isLoading ? 'Loading vendors...' : 'No linked vendor'}
                    </option>

                    {(vendorsQuery.data?.vendors ?? []).map((vendor: PublicVendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.businessName}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Optional. Link this inspiration to a vendor from the marketplace.
                  </p>
                </label>

                {vendorsQuery.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(vendorsQuery.error)}
                  </div>
                ) : null}

                {createMoodBoardItemMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {createMoodBoardItemMutation.error instanceof Error &&
                    !axios.isAxiosError(createMoodBoardItemMutation.error)
                      ? createMoodBoardItemMutation.error.message
                      : getApiErrorMessage(createMoodBoardItemMutation.error)}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={createMoodBoardItemMutation.isPending}
                    onClick={closeCreateDialog}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={createMoodBoardItemMutation.isPending}
                    onClick={() => {
                      createMoodBoardItemMutation.mutate();
                    }}
                  >
                    {createMoodBoardItemMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}

                    {createMoodBoardItemMutation.isPending
                      ? creationMode === 'upload'
                        ? 'Uploading inspiration...'
                        : 'Saving inspiration...'
                      : 'Add inspiration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {isEditDialogOpen && itemToEdit ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.48)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-mood-board-item-title"
        >
          <div className="mx-auto max-w-3xl">
            <div className="glass-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                    <Pencil className="size-4" />
                    Edit inspiration
                  </div>

                  <h2
                    id="edit-mood-board-item-title"
                    className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)] sm:text-4xl"
                  >
                    Refine this mood-board idea.
                  </h2>

                  <p className="mt-3 max-w-xl leading-7 text-[var(--color-charcoal)]/66">
                    Update the visual reference, creative notes, category or colour direction.
                  </p>
                </div>

                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-white/55 bg-white/28 text-[var(--color-charcoal)] transition hover:text-[var(--color-deep-plum)]"
                  aria-label="Close edit inspiration form"
                  disabled={updateMoodBoardItemMutation.isPending}
                  onClick={closeEditDialog}
                >
                  <X className="size-5" />
                </button>
              </div>

              {itemToEdit.imagePublicId ? (
                <div className="mt-7 rounded-2xl border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/68">
                  This image was uploaded to the platform. You can keep it or remove it, but
                  replacing it with another uploaded file will be added when the backend supports
                  image replacement.
                </div>
              ) : null}

              <div className="mt-8 grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Title
                    </span>

                    <input
                      className="form-field"
                      type="text"
                      maxLength={150}
                      value={title}
                      disabled={updateMoodBoardItemMutation.isPending}
                      onChange={(event) => {
                        updateMoodBoardItemMutation.reset();
                        setTitle(event.target.value);
                      }}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                      Category
                    </span>

                    <select
                      className="form-field"
                      value={category}
                      disabled={updateMoodBoardItemMutation.isPending}
                      onChange={(event) => {
                        updateMoodBoardItemMutation.reset();
                        setCategory(event.target.value as MoodBoardCategory);
                      }}
                    >
                      {moodBoardCategories.map((itemCategory) => (
                        <option key={itemCategory} value={itemCategory}>
                          {categoryLabels[itemCategory]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Description
                  </span>

                  <textarea
                    className="form-field min-h-28 resize-y"
                    maxLength={2000}
                    value={description}
                    disabled={updateMoodBoardItemMutation.isPending}
                    onChange={(event) => {
                      updateMoodBoardItemMutation.reset();
                      setDescription(event.target.value);
                    }}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Image URL
                  </span>

                  <input
                    className="form-field"
                    type="url"
                    placeholder="https://example.com/inspiration.jpg"
                    value={imageUrl}
                    disabled={updateMoodBoardItemMutation.isPending}
                    onChange={(event) => {
                      updateMoodBoardItemMutation.reset();
                      setImageUrl(event.target.value);
                    }}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Clearing this field removes the image. A source URL must remain when no image is
                    present.
                  </p>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Source URL
                  </span>

                  <input
                    className="form-field"
                    type="url"
                    placeholder="https://example.com/reference"
                    value={sourceUrl}
                    disabled={updateMoodBoardItemMutation.isPending}
                    onChange={(event) => {
                      updateMoodBoardItemMutation.reset();
                      setSourceUrl(event.target.value);
                    }}
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Colour tags
                  </span>

                  <input
                    className="form-field"
                    type="text"
                    placeholder="Ivory, sage green, gold"
                    value={colorTagsInput}
                    disabled={updateMoodBoardItemMutation.isPending}
                    onChange={(event) => {
                      updateMoodBoardItemMutation.reset();
                      setColorTagsInput(event.target.value);
                    }}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Separate multiple colour names or codes with commas.
                  </p>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                    Linked vendor
                  </span>

                  <select
                    className="form-field"
                    value={vendorId}
                    disabled={updateMoodBoardItemMutation.isPending || vendorsQuery.isLoading}
                    onChange={(event) => {
                      updateMoodBoardItemMutation.reset();
                      setVendorId(event.target.value);
                    }}
                  >
                    <option value="">
                      {vendorsQuery.isLoading ? 'Loading vendors...' : 'No linked vendor'}
                    </option>

                    {(vendorsQuery.data?.vendors ?? []).map((vendor: PublicVendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.businessName}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Leave empty to remove the existing vendor link.
                  </p>
                </label>

                {updateMoodBoardItemMutation.isError ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
                  >
                    {updateMoodBoardItemMutation.error instanceof Error &&
                    !axios.isAxiosError(updateMoodBoardItemMutation.error)
                      ? updateMoodBoardItemMutation.error.message
                      : getApiErrorMessage(updateMoodBoardItemMutation.error)}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={updateMoodBoardItemMutation.isPending}
                    onClick={closeEditDialog}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn-primary justify-center text-sm font-bold"
                    disabled={updateMoodBoardItemMutation.isPending}
                    onClick={() => {
                      updateMoodBoardItemMutation.mutate();
                    }}
                  >
                    {updateMoodBoardItemMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}

                    {updateMoodBoardItemMutation.isPending ? 'Saving changes...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteDialogOpen && itemToDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(31,27,29,0.48)] px-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-mood-board-item-title"
        >
          <div className="glass-card w-full max-w-lg p-6 sm:p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]">
              <Trash2 className="size-7" />
            </div>

            <h2
              id="delete-mood-board-item-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Delete this inspiration?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              <strong>{itemToDelete.title}</strong> will be permanently removed from this mood
              board.
            </p>

            {itemToDelete.imagePublicId ? (
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                Its uploaded image will also be removed from cloud storage.
              </p>
            ) : null}

            {deleteMoodBoardItemMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(deleteMoodBoardItemMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={deleteMoodBoardItemMutation.isPending}
                onClick={closeDeleteDialog}
              >
                Keep inspiration
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteMoodBoardItemMutation.isPending}
                onClick={() => {
                  deleteMoodBoardItemMutation.mutate();
                }}
              >
                {deleteMoodBoardItemMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {deleteMoodBoardItemMutation.isPending ? 'Deleting...' : 'Delete inspiration'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
