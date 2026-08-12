import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CircleAlert,
  Download,
  ExternalLink,
  FileImage,
  FilePlus2,
  Files,
  FileText,
  FolderArchive,
  Image as ImageIcon,
  LoaderCircle,
  Paperclip,
  Pencil,
  Plus,
  Replace,
  Save,
  Search,
  Sparkles,
  Store,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  addEventDocumentFilesWithUpload,
  createEventDocument,
  deleteEventDocument,
  deleteEventDocumentFile,
  EVENT_DOCUMENT_MAX_FILE_SIZE,
  EVENT_DOCUMENT_MAX_FILES,
  eventDocumentAllowedMimeTypes,
  eventDocumentCategories,
  getEventDocuments,
  getEventDocumentSummary,
  replaceEventDocumentFileWithUpload,
  updateEventDocument,
  uploadInitialEventDocumentFiles,
  type EventDocument,
  type EventDocumentCategory,
  type EventDocumentFile,
  type EventDocumentFileInput,
  type EventDocumentMimeTypeFilter,
  type EventDocumentSort,
} from '../features/eventDocuments/eventDocument.api';
import { getPublicVendors, type PublicVendor } from '../features/vendors/vendor.api';
import { PageBackButton } from '../components/navigation/PageBackButton';
import { canManageWorkspace, getWorkspaceLockedMessage } from '../features/events/eventLifecycle';

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

type FileTypeFilter = 'all' | EventDocumentMimeTypeFilter;
type VendorFilter = 'all' | 'linked' | 'unlinked';

type ModalProps = {
  children: ReactNode;
  labelledBy: string;
  size?: 'default' | 'large';
};

const categoryLabels: Record<EventDocumentCategory, string> = {
  CONTRACT: 'Contract',
  QUOTATION: 'Quotation',
  INVOICE: 'Invoice',
  PAYMENT_RECEIPT: 'Payment receipt',
  SCHEDULE: 'Schedule',
  GUEST_LIST: 'Guest list',
  MENU: 'Menu',
  FLOOR_PLAN: 'Floor plan',
  PERMIT: 'Permit',
  VENDOR_DOCUMENT: 'Vendor document',
  REFERENCE: 'Reference',
  OTHER: 'Other',
};

const supportedMimeTypes = new Set<string>(eventDocumentAllowedMimeTypes);

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error
      ? error.message
      : 'We could not load this document workspace. Please try again.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'We could not load this document workspace. Please try again.'
  );
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const formatCreatedDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
  }).format(new Date(value));

const formatFileSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
};

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

const isImageFile = (file: EventDocumentFile) =>
  file.mimeType === 'image/jpeg' || file.mimeType === 'image/png' || file.mimeType === 'image/webp';

const validateFiles = (files: File[], maximumCount: number) => {
  if (files.length === 0) {
    throw new Error('Choose at least one document file.');
  }

  if (files.length > maximumCount) {
    throw new Error(
      `You can select a maximum of ${maximumCount} ${maximumCount === 1 ? 'file' : 'files'}.`,
    );
  }

  for (const file of files) {
    if (!supportedMimeTypes.has(file.type)) {
      throw new Error(`${file.name} is not supported. Use PDF, JPEG, PNG or WebP files.`);
    }

    if (file.size <= 0) {
      throw new Error(`${file.name} is empty and cannot be uploaded.`);
    }

    if (file.size > EVENT_DOCUMENT_MAX_FILE_SIZE) {
      throw new Error(`${file.name} exceeds the 10 MB file-size limit.`);
    }
  }
};

const mapUploadedFileToInput = (
  file: Awaited<ReturnType<typeof uploadInitialEventDocumentFiles>>[number],
): EventDocumentFileInput => ({
  fileUrl: file.fileUrl,
  filePublicId: file.filePublicId,
  originalName: file.originalName,
  mimeType: file.mimeType,
  fileSize: file.fileSize,
});

function WorkspaceModal({ children, labelledBy, size = 'default' }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div className="grid min-h-full place-items-center">
        <div
          className={
            size === 'large'
              ? 'relative w-full max-w-4xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(240,231,246,0.85))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8'
              : 'relative w-full max-w-2xl overflow-hidden rounded-[2.25rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(240,231,246,0.85))] p-6 shadow-[0_42px_120px_rgba(31,27,29,0.28)] backdrop-blur-3xl sm:p-8'
          }
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[22%] top-[-7rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(255,228,210,0.12)] blur-3xl"
          />

          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function EventDocumentsWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EventDocumentCategory | ''>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [vendorFilter, setVendorFilter] = useState<VendorFilter>('all');
  const [sort, setSort] = useState<EventDocumentSort>('newest');
  const [page, setPage] = useState(1);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<EventDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<EventDocument | null>(null);
  const [documentForNewFiles, setDocumentForNewFiles] = useState<EventDocument | null>(null);
  const [fileToReplace, setFileToReplace] = useState<{
    document: EventDocument;
    file: EventDocumentFile;
  } | null>(null);
  const [fileToDelete, setFileToDelete] = useState<{
    document: EventDocument;
    file: EventDocumentFile;
  } | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventDocumentCategory>('OTHER');
  const [vendorId, setVendorId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedReplacementFile, setSelectedReplacementFile] = useState<File | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['customer', 'events', eventId, 'event-documents', 'summary'],
    enabled: Boolean(eventId),
    queryFn: () => getEventDocumentSummary(eventId!),
  });

  const documentEventStatus = summaryQuery.data?.event.status;

  const isDocumentsEditable =
    documentEventStatus !== undefined
      ? canManageWorkspace(documentEventStatus, 'DOCUMENTS')
      : false;

  const documentsLockedMessage =
    documentEventStatus !== undefined && !isDocumentsEditable
      ? getWorkspaceLockedMessage(documentEventStatus, 'DOCUMENTS')
      : null;

  const documentsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'event-documents',
      'documents',
      {
        page,
        search: searchQuery,
        category: categoryFilter,
        fileType: fileTypeFilter,
        vendor: vendorFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getEventDocuments(eventId!, {
        page,
        limit: 20,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        mimeType: fileTypeFilter === 'all' ? undefined : fileTypeFilter,
        hasVendor: vendorFilter === 'all' ? undefined : vendorFilter === 'linked',
        sort,
      }),
  });

  const vendorsQuery = useQuery({
    queryKey: ['public', 'vendors', 'event-document-options'],
    queryFn: () =>
      getPublicVendors({
        page: 1,
        limit: 50,
        sort: 'name_asc',
      }),
  });

  const invalidateDocumentQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'event-documents', 'summary'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'event-documents', 'documents'],
      }),
    ]);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setVendorId('');
    setSelectedFiles([]);
    setSelectedReplacementFile(null);
  };

  const createDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!isDocumentsEditable) {
        throw new Error(
          documentsLockedMessage ?? 'Document changes are unavailable for this event.',
        );
      }

      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim();

      if (!normalizedTitle) {
        throw new Error('Enter a title for this document.');
      }

      if (normalizedTitle.length > 150) {
        throw new Error('Title cannot exceed 150 characters.');
      }

      if (normalizedDescription.length > 2000) {
        throw new Error('Description cannot exceed 2000 characters.');
      }

      validateFiles(selectedFiles, EVENT_DOCUMENT_MAX_FILES);

      const uploadedFiles = await uploadInitialEventDocumentFiles(selectedFiles);

      return createEventDocument(eventId, {
        title: normalizedTitle,
        description: normalizedDescription || null,
        category,
        vendorId: vendorId || null,
        files: uploadedFiles.map(mapUploadedFileToInput),
      });
    },

    onSuccess: async () => {
      setIsCreateDialogOpen(false);
      resetForm();
      await invalidateDocumentQueries();
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!isDocumentsEditable) {
        throw new Error(
          documentsLockedMessage ?? 'Document changes are unavailable for this event.',
        );
      }

      if (!eventId || !documentToEdit) {
        throw new Error('Document details are missing.');
      }

      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim() || null;
      const normalizedVendorId = vendorId || null;

      if (!normalizedTitle) {
        throw new Error('Enter a title for this document.');
      }

      if (normalizedTitle.length > 150) {
        throw new Error('Title cannot exceed 150 characters.');
      }

      if (description.trim().length > 2000) {
        throw new Error('Description cannot exceed 2000 characters.');
      }

      const input: {
        title?: string;
        description?: string | null;
        category?: EventDocumentCategory;
        vendorId?: string | null;
      } = {};

      if (normalizedTitle !== documentToEdit.title) {
        input.title = normalizedTitle;
      }

      if (normalizedDescription !== documentToEdit.description) {
        input.description = normalizedDescription;
      }

      if (category !== documentToEdit.category) {
        input.category = category;
      }

      if (normalizedVendorId !== documentToEdit.vendorId) {
        input.vendorId = normalizedVendorId;
      }

      if (Object.keys(input).length === 0) {
        throw new Error('No document details were changed.');
      }

      return updateEventDocument(eventId, documentToEdit.id, input);
    },

    onSuccess: async () => {
      setDocumentToEdit(null);
      resetForm();
      await invalidateDocumentQueries();
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!isDocumentsEditable) {
        throw new Error(
          documentsLockedMessage ?? 'Document changes are unavailable for this event.',
        );
      }

      if (!eventId || !documentToDelete) {
        throw new Error('Document details are missing.');
      }

      await deleteEventDocument(eventId, documentToDelete.id);
    },

    onSuccess: async () => {
      setDocumentToDelete(null);
      await invalidateDocumentQueries();
    },
  });

  const addFilesMutation = useMutation({
    mutationFn: async () => {
      if (!isDocumentsEditable) {
        throw new Error(
          documentsLockedMessage ?? 'Document changes are unavailable for this event.',
        );
      }

      if (!eventId || !documentForNewFiles) {
        throw new Error('Document details are missing.');
      }

      const remainingFileSlots = EVENT_DOCUMENT_MAX_FILES - documentForNewFiles.files.length;

      validateFiles(selectedFiles, remainingFileSlots);

      return addEventDocumentFilesWithUpload(eventId, documentForNewFiles.id, {
        files: selectedFiles,
      });
    },

    onSuccess: async () => {
      setDocumentForNewFiles(null);
      setSelectedFiles([]);
      await invalidateDocumentQueries();
    },
  });

  const replaceFileMutation = useMutation({
    mutationFn: async () => {
      if (!isDocumentsEditable) {
        throw new Error(
          documentsLockedMessage ?? 'Document changes are unavailable for this event.',
        );
      }

      if (!eventId || !fileToReplace) {
        throw new Error('File details are missing.');
      }

      if (!selectedReplacementFile) {
        throw new Error('Choose a replacement file.');
      }

      validateFiles([selectedReplacementFile], 1);

      return replaceEventDocumentFileWithUpload(
        eventId,
        fileToReplace.document.id,
        fileToReplace.file.id,
        {
          file: selectedReplacementFile,
        },
      );
    },

    onSuccess: async () => {
      setFileToReplace(null);
      setSelectedReplacementFile(null);
      await invalidateDocumentQueries();
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async () => {
      if (!isDocumentsEditable) {
        throw new Error(
          documentsLockedMessage ?? 'Document changes are unavailable for this event.',
        );
      }

      if (!eventId || !fileToDelete) {
        throw new Error('File details are missing.');
      }

      await deleteEventDocumentFile(eventId, fileToDelete.document.id, fileToDelete.file.id);
    },

    onSuccess: async () => {
      setFileToDelete(null);
      await invalidateDocumentQueries();
    },
  });

  const openCreateDialog = () => {
    if (!isDocumentsEditable) {
      return;
    }

    createDocumentMutation.reset();
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createDocumentMutation.isPending) {
      return;
    }

    createDocumentMutation.reset();
    resetForm();
    setIsCreateDialogOpen(false);
  };

  const openEditDialog = (document: EventDocument) => {
    if (!isDocumentsEditable) {
      return;
    }

    updateDocumentMutation.reset();
    setDocumentToEdit(document);
    setTitle(document.title);
    setDescription(document.description ?? '');
    setCategory(document.category);
    setVendorId(document.vendorId ?? '');
  };

  const closeEditDialog = () => {
    if (updateDocumentMutation.isPending) {
      return;
    }

    updateDocumentMutation.reset();
    setDocumentToEdit(null);
    resetForm();
  };

  const openAddFilesDialog = (document: EventDocument) => {
    if (!isDocumentsEditable) {
      return;
    }

    addFilesMutation.reset();
    setSelectedFiles([]);
    setDocumentForNewFiles(document);
  };

  const closeAddFilesDialog = () => {
    if (addFilesMutation.isPending) {
      return;
    }

    addFilesMutation.reset();
    setSelectedFiles([]);
    setDocumentForNewFiles(null);
  };

  const openReplaceFileDialog = (document: EventDocument, file: EventDocumentFile) => {
    if (!isDocumentsEditable) {
      return;
    }

    replaceFileMutation.reset();
    setSelectedReplacementFile(null);
    setFileToReplace({ document, file });
  };

  const closeReplaceFileDialog = () => {
    if (replaceFileMutation.isPending) {
      return;
    }

    replaceFileMutation.reset();
    setSelectedReplacementFile(null);
    setFileToReplace(null);
  };

  const closeDeleteDocumentDialog = () => {
    if (deleteDocumentMutation.isPending) {
      return;
    }

    deleteDocumentMutation.reset();
    setDocumentToDelete(null);
  };

  const closeDeleteFileDialog = () => {
    if (deleteFileMutation.isPending) {
      return;
    }

    deleteFileMutation.reset();
    setFileToDelete(null);
  };

  const submitSearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategoryFilter('');
    setFileTypeFilter('all');
    setVendorFilter('all');
    setSort('newest');
    setPage(1);
  };

  const isLoading = summaryQuery.isLoading || documentsQuery.isLoading;
  const isError = summaryQuery.isError || documentsQuery.isError;
  const firstError = summaryQuery.error ?? documentsQuery.error;

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(240,231,246,0.84))] p-10 text-center shadow-[0_36px_100px_rgba(31,27,29,0.18)] backdrop-blur-3xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
          />

          <div className="relative">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl border border-white/58 bg-white/34 text-[var(--color-deep-plum)] shadow-[0_14px_34px_rgba(31,27,29,0.06)]">
              <LoaderCircle className="size-8 animate-spin" />
            </div>

            <p className="mt-7 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              Opening your document workspace
            </p>

            <p className="mx-auto mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
              Loading contracts, quotations, invoices, schedules and every important file connected
              to this event.
            </p>

            <div className="mx-auto mt-8 max-w-sm space-y-3">
              <div className="h-3 animate-pulse rounded-full bg-[rgba(183,167,200,0.22)]" />
              <div className="mx-auto h-3 w-4/5 animate-pulse rounded-full bg-[rgba(175,201,216,0.22)]" />
              <div className="mx-auto h-3 w-3/5 animate-pulse rounded-full bg-white/42" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !summaryQuery.data || !documentsQuery.data) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.90),rgba(249,235,240,0.84))] p-10 text-center shadow-[0_36px_100px_rgba(31,27,29,0.18)] backdrop-blur-3xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
          />

          <div className="relative">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.11)] text-[var(--color-muted-burgundy)] shadow-[0_14px_34px_rgba(124,74,90,0.08)]">
              <CircleAlert aria-hidden="true" className="size-8" />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
              Document library unavailable
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
              We could not open this workspace.
            </h2>

            <p className="mx-auto mt-4 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/62">
              {eventId
                ? getApiErrorMessage(firstError)
                : 'The event address is invalid. Return to your events and open the document workspace again.'}
            </p>

            <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <Link
                to="/events"
                className="btn-secondary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Back to events
              </Link>

              {eventId ? (
                <button
                  type="button"
                  className="group/retry-documents btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                  onClick={() => {
                    void Promise.all([summaryQuery.refetch(), documentsQuery.refetch()]);
                  }}
                >
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 transition duration-300 group-hover/retry-documents:rotate-12"
                  />
                  Try again
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const workspaceSummary = summaryQuery.data;
  const documents = documentsQuery.data.documents;
  const pagination = documentsQuery.data.pagination;

  const activeCategoryCount = Object.values(workspaceSummary.summary.categoryCounts).filter(
    (count) => count > 0,
  ).length;

  const archiveCoverage =
    eventDocumentCategories.length > 0
      ? Math.round((activeCategoryCount / eventDocumentCategories.length) * 100)
      : 0;

  const filtersAreActive =
    Boolean(searchQuery) ||
    Boolean(categoryFilter) ||
    fileTypeFilter !== 'all' ||
    vendorFilter !== 'all' ||
    sort !== 'newest';

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
                Event documents
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {workspaceSummary.event.name}
              </h1>
            </div>
          </div>

          <span
            className="status-chip w-fit"
            data-tone={getEventStatusTone(workspaceSummary.event.status)}
          >
            {workspaceSummary.event.status.replaceAll('_', ' ')}
          </span>
        </header>

        <main className="py-10">
          <section className="relative isolate min-h-[22rem] overflow-hidden rounded-[2.5rem] border border-white/68 bg-[#fffaf6] px-6 py-5 shadow-[0_26px_78px_rgba(31,27,29,0.11)] sm:px-7 sm:py-6 lg:px-8 lg:py-6">
            <img
              src="/images/workspaces/shortcuts/documents.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-30 size-full scale-[1.01] object-cover object-[76%_center] opacity-100 saturate-[0.94] contrast-[0.99] transition duration-1000"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(255,250,246,0.995)_0%,rgba(255,250,246,0.985)_20%,rgba(255,250,246,0.93)_34%,rgba(255,250,246,0.72)_47%,rgba(255,250,246,0.40)_58%,rgba(255,250,246,0.14)_69%,rgba(255,250,246,0.025)_79%,transparent_88%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 -z-20 w-[58%] bg-[linear-gradient(90deg,rgba(255,250,246,0.42),rgba(255,250,246,0.10),transparent)] backdrop-blur-[2.5px]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_48%,rgba(255,250,246,0.09)_100%)]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 -top-28 -z-10 size-[30rem] rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
            />

            <div className="relative flex min-h-[17rem] flex-col justify-between gap-3">
              <div className="max-w-[35rem]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/44 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)] shadow-[0_10px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                  <Sparkles aria-hidden="true" className="size-4" />
                  Planning archive
                </div>

                <div className="mt-2.5 max-w-[32rem] rounded-[1.3rem] border border-white/44 bg-white/[0.15] px-5 py-3 shadow-[0_14px_36px_rgba(31,27,29,0.055)] backdrop-blur-[3px]">
                  <h2 className="max-w-[30rem] text-balance text-[2rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.2rem] lg:text-[2.35rem]">
                    Every important file,
                    <br />
                    properly organised.
                  </h2>

                  <p className="mt-2.5 max-w-[30rem] text-sm font-semibold leading-[1.4rem] text-[var(--color-charcoal)]/70">
                    Store contracts, quotations, receipts, schedules, floor plans and vendor files
                    in one structured event library.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="group/hero-add-document btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(93,58,85,0.24)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      disabled={!isDocumentsEditable}
                      title={
                        !isDocumentsEditable ? (documentsLockedMessage ?? undefined) : undefined
                      }
                      onClick={openCreateDialog}
                    >
                      <Plus
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/hero-add-document:rotate-90"
                      />
                      Add document
                    </button>

                    <span className="rounded-full border border-white/72 bg-white/46 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                      <FolderArchive aria-hidden="true" className="mr-1.5 inline size-3.5" />
                      {formatEventDate(workspaceSummary.event.eventDate)}
                    </span>
                  </div>

                  <div className="mt-3 max-w-[26rem] rounded-[1.1rem] border border-white/56 bg-white/34 px-4 py-2.5 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/48">
                          Archive coverage
                        </p>

                        <p className="mt-1 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/54">
                          {activeCategoryCount} of {eventDocumentCategories.length} categories in
                          use
                        </p>
                      </div>

                      <p className="text-sm font-black text-[var(--color-deep-plum)]">
                        {archiveCoverage}%
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.09)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),#d7b7c3)] transition-[width] duration-700"
                        style={{
                          width: `${Math.min(Math.max(archiveCoverage, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid max-w-[49rem] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="group/document-metric rounded-[1.3rem] border border-white/68 bg-white/40 px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/56 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] transition duration-300 group-hover/document-metric:scale-105">
                    <FolderArchive aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Document groups
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {workspaceSummary.summary.totalDocuments}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {activeCategoryCount} active categories
                  </p>
                </article>

                <article className="group/document-metric rounded-[1.3rem] border border-white/68 bg-[rgba(240,247,250,0.48)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#334954] transition duration-300 group-hover/document-metric:scale-105">
                    <Files aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Stored files
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {workspaceSummary.summary.totalFiles}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Across every document group
                  </p>
                </article>

                <article className="group/document-metric rounded-[1.3rem] border border-white/68 bg-[rgba(249,235,240,0.50)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)] transition duration-300 group-hover/document-metric:scale-105">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    PDF files
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {workspaceSummary.summary.pdfFiles}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Contracts, receipts and forms
                  </p>
                </article>

                <article className="group/document-metric rounded-[1.3rem] border border-white/68 bg-[rgba(244,246,236,0.50)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#596449] transition duration-300 group-hover/document-metric:scale-105">
                    <FileImage aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Image files
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {workspaceSummary.summary.imageFiles}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {workspaceSummary.summary.linkedVendorDocuments} vendor-linked groups
                  </p>
                </article>
              </div>
            </div>
          </section>

          {documentsLockedMessage ? (
            <div className="mt-6 flex items-start gap-4 rounded-[1.5rem] border border-[rgba(93,58,85,0.14)] bg-[rgba(255,255,255,0.58)] px-5 py-4 shadow-[0_14px_36px_rgba(31,27,29,0.05)] backdrop-blur-xl">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]">
                <CircleAlert aria-hidden="true" className="size-5" />
              </span>

              <div>
                <p className="text-sm font-black text-[var(--color-near-black)]">
                  Document library is read-only
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  {documentsLockedMessage}
                </p>
              </div>
            </div>
          ) : null}

          <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.3fr]">
            <article className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.52),rgba(255,255,255,0.22))] p-6 shadow-[0_22px_64px_rgba(31,27,29,0.07)] backdrop-blur-3xl sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 left-[18%] size-52 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                        <FolderArchive aria-hidden="true" className="size-5" />
                      </div>

                      <span className="status-chip" data-tone="plum">
                        {pagination.total}{' '}
                        {pagination.total === 1 ? 'document group' : 'document groups'}
                      </span>
                    </div>

                    <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                      Document library
                    </p>

                    <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                      Files organised for this event.
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/58">
                      Search document groups, filter file types and categories, or focus on records
                      linked to a vendor.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="group/library-add-document btn-primary shrink-0 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    disabled={!isDocumentsEditable}
                    title={!isDocumentsEditable ? (documentsLockedMessage ?? undefined) : undefined}
                    onClick={openCreateDialog}
                  >
                    <Plus
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/library-add-document:rotate-90"
                    />
                    Add document
                  </button>
                </div>

                <form
                  className="mt-7 rounded-[1.6rem] border border-white/56 bg-white/28 p-5 backdrop-blur-xl"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitSearch();
                  }}
                >
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                      Search documents
                    </span>

                    <div className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-white/58 bg-white/30 px-4 transition duration-300 focus-within:border-[rgba(93,58,85,0.22)] focus-within:bg-white/48">
                      <Search
                        aria-hidden="true"
                        className="size-5 shrink-0 text-[var(--color-charcoal)]/42"
                      />

                      <input
                        className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--color-charcoal)]/42"
                        type="search"
                        placeholder="Search titles, descriptions, filenames or vendors"
                        value={searchInput}
                        onChange={(event) => {
                          setSearchInput(event.target.value);
                        }}
                      />
                    </div>
                  </label>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Category
                      </span>

                      <select
                        className="form-field min-h-12 transition duration-300 focus:bg-white/52"
                        aria-label="Filter documents by category"
                        value={categoryFilter}
                        onChange={(event) => {
                          setCategoryFilter(event.target.value as EventDocumentCategory | '');
                          setPage(1);
                        }}
                      >
                        <option value="">All categories</option>

                        {eventDocumentCategories.map((documentCategory) => (
                          <option key={documentCategory} value={documentCategory}>
                            {categoryLabels[documentCategory]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        File type
                      </span>

                      <select
                        className="form-field min-h-12 transition duration-300 focus:bg-white/52"
                        aria-label="Filter documents by file type"
                        value={fileTypeFilter}
                        onChange={(event) => {
                          setFileTypeFilter(event.target.value as FileTypeFilter);
                          setPage(1);
                        }}
                      >
                        <option value="all">All file types</option>
                        <option value="PDF">PDF files</option>
                        <option value="IMAGE">Images</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Vendor link
                      </span>

                      <select
                        className="form-field min-h-12 transition duration-300 focus:bg-white/52"
                        aria-label="Filter documents by linked vendor"
                        value={vendorFilter}
                        onChange={(event) => {
                          setVendorFilter(event.target.value as VendorFilter);
                          setPage(1);
                        }}
                      >
                        <option value="all">All vendor links</option>
                        <option value="linked">Linked vendor</option>
                        <option value="unlinked">No vendor</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-charcoal)]/52">
                        Sort order
                      </span>

                      <select
                        className="form-field min-h-12 transition duration-300 focus:bg-white/52"
                        aria-label="Sort event documents"
                        value={sort}
                        onChange={(event) => {
                          setSort(event.target.value as EventDocumentSort);
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
                    </label>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-[var(--color-charcoal)]/52">
                      Showing {documents.length}{' '}
                      {documents.length === 1 ? 'document group' : 'document groups'} on this page
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        className="group/search-documents btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                      >
                        <Search
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/search-documents:scale-105"
                        />
                        Search
                      </button>

                      {filtersAreActive ? (
                        <button
                          type="button"
                          className="btn-secondary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      ) : null}
                    </div>
                  </div>
                </form>

                {documents.length > 0 ? (
                  <div className="mt-8 grid gap-5 xl:grid-cols-2">
                    {documents.map((document) => (
                      <article
                        key={document.id}
                        className="group/document-card relative overflow-hidden rounded-[1.75rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.48),rgba(255,255,255,0.22))] shadow-[0_18px_50px_rgba(31,27,29,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/90 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(232,225,240,0.58))] hover:shadow-[0_30px_72px_rgba(31,27,29,0.12)]"
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(183,167,200,0.16)] opacity-60 blur-3xl transition duration-500 group-hover/document-card:scale-125 group-hover/document-card:bg-[rgba(183,167,200,0.30)] group-hover/document-card:opacity-100"
                        />

                        <div className="relative p-4 sm:p-5">
                          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-4">
                                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(93,58,85,0.11)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/document-card:-translate-y-0.5 group-hover/document-card:scale-105">
                                  <FolderArchive aria-hidden="true" className="size-6" />
                                </div>

                                <div className="min-w-0">
                                  <span className="status-chip" data-tone="plum">
                                    {categoryLabels[document.category]}
                                  </span>

                                  <h3 className="mt-3 truncate text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/document-card:text-[var(--color-deep-plum)]">
                                    {document.title}
                                  </h3>

                                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-charcoal)]/44">
                                    Document group
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                className="group/edit-document grid size-10 place-items-center rounded-2xl border border-[rgba(93,58,85,0.18)] bg-[rgba(93,58,85,0.08)] text-[var(--color-deep-plum)] shadow-[0_8px_20px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.28)] hover:bg-[rgba(93,58,85,0.14)] hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                aria-label={`Edit ${document.title}`}
                                disabled={!isDocumentsEditable}
                                title={
                                  !isDocumentsEditable
                                    ? (documentsLockedMessage ?? undefined)
                                    : undefined
                                }
                                onClick={() => {
                                  openEditDialog(document);
                                }}
                              >
                                <Pencil
                                  aria-hidden="true"
                                  className="size-4 transition duration-300 group-hover/edit-document:rotate-[3deg] group-hover/edit-document:scale-105"
                                />
                              </button>

                              <button
                                type="button"
                                className="group/delete-document grid size-10 place-items-center rounded-2xl border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] text-[var(--color-muted-burgundy)] shadow-[0_8px_20px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.28)] hover:bg-[rgba(124,74,90,0.14)] hover:shadow-[0_12px_28px_rgba(124,74,90,0.10)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                aria-label={`Delete ${document.title}`}
                                disabled={!isDocumentsEditable}
                                title={
                                  !isDocumentsEditable
                                    ? (documentsLockedMessage ?? undefined)
                                    : undefined
                                }
                                onClick={() => {
                                  if (!isDocumentsEditable) {
                                    return;
                                  }

                                  deleteDocumentMutation.reset();
                                  setDocumentToDelete(document);
                                }}
                              >
                                <Trash2
                                  aria-hidden="true"
                                  className="size-4 transition duration-300 group-hover/delete-document:scale-105"
                                />
                              </button>
                            </div>
                          </div>

                          {document.description ? (
                            <div className="mt-5 rounded-[1.35rem] border border-white/50 bg-white/30 p-4 transition duration-300 group-hover/document-card:border-white/74 group-hover/document-card:bg-white/44">
                              <p className="line-clamp-3 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66">
                                {document.description}
                              </p>
                            </div>
                          ) : null}

                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/30 px-3 py-2 text-xs font-black text-[var(--color-charcoal)]/56 transition duration-300 group-hover/document-card:border-white/72 group-hover/document-card:bg-white/44">
                              <Files
                                aria-hidden="true"
                                className="size-4 text-[var(--color-deep-plum)]"
                              />
                              {document.files.length}{' '}
                              {document.files.length === 1 ? 'file' : 'files'}
                            </span>

                            <span className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/30 px-3 py-2 text-xs font-bold text-[var(--color-charcoal)]/54 transition duration-300 group-hover/document-card:border-white/72 group-hover/document-card:bg-white/44">
                              <Paperclip
                                aria-hidden="true"
                                className="size-4 text-[var(--color-rosewood)]"
                              />
                              Added {formatCreatedDate(document.createdAt)}
                            </span>
                          </div>

                          {document.vendor ? (
                            <Link
                              className="group/vendor-document mt-5 flex items-center gap-3 rounded-[1.35rem] border border-[rgba(175,201,216,0.22)] bg-[rgba(222,236,242,0.30)] px-4 py-4 text-sm font-black text-[var(--color-deep-plum)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(175,201,216,0.34)] hover:bg-[rgba(222,236,242,0.44)] hover:shadow-[0_12px_28px_rgba(31,27,29,0.07)]"
                              to={`/vendors/${document.vendor.slug}`}
                            >
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] transition duration-300 group-hover/vendor-document:scale-105">
                                <Store aria-hidden="true" className="size-4" />
                              </span>

                              <span className="min-w-0 flex-1 truncate">
                                {document.vendor.businessName}
                              </span>

                              <ExternalLink
                                aria-hidden="true"
                                className="size-4 shrink-0 transition duration-300 group-hover/vendor-document:-translate-y-0.5 group-hover/vendor-document:translate-x-0.5"
                              />
                            </Link>
                          ) : (
                            <div className="mt-5 flex items-center gap-3 rounded-[1.35rem] border border-dashed border-white/62 bg-white/22 px-4 py-4">
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/34 text-[var(--color-charcoal)]/44">
                                <Store aria-hidden="true" className="size-4" />
                              </span>

                              <p className="text-sm font-semibold text-[var(--color-charcoal)]/52">
                                No vendor linked to this document group.
                              </p>
                            </div>
                          )}

                          <div className="mt-4 space-y-3">
                            {document.files.map((file) => (
                              <article
                                key={file.id}
                                className="group/file-row relative overflow-hidden rounded-[1.35rem] border border-white/56 bg-[linear-gradient(145deg,rgba(255,255,255,0.48),rgba(255,255,255,0.24))] p-3 shadow-[0_10px_28px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.80),rgba(225,236,241,0.46))] hover:shadow-[0_18px_42px_rgba(31,27,29,0.08)]"
                              >
                                <div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl transition duration-500 group-hover/file-row:scale-125 group-hover/file-row:bg-[rgba(175,201,216,0.24)]"
                                />

                                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
                                  <div className="flex min-w-0 flex-1 items-center gap-3">
                                    {isImageFile(file) ? (
                                      <div className="relative shrink-0 overflow-hidden rounded-2xl border border-white/56 shadow-[0_8px_22px_rgba(31,27,29,0.06)]">
                                        <img
                                          className="size-14 object-cover transition duration-500 group-hover/file-row:scale-105"
                                          src={file.fileUrl}
                                          alt=""
                                          loading="lazy"
                                        />

                                        <div
                                          aria-hidden="true"
                                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(31,27,29,0.12)] to-transparent"
                                        />
                                      </div>
                                    ) : (
                                      <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[rgba(124,74,90,0.12)] bg-[rgba(124,74,90,0.10)] text-[var(--color-muted-burgundy)] shadow-[0_8px_22px_rgba(31,27,29,0.05)] transition duration-300 group-hover/file-row:-translate-y-0.5 group-hover/file-row:scale-105">
                                        <FileText aria-hidden="true" className="size-6" />
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-black text-[var(--color-near-black)] transition duration-300 group-hover/file-row:text-[var(--color-deep-plum)]">
                                        {file.originalName}
                                      </p>

                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-lg border border-white/48 bg-white/30 px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                                          {isImageFile(file) ? 'Image' : 'PDF'}
                                        </span>

                                        <span className="text-xs font-semibold text-[var(--color-charcoal)]/48">
                                          {formatFileSize(file.fileSize)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                                    <a
                                      className="group/open-file grid size-9 place-items-center rounded-xl border border-[rgba(93,58,85,0.14)] bg-[rgba(93,58,85,0.07)] text-[var(--color-deep-plum)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.24)] hover:bg-[rgba(93,58,85,0.13)] hover:shadow-[0_10px_22px_rgba(31,27,29,0.07)]"
                                      href={file.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`Open ${file.originalName}`}
                                    >
                                      <ExternalLink
                                        aria-hidden="true"
                                        className="size-4 transition duration-300 group-hover/open-file:-translate-y-0.5 group-hover/open-file:translate-x-0.5"
                                      />
                                    </a>

                                    <a
                                      className="group/download-file grid size-9 place-items-center rounded-xl border border-[rgba(93,58,85,0.14)] bg-[rgba(93,58,85,0.07)] text-[var(--color-deep-plum)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.24)] hover:bg-[rgba(93,58,85,0.13)] hover:shadow-[0_10px_22px_rgba(31,27,29,0.07)]"
                                      href={file.fileUrl}
                                      download={file.originalName}
                                      aria-label={`Download ${file.originalName}`}
                                    >
                                      <Download
                                        aria-hidden="true"
                                        className="size-4 transition duration-300 group-hover/download-file:translate-y-0.5"
                                      />
                                    </a>

                                    <button
                                      type="button"
                                      className="group/replace-file grid size-9 place-items-center rounded-xl border border-[rgba(93,58,85,0.14)] bg-[rgba(93,58,85,0.07)] text-[var(--color-deep-plum)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.24)] hover:bg-[rgba(93,58,85,0.13)] hover:shadow-[0_10px_22px_rgba(31,27,29,0.07)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                      aria-label={`Replace ${file.originalName}`}
                                      disabled={!isDocumentsEditable}
                                      title={
                                        !isDocumentsEditable
                                          ? (documentsLockedMessage ?? undefined)
                                          : undefined
                                      }
                                      onClick={() => {
                                        openReplaceFileDialog(document, file);
                                      }}
                                    >
                                      <Replace
                                        aria-hidden="true"
                                        className="size-4 transition duration-300 group-hover/replace-file:rotate-12"
                                      />
                                    </button>

                                    <button
                                      type="button"
                                      className="group/delete-file grid size-9 place-items-center rounded-xl border border-[rgba(124,74,90,0.14)] bg-[rgba(124,74,90,0.07)] text-[var(--color-muted-burgundy)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.24)] hover:bg-[rgba(124,74,90,0.13)] hover:shadow-[0_10px_22px_rgba(124,74,90,0.08)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                      aria-label={`Delete ${file.originalName}`}
                                      disabled={!isDocumentsEditable || document.files.length <= 1}
                                      title={
                                        !isDocumentsEditable
                                          ? (documentsLockedMessage ?? undefined)
                                          : document.files.length <= 1
                                            ? 'At least one file must remain in a document group.'
                                            : undefined
                                      }
                                      onClick={() => {
                                        if (!isDocumentsEditable) {
                                          return;
                                        }

                                        deleteFileMutation.reset();
                                        setFileToDelete({
                                          document,
                                          file,
                                        });
                                      }}
                                    >
                                      <Trash2
                                        aria-hidden="true"
                                        className="size-4 transition duration-300 group-hover/delete-file:scale-105"
                                      />
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>

                          <button
                            type="button"
                            className="group/add-document-file mt-5 flex w-full items-center justify-center gap-2 rounded-[1.35rem] border border-white/56 bg-white/28 px-5 py-3 text-sm font-black text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/48 hover:shadow-[0_16px_34px_rgba(31,27,29,0.08)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                            disabled={
                              !isDocumentsEditable ||
                              document.files.length >= EVENT_DOCUMENT_MAX_FILES
                            }
                            title={
                              !isDocumentsEditable
                                ? (documentsLockedMessage ?? undefined)
                                : undefined
                            }
                            onClick={() => {
                              openAddFilesDialog(document);
                            }}
                          >
                            <FilePlus2
                              aria-hidden="true"
                              className="size-4 transition duration-300 group-hover/add-document-file:rotate-[4deg] group-hover/add-document-file:scale-105"
                            />

                            {!isDocumentsEditable
                              ? 'Document library locked'
                              : document.files.length >= EVENT_DOCUMENT_MAX_FILES
                                ? 'Maximum files added'
                                : 'Add another file'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-dashed border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.50),rgba(255,255,255,0.24))] p-8 text-center shadow-[0_16px_42px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-10">
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
                        <FolderArchive aria-hidden="true" className="size-8" />
                      </div>

                      <p className="mt-6 text-2xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                        {filtersAreActive
                          ? 'No documents match these filters'
                          : 'No event documents yet'}
                      </p>

                      <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                        {filtersAreActive
                          ? 'Try changing the search term, category, file type, vendor link or sort order.'
                          : 'Upload your first contract, quotation, receipt, schedule, floor plan or reference file.'}
                      </p>

                      {filtersAreActive ? (
                        <button
                          type="button"
                          className="btn-secondary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.09)]"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="group/first-document btn-primary mt-6 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                          disabled={!isDocumentsEditable}
                          title={
                            !isDocumentsEditable ? (documentsLockedMessage ?? undefined) : undefined
                          }
                          onClick={openCreateDialog}
                        >
                          <Plus
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/first-document:rotate-90"
                          />
                          Add first document
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
                          <FolderArchive aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            Page {pagination.page} of {pagination.totalPages}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/50">
                            {pagination.total}{' '}
                            {pagination.total === 1 ? 'document group' : 'document groups'} in total
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                          disabled={!pagination.hasPreviousPage || documentsQuery.isFetching}
                          onClick={() => {
                            setPage((currentPage) => Math.max(currentPage - 1, 1));
                          }}
                        >
                          Previous
                        </button>

                        <button
                          type="button"
                          className="btn-secondary min-w-28 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/52 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                          disabled={!pagination.hasNextPage || documentsQuery.isFetching}
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
              </div>
            </article>

            <aside className="space-y-5">
              <article className="group/document-categories relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_32px_86px_rgba(93,58,85,0.34)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-3xl transition duration-500 group-hover/document-categories:scale-125"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-[rgba(175,201,216,0.18)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl border border-white/14 bg-white/12 text-[var(--color-powder-blue)] shadow-[0_12px_28px_rgba(31,27,29,0.12)] backdrop-blur-xl transition duration-300 group-hover/document-categories:-translate-y-0.5 group-hover/document-categories:scale-105">
                      <FolderArchive aria-hidden="true" className="size-6" />
                    </div>

                    <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/74 backdrop-blur-xl">
                      {activeCategoryCount} {activeCategoryCount === 1 ? 'category' : 'categories'}
                    </span>
                  </div>

                  <p className="mt-7 text-xs font-black uppercase tracking-[0.20em] text-white/48">
                    Archive structure
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">
                    Document categories
                  </h2>

                  <p className="mt-3 leading-7 text-white/68">
                    See how contracts, receipts, schedules and references are currently organised.
                  </p>

                  <div className="mt-8 space-y-3">
                    {eventDocumentCategories
                      .filter(
                        (documentCategory) =>
                          workspaceSummary.summary.categoryCounts[documentCategory] > 0,
                      )
                      .map((documentCategory) => (
                        <div
                          key={documentCategory}
                          className="group/category-row flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.15]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[var(--color-powder-blue)] transition duration-300 group-hover/category-row:scale-105">
                              <FileText aria-hidden="true" className="size-4" />
                            </span>

                            <span className="truncate text-sm font-black text-white/84">
                              {categoryLabels[documentCategory]}
                            </span>
                          </div>

                          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/12 text-lg font-black shadow-[0_8px_20px_rgba(31,27,29,0.10)]">
                            {workspaceSummary.summary.categoryCounts[documentCategory]}
                          </span>
                        </div>
                      ))}

                    {activeCategoryCount > 0 ? (
                      <article className="group/document-categories relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-deep-plum),var(--color-muted-burgundy))] p-6 text-[#fffaf5] shadow-[0_24px_70px_rgba(93,58,85,0.28)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_32px_86px_rgba(93,58,85,0.34)]">
                        {/* keep all the existing Document categories content here */}
                      </article>
                    ) : null}
                  </div>
                </div>
              </article>

              <article className="group/upload-rules glass-card relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:shadow-[0_24px_60px_rgba(31,27,29,0.10)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-16 -right-12 size-44 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/upload-rules:scale-125 group-hover/upload-rules:bg-[rgba(175,201,216,0.30)]"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/upload-rules:-translate-y-0.5 group-hover/upload-rules:scale-105">
                      <Upload aria-hidden="true" className="size-6" />
                    </div>

                    <span className="rounded-full border border-white/54 bg-white/34 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/52 backdrop-blur-xl">
                      File limits
                    </span>
                  </div>

                  <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                    Upload guidance
                  </p>

                  <h2 className="mt-3 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/upload-rules:text-[var(--color-deep-plum)]">
                    Upload rules
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/60">
                    Keep each document group valid by following the supported file and storage
                    limits.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      {
                        label: 'Supported formats',
                        detail: 'PDF, JPEG, PNG and WebP',
                        icon: Files,
                      },
                      {
                        label: 'Maximum file size',
                        detail: '10 MB per file',
                        icon: FileText,
                      },
                      {
                        label: 'Files per group',
                        detail: 'Maximum of 3 files',
                        icon: FolderArchive,
                      },
                      {
                        label: 'Minimum remaining',
                        detail: 'At least 1 file must remain',
                        icon: Paperclip,
                      },
                    ].map(({ label, detail, icon: Icon }) => (
                      <div
                        key={label}
                        className="group/upload-rule-row flex items-center gap-3 rounded-2xl border border-white/46 bg-white/28 px-4 py-3 transition duration-300 hover:-translate-y-0.5 hover:border-white/72 hover:bg-white/42"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)] transition duration-300 group-hover/upload-rule-row:scale-105">
                          <Icon aria-hidden="true" className="size-4" />
                        </span>

                        <div className="min-w-0">
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            {label}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/52">
                            {detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[1.35rem] border border-[rgba(175,201,216,0.22)] bg-[rgba(222,236,242,0.28)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                        <FileImage aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        Images receive previews inside the library, while PDFs use a document icon
                        and open in a new browser tab.
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>

      {isCreateDialogOpen && isDocumentsEditable ? (
        <WorkspaceModal labelledBy="create-event-document-title" size="large">
          <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                  <FilePlus2 aria-hidden="true" className="size-6" />
                </div>

                <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                  New document group
                </span>
              </div>

              <h2
                id="create-event-document-title"
                className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
              >
                Add files to the event library.
              </h2>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                Create one organised document group containing up to three related PDF or image
                files.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="status-chip" data-tone="plum">
                  <Files aria-hidden="true" className="size-3.5" />
                  Up to {EVENT_DOCUMENT_MAX_FILES} files
                </span>

                <span className="status-chip" data-tone="blue">
                  <Upload aria-hidden="true" className="size-3.5" />
                  10 MB each
                </span>

                <span className="status-chip" data-tone="gray">
                  <FileImage aria-hidden="true" className="size-3.5" />
                  PDF or image
                </span>
              </div>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close document form"
              disabled={createDocumentMutation.isPending}
              onClick={closeCreateDialog}
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/30 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  Document details
                </p>

                <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  Describe and organise this group.
                </h3>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                  Give the group a clear title, choose its category and optionally connect it to a
                  vendor.
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="flex items-center justify-between gap-4">
                      <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                        Title
                        <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                      </span>

                      <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                        {title.length.toLocaleString('en-LK')} / 150
                      </span>
                    </span>

                    <input
                      className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                      type="text"
                      maxLength={150}
                      value={title}
                      disabled={createDocumentMutation.isPending}
                      placeholder="e.g. Venue contract"
                      onChange={(event) => {
                        createDocumentMutation.reset();
                        setTitle(event.target.value);
                      }}
                    />

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      Use a short title that makes this group easy to recognise.
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Category
                      <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                    </span>

                    <select
                      className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                      value={category}
                      disabled={createDocumentMutation.isPending}
                      onChange={(event) => {
                        createDocumentMutation.reset();
                        setCategory(event.target.value as EventDocumentCategory);
                      }}
                    >
                      {eventDocumentCategories.map((documentCategory) => (
                        <option key={documentCategory} value={documentCategory}>
                          {categoryLabels[documentCategory]}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      The category controls where this group appears in your archive.
                    </p>
                  </label>
                </div>

                <label className="mt-5 block">
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Description
                    </span>

                    <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                      {description.length.toLocaleString('en-LK')} / 2,000
                    </span>
                  </span>

                  <textarea
                    className="form-field mt-2 min-h-32 resize-y transition duration-300 focus:bg-white/52"
                    maxLength={2000}
                    value={description}
                    disabled={createDocumentMutation.isPending}
                    placeholder="Add useful context about these files, their purpose or the latest revision."
                    onChange={(event) => {
                      createDocumentMutation.reset();
                      setDescription(event.target.value);
                    }}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Optional. Include details that will help you identify the correct files later.
                  </p>
                </label>

                <label className="mt-5 block">
                  <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                    Linked vendor
                  </span>

                  <select
                    className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                    value={vendorId}
                    disabled={createDocumentMutation.isPending || vendorsQuery.isLoading}
                    onChange={(event) => {
                      createDocumentMutation.reset();
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
                    Optional. Link this group when the files belong to a specific vendor.
                  </p>
                </label>
              </div>
            </section>

            <section className="group/document-upload relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(220,235,242,0.40))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-xl transition-all duration-300 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)] sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/document-upload:scale-125"
              />

              <div className="relative">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/document-upload:-translate-y-0.5 group-hover/document-upload:scale-105">
                    <Upload aria-hidden="true" className="size-6" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      File upload
                    </p>

                    <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/document-upload:text-[var(--color-deep-plum)]">
                      Choose document files
                      <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      Add one to three related PDF or image files to this document group.
                    </p>
                  </div>
                </div>

                <label className="mt-6 block cursor-pointer">
                  <span className="sr-only">Choose document files</span>

                  <div className="rounded-[1.5rem] border border-dashed border-[rgba(93,58,85,0.28)] bg-white/28 p-6 text-center transition-all duration-300 hover:border-[rgba(93,58,85,0.40)] hover:bg-white/42">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(31,27,29,0.05)]">
                      <FilePlus2 aria-hidden="true" className="size-7" />
                    </div>

                    <p className="mt-4 text-sm font-black text-[var(--color-near-black)]">
                      Select files from your device
                    </p>

                    <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                      PDF, JPEG, PNG or WebP. Maximum {EVENT_DOCUMENT_MAX_FILES} files and 10 MB per
                      file.
                    </p>

                    <span className="btn-secondary mt-5 inline-flex justify-center text-sm font-bold">
                      <Upload aria-hidden="true" className="size-4" />
                      Browse files
                    </span>

                    <input
                      className="sr-only"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      disabled={createDocumentMutation.isPending}
                      onChange={(event) => {
                        createDocumentMutation.reset();
                        setSelectedFiles(Array.from(event.target.files ?? []));
                      }}
                    />
                  </div>
                </label>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[var(--color-charcoal)]/48">
                    {selectedFiles.length} of {EVENT_DOCUMENT_MAX_FILES} files selected
                  </p>

                  {selectedFiles.length > 0 ? (
                    <button
                      type="button"
                      className="text-xs font-black text-[var(--color-muted-burgundy)] transition hover:text-[var(--color-rosewood)]"
                      disabled={createDocumentMutation.isPending}
                      onClick={() => {
                        createDocumentMutation.reset();
                        setSelectedFiles([]);
                      }}
                    >
                      Remove all
                    </button>
                  ) : null}
                </div>

                {selectedFiles.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {selectedFiles.map((file) => {
                      const isSelectedImage = file.type.startsWith('image/');

                      return (
                        <article
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="group/selected-file relative overflow-hidden rounded-[1.35rem] border border-white/58 bg-white/34 p-4 shadow-[0_10px_28px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-white/48 hover:shadow-[0_16px_38px_rgba(31,27,29,0.08)]"
                        >
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl transition duration-500 group-hover/selected-file:scale-125"
                          />

                          <div className="relative flex items-center gap-3">
                            <span
                              className={`grid size-11 shrink-0 place-items-center rounded-2xl shadow-[0_8px_20px_rgba(31,27,29,0.05)] ${
                                isSelectedImage
                                  ? 'bg-[rgba(175,201,216,0.24)] text-[#3b515b]'
                                  : 'bg-[rgba(124,74,90,0.11)] text-[var(--color-muted-burgundy)]'
                              }`}
                            >
                              {isSelectedImage ? (
                                <FileImage aria-hidden="true" className="size-5" />
                              ) : (
                                <FileText aria-hidden="true" className="size-5" />
                              )}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-[var(--color-near-black)] transition duration-300 group-hover/selected-file:text-[var(--color-deep-plum)]">
                                {file.name}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-lg border border-white/50 bg-white/32 px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                                  {isSelectedImage ? 'Image' : 'PDF'}
                                </span>

                                <span className="text-xs font-semibold text-[var(--color-charcoal)]/48">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="group/remove-selected-file grid size-9 shrink-0 place-items-center rounded-xl border border-[rgba(124,74,90,0.14)] bg-[rgba(124,74,90,0.07)] text-[var(--color-muted-burgundy)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.24)] hover:bg-[rgba(124,74,90,0.13)] hover:shadow-[0_10px_22px_rgba(124,74,90,0.08)]"
                              aria-label={`Remove ${file.name}`}
                              disabled={createDocumentMutation.isPending}
                              onClick={() => {
                                createDocumentMutation.reset();
                                setSelectedFiles((currentFiles) =>
                                  currentFiles.filter((currentFile) => currentFile !== file),
                                );
                              }}
                            >
                              <X
                                aria-hidden="true"
                                className="size-4 transition duration-300 group-hover/remove-selected-file:rotate-90"
                              />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.35rem] border border-dashed border-white/70 bg-white/22 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Paperclip aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        No files selected yet. At least one valid file is required before this
                        document group can be created.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {vendorsQuery.isError ? (
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
                      Vendor options unavailable
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                      {getApiErrorMessage(vendorsQuery.error)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {createDocumentMutation.isError ? (
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
                      Document could not be created
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                      {getApiErrorMessage(createDocumentMutation.error)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                  <FolderArchive aria-hidden="true" className="size-4" />
                </span>

                <p className="max-w-md text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                  The uploaded files will be stored together as one document group in this event’s
                  library.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary justify-center text-sm font-bold"
                  disabled={createDocumentMutation.isPending}
                  onClick={closeCreateDialog}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="group/create-document btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                  disabled={createDocumentMutation.isPending}
                  onClick={() => {
                    createDocumentMutation.mutate();
                  }}
                >
                  {createDocumentMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Upload
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/create-document:-translate-y-0.5"
                    />
                  )}

                  {createDocumentMutation.isPending ? 'Uploading document...' : 'Add document'}
                </button>
              </div>
            </div>
          </div>
        </WorkspaceModal>
      ) : null}

      {documentToEdit && isDocumentsEditable ? (
        <WorkspaceModal labelledBy="edit-event-document-title">
          <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                  <Pencil aria-hidden="true" className="size-6" />
                </div>

                <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                  Edit document group
                </span>
              </div>

              <h2
                id="edit-event-document-title"
                className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
              >
                Update document details.
              </h2>

              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                Change the title, description, category or linked vendor without replacing the files
                already stored in this group.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="status-chip" data-tone="plum">
                  <FolderArchive aria-hidden="true" className="size-3.5" />
                  {documentToEdit.files.length}{' '}
                  {documentToEdit.files.length === 1 ? 'stored file' : 'stored files'}
                </span>

                <span className="status-chip" data-tone="gray">
                  {categoryLabels[documentToEdit.category]}
                </span>

                {documentToEdit.vendor ? (
                  <span className="status-chip" data-tone="blue">
                    <Store aria-hidden="true" className="size-3.5" />
                    Vendor linked
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close edit document form"
              disabled={updateDocumentMutation.isPending}
              onClick={closeEditDialog}
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            <section className="relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-white/30 p-5 shadow-[0_14px_36px_rgba(31,27,29,0.04)] backdrop-blur-xl sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                  Document details
                </p>

                <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)]">
                  Refine how this group is organised.
                </h3>

                <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                  Update its identifying details without changing any of the files already stored
                  inside it.
                </p>

                <label className="mt-6 block">
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Title
                      <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                    </span>

                    <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                      {title.length.toLocaleString('en-LK')} / 150
                    </span>
                  </span>

                  <input
                    className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                    type="text"
                    maxLength={150}
                    value={title}
                    disabled={updateDocumentMutation.isPending}
                    placeholder="Enter a clear document-group title"
                    onChange={(event) => {
                      updateDocumentMutation.reset();
                      setTitle(event.target.value);
                    }}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Use a short title that makes this group easy to recognise in the event library.
                  </p>
                </label>

                <label className="mt-5 block">
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Description
                    </span>

                    <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                      {description.length.toLocaleString('en-LK')} / 2,000
                    </span>
                  </span>

                  <textarea
                    className="form-field mt-2 min-h-32 resize-y transition duration-300 focus:bg-white/52"
                    maxLength={2000}
                    value={description}
                    disabled={updateDocumentMutation.isPending}
                    placeholder="Add context about these files, their purpose or latest revision."
                    onChange={(event) => {
                      updateDocumentMutation.reset();
                      setDescription(event.target.value);
                    }}
                  />

                  <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                    Optional. Add details that will help you identify the correct files later.
                  </p>
                </label>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Category
                      <span className="ml-1 text-[var(--color-muted-burgundy)]">*</span>
                    </span>

                    <select
                      className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                      value={category}
                      disabled={updateDocumentMutation.isPending}
                      onChange={(event) => {
                        updateDocumentMutation.reset();
                        setCategory(event.target.value as EventDocumentCategory);
                      }}
                    >
                      {eventDocumentCategories.map((documentCategory) => (
                        <option key={documentCategory} value={documentCategory}>
                          {categoryLabels[documentCategory]}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                      The category determines how this group is classified in the archive.
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-[var(--color-charcoal)]/74">
                      Linked vendor
                    </span>

                    <select
                      className="form-field mt-2 min-h-12 transition duration-300 focus:bg-white/52"
                      value={vendorId}
                      disabled={updateDocumentMutation.isPending || vendorsQuery.isLoading}
                      onChange={(event) => {
                        updateDocumentMutation.reset();
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
                      Optional. Connect the group to the vendor these files belong to.
                    </p>
                  </label>
                </div>
              </div>
            </section>

            {updateDocumentMutation.isError ? (
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
                      Changes could not be saved
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                      {getApiErrorMessage(updateDocumentMutation.error)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                  <Pencil aria-hidden="true" className="size-4" />
                </span>

                <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                  Saving updates only changes this group’s details. Existing files remain untouched.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary justify-center text-sm font-bold"
                  disabled={updateDocumentMutation.isPending}
                  onClick={closeEditDialog}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="group/save-document btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                  disabled={updateDocumentMutation.isPending}
                  onClick={() => {
                    updateDocumentMutation.mutate();
                  }}
                >
                  {updateDocumentMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/save-document:scale-105"
                    />
                  )}

                  {updateDocumentMutation.isPending ? 'Saving changes...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </WorkspaceModal>
      ) : null}

      {documentForNewFiles && isDocumentsEditable ? (
        <WorkspaceModal labelledBy="add-document-files-title">
          <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                  <FilePlus2 aria-hidden="true" className="size-6" />
                </div>

                <span className="rounded-full border border-[rgba(175,201,216,0.24)] bg-[rgba(175,201,216,0.12)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#3b515b]">
                  Extend document group
                </span>
              </div>

              <h2
                id="add-document-files-title"
                className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
              >
                Add files to {documentForNewFiles.title}.
              </h2>

              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                Add more related files without changing the document group’s existing title,
                category or vendor link.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="status-chip" data-tone="blue">
                  <Files aria-hidden="true" className="size-3.5" />
                  {documentForNewFiles.files.length}{' '}
                  {documentForNewFiles.files.length === 1 ? 'file stored' : 'files stored'}
                </span>

                <span className="status-chip" data-tone="plum">
                  <FilePlus2 aria-hidden="true" className="size-3.5" />
                  {EVENT_DOCUMENT_MAX_FILES - documentForNewFiles.files.length}{' '}
                  {EVENT_DOCUMENT_MAX_FILES - documentForNewFiles.files.length === 1
                    ? 'slot remaining'
                    : 'slots remaining'}
                </span>

                <span className="status-chip" data-tone="gray">
                  <Upload aria-hidden="true" className="size-3.5" />
                  10 MB each
                </span>
              </div>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close add files form"
              disabled={addFilesMutation.isPending}
              onClick={closeAddFilesDialog}
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            <section className="group/add-files-upload relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(220,235,242,0.40))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-xl transition-all duration-300 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)] sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/add-files-upload:scale-125"
              />

              <div className="relative">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/add-files-upload:-translate-y-0.5 group-hover/add-files-upload:scale-105">
                    <Upload aria-hidden="true" className="size-6" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      File selection
                    </p>

                    <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/add-files-upload:text-[var(--color-deep-plum)]">
                      Choose additional files
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      Select up to {EVENT_DOCUMENT_MAX_FILES - documentForNewFiles.files.length}{' '}
                      additional PDF or image{' '}
                      {EVENT_DOCUMENT_MAX_FILES - documentForNewFiles.files.length === 1
                        ? 'file'
                        : 'files'}
                      .
                    </p>
                  </div>
                </div>

                <label className="mt-6 block cursor-pointer">
                  <span className="sr-only">Choose additional document files</span>

                  <div className="rounded-[1.5rem] border border-dashed border-[rgba(93,58,85,0.28)] bg-white/28 p-6 text-center transition-all duration-300 hover:border-[rgba(93,58,85,0.40)] hover:bg-white/42">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(31,27,29,0.05)]">
                      <FilePlus2 aria-hidden="true" className="size-7" />
                    </div>

                    <p className="mt-4 text-sm font-black text-[var(--color-near-black)]">
                      Select files from your device
                    </p>

                    <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                      PDF, JPEG, PNG or WebP. Each file must be 10 MB or smaller.
                    </p>

                    <span className="btn-secondary mt-5 inline-flex justify-center text-sm font-bold">
                      <Upload aria-hidden="true" className="size-4" />
                      Browse files
                    </span>

                    <input
                      className="sr-only"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      disabled={addFilesMutation.isPending}
                      onChange={(event) => {
                        addFilesMutation.reset();
                        setSelectedFiles(Array.from(event.target.files ?? []));
                      }}
                    />
                  </div>
                </label>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[var(--color-charcoal)]/48">
                    {selectedFiles.length}{' '}
                    {selectedFiles.length === 1 ? 'file selected' : 'files selected'}
                  </p>

                  {selectedFiles.length > 0 ? (
                    <button
                      type="button"
                      className="text-xs font-black text-[var(--color-muted-burgundy)] transition hover:text-[var(--color-rosewood)]"
                      disabled={addFilesMutation.isPending}
                      onClick={() => {
                        addFilesMutation.reset();
                        setSelectedFiles([]);
                      }}
                    >
                      Remove all
                    </button>
                  ) : null}
                </div>

                {selectedFiles.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {selectedFiles.map((file) => {
                      const isSelectedImage = file.type.startsWith('image/');

                      return (
                        <article
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="group/add-selected-file relative overflow-hidden rounded-[1.35rem] border border-white/58 bg-white/34 p-4 shadow-[0_10px_28px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-white/48 hover:shadow-[0_16px_38px_rgba(31,27,29,0.08)]"
                        >
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl transition duration-500 group-hover/add-selected-file:scale-125"
                          />

                          <div className="relative flex items-center gap-3">
                            <span
                              className={`grid size-11 shrink-0 place-items-center rounded-2xl shadow-[0_8px_20px_rgba(31,27,29,0.05)] ${
                                isSelectedImage
                                  ? 'bg-[rgba(175,201,216,0.24)] text-[#3b515b]'
                                  : 'bg-[rgba(124,74,90,0.11)] text-[var(--color-muted-burgundy)]'
                              }`}
                            >
                              {isSelectedImage ? (
                                <FileImage aria-hidden="true" className="size-5" />
                              ) : (
                                <FileText aria-hidden="true" className="size-5" />
                              )}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-[var(--color-near-black)] transition duration-300 group-hover/add-selected-file:text-[var(--color-deep-plum)]">
                                {file.name}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-lg border border-white/50 bg-white/32 px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                                  {isSelectedImage ? 'Image' : 'PDF'}
                                </span>

                                <span className="text-xs font-semibold text-[var(--color-charcoal)]/48">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="group/remove-add-file grid size-9 shrink-0 place-items-center rounded-xl border border-[rgba(124,74,90,0.14)] bg-[rgba(124,74,90,0.07)] text-[var(--color-muted-burgundy)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.24)] hover:bg-[rgba(124,74,90,0.13)] hover:shadow-[0_10px_22px_rgba(124,74,90,0.08)]"
                              aria-label={`Remove ${file.name}`}
                              disabled={addFilesMutation.isPending}
                              onClick={() => {
                                addFilesMutation.reset();
                                setSelectedFiles((currentFiles) =>
                                  currentFiles.filter((currentFile) => currentFile !== file),
                                );
                              }}
                            >
                              <X
                                aria-hidden="true"
                                className="size-4 transition duration-300 group-hover/remove-add-file:rotate-90"
                              />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.35rem] border border-dashed border-white/70 bg-white/22 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Paperclip aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        No additional files selected yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {addFilesMutation.isError ? (
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
                      Files could not be added
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                      {getApiErrorMessage(addFilesMutation.error)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.20)] text-[#3b515b]">
                  <Files aria-hidden="true" className="size-4" />
                </span>

                <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                  New files will be added to this group without changing the files already stored.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary justify-center text-sm font-bold"
                  disabled={addFilesMutation.isPending}
                  onClick={closeAddFilesDialog}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="group/confirm-add-files btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                  disabled={addFilesMutation.isPending}
                  onClick={() => {
                    addFilesMutation.mutate();
                  }}
                >
                  {addFilesMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Upload
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/confirm-add-files:-translate-y-0.5"
                    />
                  )}

                  {addFilesMutation.isPending ? 'Uploading files...' : 'Add files'}
                </button>
              </div>
            </div>
          </div>
        </WorkspaceModal>
      ) : null}

      {fileToReplace && isDocumentsEditable ? (
        <WorkspaceModal labelledBy="replace-document-file-title">
          <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.24)] text-[var(--color-deep-plum)] shadow-[0_10px_24px_rgba(31,27,29,0.05)]">
                  <Replace aria-hidden="true" className="size-6" />
                </div>

                <span className="rounded-full border border-[rgba(93,58,85,0.16)] bg-[rgba(93,58,85,0.08)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-deep-plum)]">
                  Replace stored file
                </span>
              </div>

              <h2
                id="replace-document-file-title"
                className="mt-6 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
              >
                Replace {fileToReplace.file.originalName}.
              </h2>

              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/64 sm:text-base">
                Upload a new PDF or image to take this file’s place inside{' '}
                <strong className="font-black text-[var(--color-near-black)]">
                  {fileToReplace.document.title}
                </strong>
                .
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="status-chip" data-tone="plum">
                  <FolderArchive aria-hidden="true" className="size-3.5" />
                  {fileToReplace.document.title}
                </span>

                <span className="status-chip" data-tone="blue">
                  <Files aria-hidden="true" className="size-3.5" />
                  {fileToReplace.document.files.length}{' '}
                  {fileToReplace.document.files.length === 1 ? 'stored file' : 'stored files'}
                </span>

                <span className="status-chip" data-tone="gray">
                  <Upload aria-hidden="true" className="size-3.5" />
                  10 MB maximum
                </span>
              </div>

              <div className="mt-5 rounded-[1.35rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.08)] p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                    <CircleAlert aria-hidden="true" className="size-4" />
                  </span>

                  <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/60">
                    The current cloud file will be removed only after the replacement uploads
                    successfully.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close replacement form"
              disabled={replaceFileMutation.isPending}
              onClick={closeReplaceFileDialog}
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>

          <div className="mt-8 grid gap-5">
            <section className="group/replacement-upload relative overflow-hidden rounded-[1.65rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.68),rgba(220,235,242,0.40))] p-5 shadow-[0_16px_44px_rgba(31,27,29,0.05)] backdrop-blur-xl transition-all duration-300 hover:border-white/86 hover:shadow-[0_22px_58px_rgba(31,27,29,0.09)] sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition duration-500 group-hover/replacement-upload:scale-125"
              />

              <div className="relative">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(175,201,216,0.24)] text-[#3b515b] shadow-[0_10px_24px_rgba(31,27,29,0.05)] transition duration-300 group-hover/replacement-upload:-translate-y-0.5 group-hover/replacement-upload:scale-105">
                    <Replace aria-hidden="true" className="size-6" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                      Replacement file
                    </p>

                    <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/replacement-upload:text-[var(--color-deep-plum)]">
                      Choose a new file
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      Select one valid PDF or image to replace the current stored file.
                    </p>
                  </div>
                </div>

                <label className="mt-6 block cursor-pointer">
                  <span className="sr-only">Choose replacement file</span>

                  <div className="rounded-[1.5rem] border border-dashed border-[rgba(93,58,85,0.28)] bg-white/28 p-6 text-center transition-all duration-300 hover:border-[rgba(93,58,85,0.40)] hover:bg-white/42">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(31,27,29,0.05)]">
                      <Upload aria-hidden="true" className="size-7" />
                    </div>

                    <p className="mt-4 text-sm font-black text-[var(--color-near-black)]">
                      Select a replacement from your device
                    </p>

                    <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                      PDF, JPEG, PNG or WebP. The selected file must be 10 MB or smaller.
                    </p>

                    <span className="btn-secondary mt-5 inline-flex justify-center text-sm font-bold">
                      <Replace aria-hidden="true" className="size-4" />
                      Browse replacement
                    </span>

                    <input
                      className="sr-only"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      disabled={replaceFileMutation.isPending}
                      onChange={(event) => {
                        replaceFileMutation.reset();
                        setSelectedReplacementFile(event.target.files?.[0] ?? null);
                      }}
                    />
                  </div>
                </label>

                {selectedReplacementFile ? (
                  <article className="group/replacement-preview relative mt-5 overflow-hidden rounded-[1.35rem] border border-white/58 bg-white/34 p-4 shadow-[0_10px_28px_rgba(31,27,29,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/82 hover:bg-white/48 hover:shadow-[0_16px_38px_rgba(31,27,29,0.08)]">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-[rgba(175,201,216,0.14)] blur-3xl transition duration-500 group-hover/replacement-preview:scale-125"
                    />

                    <div className="relative flex items-center gap-3">
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-2xl shadow-[0_8px_20px_rgba(31,27,29,0.05)] ${
                          selectedReplacementFile.type.startsWith('image/')
                            ? 'bg-[rgba(175,201,216,0.24)] text-[#3b515b]'
                            : 'bg-[rgba(124,74,90,0.11)] text-[var(--color-muted-burgundy)]'
                        }`}
                      >
                        {selectedReplacementFile.type.startsWith('image/') ? (
                          <FileImage aria-hidden="true" className="size-5" />
                        ) : (
                          <FileText aria-hidden="true" className="size-5" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[var(--color-near-black)] transition duration-300 group-hover/replacement-preview:text-[var(--color-deep-plum)]">
                          {selectedReplacementFile.name}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg border border-white/50 bg-white/32 px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.12em] text-[var(--color-charcoal)]/48">
                            {selectedReplacementFile.type.startsWith('image/') ? 'Image' : 'PDF'}
                          </span>

                          <span className="text-xs font-semibold text-[var(--color-charcoal)]/48">
                            {formatFileSize(selectedReplacementFile.size)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="group/remove-replacement grid size-9 shrink-0 place-items-center rounded-xl border border-[rgba(124,74,90,0.14)] bg-[rgba(124,74,90,0.07)] text-[var(--color-muted-burgundy)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(124,74,90,0.24)] hover:bg-[rgba(124,74,90,0.13)] hover:shadow-[0_10px_22px_rgba(124,74,90,0.08)]"
                        aria-label={`Remove ${selectedReplacementFile.name}`}
                        disabled={replaceFileMutation.isPending}
                        onClick={() => {
                          replaceFileMutation.reset();
                          setSelectedReplacementFile(null);
                        }}
                      >
                        <X
                          aria-hidden="true"
                          className="size-4 transition duration-300 group-hover/remove-replacement:rotate-90"
                        />
                      </button>
                    </div>
                  </article>
                ) : (
                  <div className="mt-5 rounded-[1.35rem] border border-dashed border-white/70 bg-white/22 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                        <Paperclip aria-hidden="true" className="size-4" />
                      </span>

                      <p className="text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                        No replacement file selected yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {replaceFileMutation.isError ? (
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
                      File could not be replaced
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                      {getApiErrorMessage(replaceFileMutation.error)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-5 border-t border-white/55 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(183,167,200,0.18)] text-[var(--color-deep-plum)]">
                  <Replace aria-hidden="true" className="size-4" />
                </span>

                <p className="max-w-sm text-xs font-semibold leading-6 text-[var(--color-charcoal)]/52">
                  The replacement keeps the same document group and file position while updating the
                  stored asset.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  className="btn-secondary justify-center text-sm font-bold"
                  disabled={replaceFileMutation.isPending}
                  onClick={closeReplaceFileDialog}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="group/confirm-replacement btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                  disabled={replaceFileMutation.isPending}
                  onClick={() => {
                    replaceFileMutation.mutate();
                  }}
                >
                  {replaceFileMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Replace
                      aria-hidden="true"
                      className="size-4 transition duration-300 group-hover/confirm-replacement:rotate-12"
                    />
                  )}

                  {replaceFileMutation.isPending ? 'Replacing file...' : 'Replace file'}
                </button>
              </div>
            </div>
          </div>
        </WorkspaceModal>
      ) : null}

      {documentToDelete && isDocumentsEditable ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-document-title"
          onClick={() => {
            if (!deleteDocumentMutation.isPending) {
              closeDeleteDocumentDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-[2.15rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(249,235,240,0.85))] p-6 shadow-[0_40px_110px_rgba(31,27,29,0.26)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-14 place-items-center rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_12px_28px_rgba(124,74,90,0.08)]">
                    <Trash2 aria-hidden="true" className="size-7" />
                  </div>

                  <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                    Permanent action
                  </span>
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
                  Delete document group
                </p>

                <h2
                  id="delete-event-document-title"
                  className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                >
                  Delete this document?
                </h2>

                <p className="mt-4 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66">
                  <strong className="font-black text-[var(--color-near-black)]">
                    {documentToDelete.title}
                  </strong>{' '}
                  and all associated files will be permanently removed from this event library.
                </p>

                <div className="mt-6 rounded-[1.45rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.08)] p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                      <Files aria-hidden="true" className="size-5" />
                    </span>

                    <div>
                      <p className="text-sm font-black text-[var(--color-near-black)]">
                        {documentToDelete.files.length}{' '}
                        {documentToDelete.files.length === 1 ? 'file' : 'files'} will be deleted
                      </p>

                      <p className="mt-2 text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        This also removes the stored cloud files and cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                {deleteDocumentMutation.isError ? (
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
                          Document could not be deleted
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                          {getApiErrorMessage(deleteDocumentMutation.error)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={deleteDocumentMutation.isPending}
                    onClick={closeDeleteDocumentDialog}
                  >
                    Keep document
                  </button>

                  <button
                    type="button"
                    className="group/delete-document-confirm flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deleteDocumentMutation.isPending}
                    onClick={() => {
                      deleteDocumentMutation.mutate();
                    }}
                  >
                    {deleteDocumentMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/delete-document-confirm:scale-105"
                      />
                    )}

                    {deleteDocumentMutation.isPending ? 'Deleting document...' : 'Delete document'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {fileToDelete && isDocumentsEditable ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.60)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-document-file-title"
          onClick={() => {
            if (!deleteFileMutation.isPending) {
              closeDeleteFileDialog();
            }
          }}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-[2.15rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.91),rgba(249,235,240,0.85))] p-6 shadow-[0_40px_110px_rgba(31,27,29,0.26)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-[rgba(210,146,160,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-14 place-items-center rounded-2xl border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_12px_28px_rgba(124,74,90,0.08)]">
                    <Trash2 aria-hidden="true" className="size-7" />
                  </div>

                  <span className="rounded-full border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.09)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted-burgundy)]">
                    Permanent action
                  </span>
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-muted-burgundy)]">
                  Delete stored file
                </p>

                <h2
                  id="delete-event-document-file-title"
                  className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                >
                  Delete this file?
                </h2>

                <p className="mt-4 text-sm font-semibold leading-7 text-[var(--color-charcoal)]/66">
                  <strong className="font-black text-[var(--color-near-black)]">
                    {fileToDelete.file.originalName}
                  </strong>{' '}
                  will be removed from{' '}
                  <strong className="font-black text-[var(--color-near-black)]">
                    {fileToDelete.document.title}
                  </strong>{' '}
                  and deleted from cloud storage.
                </p>

                <div className="mt-6 rounded-[1.45rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(124,74,90,0.08)] p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)]">
                      <FileText aria-hidden="true" className="size-5" />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-near-black)]">
                        {fileToDelete.file.originalName}
                      </p>

                      <p className="mt-2 text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                        {formatFileSize(fileToDelete.file.fileSize)} ·{' '}
                        {isImageFile(fileToDelete.file) ? 'Image file' : 'PDF file'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.35rem] border border-[rgba(175,201,216,0.22)] bg-[rgba(222,236,242,0.28)] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.24)] text-[#3b515b]">
                      <FolderArchive aria-hidden="true" className="size-4" />
                    </span>

                    <p className="text-xs font-semibold leading-6 text-[var(--color-charcoal)]/58">
                      The document group will remain available with its other stored files.
                    </p>
                  </div>
                </div>

                {deleteFileMutation.isError ? (
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
                          File could not be deleted
                        </p>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/66">
                          {getApiErrorMessage(deleteFileMutation.error)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary justify-center text-sm font-bold"
                    disabled={deleteFileMutation.isPending}
                    onClick={closeDeleteFileDialog}
                  >
                    Keep file
                  </button>

                  <button
                    type="button"
                    className="group/delete-file-confirm flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,74,90,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(124,74,90,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deleteFileMutation.isPending}
                    onClick={() => {
                      deleteFileMutation.mutate();
                    }}
                  >
                    {deleteFileMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/delete-file-confirm:scale-105"
                      />
                    )}

                    {deleteFileMutation.isPending ? 'Deleting file...' : 'Delete file'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
