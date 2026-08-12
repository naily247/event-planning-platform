import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileText,
  LoaderCircle,
  MapPin,
  MessageSquareQuote,
  PackageCheck,
  Plus,
  Search,
  Send,
  Sparkles,
  Store,
  Tags,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  acceptQuotation,
  createQuotationRequest,
  getQuotationRequestQuotations,
  getQuotationRequests,
  quotationRequestStatuses,
  type CustomerQuotation,
  type CustomerQuotationRequest,
  type QuotationRequestSort,
  type QuotationRequestStatus,
  type QuotationStatus,
} from '../features/quotationRequests/quotationRequest.api';

import { createCustomerBooking, type CustomerBooking } from '../features/bookings/booking.api';

import { api } from '../lib/api';
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

type PublicPackage = {
  id: string;
  title: string;
  description: string | null;
  basePrice: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  vendor: {
    id: string;
    businessName: string;
    slug: string;
    baseLocation: string | null;
    serviceAreas: string[];
  };
  createdAt: string;
  updatedAt: string;
};

type PackagePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type PackageListResponse = {
  success: true;
  data: PublicPackage[];
  meta: {
    pagination: PackagePagination;
  };
};

type StatusFilter = QuotationRequestStatus | '';

const quotationRequestStatusLabels: Record<QuotationRequestStatus, string> = {
  SENT: 'Sent',
  VIEWED: 'Viewed',
  CLARIFICATION_REQUESTED: 'Clarification requested',
  QUOTED: 'Quotation received',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CLOSED: 'Closed',
};

const quotationStatusLabels: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  CLARIFICATION_REQUESTED: 'Clarification requested',
  REVISED: 'Revised',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
};

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return error instanceof Error
      ? error.message
      : 'Something went wrong while loading quotation requests.';
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    'Something went wrong while loading quotation requests.'
  );
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatLongDate = (value: string) =>
  new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'long',
  }).format(new Date(value));

const formatCurrency = (value: string | null) => {
  if (!value) {
    return 'Price on request';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Price on request';
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const toIsoDateTimeOrNull = (value: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const date = new Date(normalizedValue);

  if (!Number.isFinite(date.getTime())) {
    throw new Error('Choose a valid response deadline.');
  }

  if (date.getTime() <= Date.now()) {
    throw new Error('Response deadline must be in the future.');
  }

  return date.toISOString();
};

const toIsoServiceDateTime = (value: string, fieldLabel: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldLabel} is required.`);
  }

  const date = new Date(normalizedValue);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Choose a valid ${fieldLabel.toLowerCase()}.`);
  }

  if (date.getTime() <= Date.now()) {
    throw new Error(`${fieldLabel} must be in the future.`);
  }

  return date.toISOString();
};

const toOptionalIsoServiceDateTime = (value: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const date = new Date(normalizedValue);

  if (!Number.isFinite(date.getTime())) {
    throw new Error('Choose a valid service end time.');
  }

  return date.toISOString();
};

const toLocalDateTimeInput = (value: string) => {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getRequestTone = (
  status: QuotationRequestStatus,
): 'gray' | 'blue' | 'green' | 'plum' | 'rose' => {
  switch (status) {
    case 'ACCEPTED':
      return 'green';

    case 'QUOTED':
    case 'CLARIFICATION_REQUESTED':
      return 'plum';

    case 'VIEWED':
      return 'blue';

    case 'DECLINED':
    case 'CLOSED':
      return 'rose';

    case 'SENT':
    default:
      return 'gray';
  }
};

const getQuotationTone = (status: QuotationStatus): 'gray' | 'blue' | 'green' | 'plum' | 'rose' => {
  switch (status) {
    case 'ACCEPTED':
      return 'green';

    case 'REJECTED':
    case 'WITHDRAWN':
    case 'EXPIRED':
      return 'rose';

    case 'VIEWED':
      return 'blue';

    case 'SENT':
    case 'REVISED':
    case 'CLARIFICATION_REQUESTED':
      return 'plum';

    case 'DRAFT':
    default:
      return 'gray';
  }
};

const isQuotationExpired = (quotation: CustomerQuotation) =>
  Boolean(quotation.expiresAt && new Date(quotation.expiresAt).getTime() <= Date.now());

export function QuotationRequestsWorkspacePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sort, setSort] = useState<QuotationRequestSort>('newest');
  const [page, setPage] = useState(1);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CustomerQuotationRequest | null>(null);
  const [quotationToAccept, setQuotationToAccept] = useState<CustomerQuotation | null>(null);
  const [quotationToBook, setQuotationToBook] = useState<CustomerQuotation | null>(null);
  const [createdBooking, setCreatedBooking] = useState<CustomerBooking | null>(null);
  const [serviceStart, setServiceStart] = useState('');
  const [serviceEnd, setServiceEnd] = useState('');

  const [packageSearchInput, setPackageSearchInput] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PublicPackage | null>(null);
  const [requirements, setRequirements] = useState('');
  const [responseDueAt, setResponseDueAt] = useState('');

  const requestsQuery = useQuery({
    queryKey: [
      'customer',
      'events',
      eventId,
      'quotation-requests',
      {
        page,
        status: statusFilter,
        sort,
      },
    ],
    enabled: Boolean(eventId),
    queryFn: () =>
      getQuotationRequests({
        eventId: eventId!,
        page,
        limit: 20,
        status: statusFilter || undefined,
        sort,
      }),
  });

  const summaryQueries = useQuery({
    queryKey: ['customer', 'events', eventId, 'quotation-requests', 'summary-counts'],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const statuses: QuotationRequestStatus[] = [
        'SENT',
        'VIEWED',
        'CLARIFICATION_REQUESTED',
        'QUOTED',
        'ACCEPTED',
        'DECLINED',
        'CLOSED',
      ];

      const results = await Promise.all(
        statuses.map(async (requestStatus) => {
          const result = await getQuotationRequests({
            eventId: eventId!,
            status: requestStatus,
            page: 1,
            limit: 1,
            sort: 'newest',
          });

          return [requestStatus, result.pagination.total] as const;
        }),
      );

      return Object.fromEntries(results) as Record<QuotationRequestStatus, number>;
    },
  });

  const packagesQuery = useQuery({
    queryKey: ['public', 'packages', 'quotation-request-options', packageSearch],
    enabled: isCreateDialogOpen,
    queryFn: async () => {
      const response = await api.get<PackageListResponse>('/packages', {
        params: {
          page: 1,
          limit: 50,
          sort: 'title_asc',
          ...(packageSearch && {
            search: packageSearch,
          }),
        },
      });

      return {
        packages: response.data.data,
        pagination: response.data.meta.pagination,
      };
    },
  });

  const quotationsQuery = useQuery({
    queryKey: ['customer', 'quotation-requests', selectedRequest?.id, 'quotations'],
    enabled: Boolean(selectedRequest),
    queryFn: () => getQuotationRequestQuotations(selectedRequest!.id),
  });

  const invalidateQuotationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['customer', 'events', eventId, 'quotation-requests'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['notifications'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['dashboard', 'customer'],
      }),
    ]);
  };

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) {
        throw new Error('Event ID is missing.');
      }

      if (!selectedPackage) {
        throw new Error('Choose a service package.');
      }

      const normalizedRequirements = requirements.trim();

      if (normalizedRequirements.length < 10) {
        throw new Error('Requirements must contain at least 10 characters.');
      }

      if (normalizedRequirements.length > 5000) {
        throw new Error('Requirements cannot exceed 5000 characters.');
      }

      const normalizedDeadline = toIsoDateTimeOrNull(responseDueAt);

      return createQuotationRequest({
        eventId,
        packageId: selectedPackage.id,
        requirements: normalizedRequirements,
        responseDueAt: normalizedDeadline,
      });
    },

    onSuccess: async () => {
      setIsCreateDialogOpen(false);
      setSelectedPackage(null);
      setPackageSearch('');
      setPackageSearchInput('');
      setRequirements('');
      setResponseDueAt('');

      await invalidateQuotationQueries();
    },
  });

  const acceptQuotationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequest || !quotationToAccept) {
        throw new Error('Quotation details are missing.');
      }

      return acceptQuotation(selectedRequest.id, quotationToAccept.id);
    },

    onSuccess: async () => {
      setQuotationToAccept(null);

      await Promise.all([
        invalidateQuotationQueries(),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'quotation-requests', selectedRequest?.id, 'quotations'],
        }),
      ]);
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!quotationToBook) {
        throw new Error('Accepted quotation details are missing.');
      }

      const normalizedServiceStart = toIsoServiceDateTime(serviceStart, 'Service start');

      const normalizedServiceEnd = toOptionalIsoServiceDateTime(serviceEnd);

      if (
        normalizedServiceEnd &&
        new Date(normalizedServiceEnd).getTime() <= new Date(normalizedServiceStart).getTime()
      ) {
        throw new Error('Service end must be after the service start.');
      }

      return createCustomerBooking({
        quotationId: quotationToBook.id,
        serviceStart: normalizedServiceStart,
        serviceEnd: normalizedServiceEnd,
      });
    },

    onSuccess: async (booking) => {
      setCreatedBooking(booking);
      setQuotationToBook(null);
      setServiceStart('');
      setServiceEnd('');

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['customer', 'events', eventId, 'bookings'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['customer', 'bookings'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['notifications'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'customer'],
        }),
      ]);
    },
  });

  const openCreateDialog = () => {
    if (!isQuotationEditable) {
      return;
    }

    createRequestMutation.reset();
    setSelectedPackage(null);
    setPackageSearch('');
    setPackageSearchInput('');
    setRequirements('');
    setResponseDueAt('');
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    if (createRequestMutation.isPending) {
      return;
    }

    createRequestMutation.reset();
    setIsCreateDialogOpen(false);
    setSelectedPackage(null);
    setPackageSearch('');
    setPackageSearchInput('');
    setRequirements('');
    setResponseDueAt('');
  };

  const closeQuotationDialog = () => {
    if (acceptQuotationMutation.isPending) {
      return;
    }

    setSelectedRequest(null);
    setQuotationToAccept(null);
    acceptQuotationMutation.reset();
  };

  const openCreateBookingDialog = (quotation: CustomerQuotation) => {
    if (!isBookingCreationAllowed) {
      return;
    }

    createBookingMutation.reset();
    setCreatedBooking(null);
    setQuotationToBook(quotation);
    setServiceStart(selectedRequest ? toLocalDateTimeInput(selectedRequest.event.eventDate) : '');
    setServiceEnd('');
  };

  const closeCreateBookingDialog = () => {
    if (createBookingMutation.isPending) {
      return;
    }

    createBookingMutation.reset();
    setQuotationToBook(null);
    setServiceStart('');
    setServiceEnd('');
  };

  const filtersAreActive = Boolean(statusFilter) || sort !== 'newest';

  const clearFilters = () => {
    setStatusFilter('');
    setSort('newest');
    setPage(1);
  };

  const isLoading = requestsQuery.isLoading || summaryQueries.isLoading;

  const isError = requestsQuery.isError || summaryQueries.isError;

  const firstError = requestsQuery.error ?? summaryQueries.error;

  const requestCounts = summaryQueries.data;

  const totalRequests = useMemo(() => {
    if (!requestCounts) {
      return 0;
    }

    return Object.values(requestCounts).reduce((sum, count) => sum + count, 0);
  }, [requestCounts]);

  if (isLoading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

            <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
              Opening quotation requests
            </p>

            <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/62">
              Loading vendors, packages, responses and pricing activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !eventId || !requestsQuery.data || !requestCounts) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="glass-card grid min-h-80 w-full max-w-3xl place-items-center p-10 text-center">
          <div className="max-w-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(130,72,77,0.12)] text-[var(--color-rosewood)]">
              <CircleAlert className="size-7" />
            </div>

            <p className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
              Quotation workspace unavailable
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
                    void Promise.all([requestsQuery.refetch(), summaryQueries.refetch()]);
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

  const requests = requestsQuery.data.quotationRequests;
  const pagination = requestsQuery.data.pagination;

  const eventDetails = requests[0]?.event ?? null;

  const isQuotationEditable =
    eventDetails !== null ? canManageWorkspace(eventDetails.status, 'QUOTATIONS') : false;

  const quotationLockedMessage =
    eventDetails !== null ? getWorkspaceLockedMessage(eventDetails.status, 'QUOTATIONS') : '';

  const isBookingCreationAllowed =
    eventDetails !== null ? canManageWorkspace(eventDetails.status, 'BOOKINGS') : false;

  const bookingLockedMessage =
    eventDetails !== null ? getWorkspaceLockedMessage(eventDetails.status, 'BOOKINGS') : '';

  const awaitingVendorCount = requestCounts.SENT + requestCounts.VIEWED;

  const quotationProgress =
    totalRequests > 0
      ? Math.round(((requestCounts.QUOTED + requestCounts.ACCEPTED) / totalRequests) * 100)
      : 0;

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
                Quotation requests
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                {eventDetails?.name ?? 'Event quotations'}
              </h1>
            </div>
          </div>

          <span className="status-chip w-fit" data-tone="plum">
            <MessageSquareQuote className="size-4" />
            {totalRequests} requests
          </span>
        </header>

        <main className="py-10">
          <section className="relative isolate min-h-[22rem] overflow-hidden rounded-[2.5rem] border border-white/68 bg-[#fffaf6] px-6 py-5 shadow-[0_26px_78px_rgba(31,27,29,0.11)] sm:px-7 sm:py-6 lg:px-8 lg:py-6">
            <img
              src="/images/workspaces/shortcuts/quotations.png"
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
                  Vendor quotations
                </div>

                <div className="mt-2.5 max-w-[32rem] rounded-[1.3rem] border border-white/44 bg-white/[0.15] px-5 py-3 shadow-[0_14px_36px_rgba(31,27,29,0.055)] backdrop-blur-[3px]">
                  <h2 className="max-w-[30rem] text-balance text-[2rem] font-black leading-[0.98] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-[2.2rem] lg:text-[2.35rem]">
                    Compare proposals before making commitments.
                  </h2>

                  <p className="mt-2.5 max-w-[30rem] text-sm font-semibold leading-[1.4rem] text-[var(--color-charcoal)]/70">
                    Request vendor quotations, review pricing and inclusions, then approve the
                    proposal that best matches your event.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="group/hero-request-quotation btn-primary ..."
                      disabled={!isQuotationEditable}
                      title={!isQuotationEditable ? quotationLockedMessage : undefined}
                      onClick={() => {
                        if (!isQuotationEditable) {
                          return;
                        }

                        openCreateDialog();
                      }}
                    >
                      <Plus
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/hero-request-quotation:rotate-90"
                      />
                      Request quotation
                    </button>

                    <span className="rounded-full border border-white/72 bg-white/46 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-[var(--color-deep-plum)] shadow-[0_10px_26px_rgba(31,27,29,0.07)] backdrop-blur-xl">
                      <CalendarClock aria-hidden="true" className="mr-1.5 inline size-3.5" />
                      {eventDetails
                        ? formatLongDate(eventDetails.eventDate)
                        : 'Event date unavailable'}
                    </span>
                  </div>

                  <div className="mt-3 max-w-[26rem] rounded-[1.1rem] border border-white/56 bg-white/34 px-4 py-2.5 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/48">
                          Request completion
                        </p>

                        <p className="mt-1 text-[0.68rem] font-semibold text-[var(--color-charcoal)]/54">
                          Quoted or accepted requests
                        </p>
                      </div>

                      <p className="text-sm font-black text-[var(--color-deep-plum)]">
                        {quotationProgress}%
                      </p>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(93,58,85,0.09)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-deep-plum),var(--color-muted-burgundy),#d7b7c3)] transition-[width] duration-700"
                        style={{
                          width: `${Math.min(Math.max(quotationProgress, 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid max-w-[49rem] gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="group/quotation-metric rounded-[1.3rem] border border-white/68 bg-white/40 px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/56 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)] transition duration-300 group-hover/quotation-metric:scale-105">
                    <MessageSquareQuote aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Total requests
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {totalRequests}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    {awaitingVendorCount} awaiting vendor action
                  </p>
                </article>

                <article className="group/quotation-metric rounded-[1.3rem] border border-white/68 bg-[rgba(240,247,250,0.48)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(175,201,216,0.28)] text-[#334954] transition duration-300 group-hover/quotation-metric:scale-105">
                    <WalletCards aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Quotations received
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {requestCounts.QUOTED + requestCounts.ACCEPTED}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Ready for review and comparison
                  </p>
                </article>

                <article className="group/quotation-metric rounded-[1.3rem] border border-white/68 bg-[rgba(244,246,236,0.50)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <span className="grid size-9 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#596449] transition duration-300 group-hover/quotation-metric:scale-105">
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                  </span>

                  <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/46">
                    Accepted
                  </p>

                  <p className="mt-1 text-[1.75rem] font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                    {requestCounts.ACCEPTED}
                  </p>

                  <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Approved vendor proposals
                  </p>
                </article>

                <article className="group/quotation-metric rounded-[1.3rem] border border-[rgba(124,74,90,0.16)] bg-[rgba(249,235,240,0.52)] px-4 py-2.5 shadow-[0_14px_34px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/58 hover:shadow-[0_20px_44px_rgba(31,27,29,0.12)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)] transition duration-300 group-hover/quotation-metric:scale-105">
                      <Clock3 aria-hidden="true" className="size-4" />
                    </span>

                    <span className="rounded-full border border-[rgba(124,74,90,0.14)] bg-white/38 px-2 py-1 text-[0.52rem] font-black uppercase tracking-[0.12em] text-[var(--color-muted-burgundy)]">
                      Workflow
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 divide-x divide-[rgba(124,74,90,0.12)]">
                    <div className="pr-2">
                      <p className="text-[0.5rem] font-black uppercase tracking-[0.11em] text-[var(--color-charcoal)]/46">
                        Awaiting
                      </p>

                      <p className="mt-1 text-xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                        {awaitingVendorCount}
                      </p>
                    </div>

                    <div className="px-2">
                      <p className="text-[0.5rem] font-black uppercase tracking-[0.11em] text-[var(--color-charcoal)]/46">
                        Clarify
                      </p>

                      <p className="mt-1 text-xl font-black tracking-[-0.05em] text-[var(--color-deep-plum)]">
                        {requestCounts.CLARIFICATION_REQUESTED}
                      </p>
                    </div>

                    <div className="pl-2">
                      <p className="text-[0.5rem] font-black uppercase tracking-[0.11em] text-[var(--color-charcoal)]/46">
                        Closed
                      </p>

                      <p className="mt-1 text-xl font-black tracking-[-0.05em] text-[var(--color-muted-burgundy)]">
                        {requestCounts.CLOSED + requestCounts.DECLINED}
                      </p>
                    </div>
                  </div>

                  <p className="mt-1.5 text-[0.66rem] font-semibold leading-4 text-[var(--color-charcoal)]/54">
                    Pending and inactive request states
                  </p>
                </article>
              </div>
            </div>
          </section>

          {!isQuotationEditable ? (
            <div className="mt-6 rounded-[1.4rem] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] px-5 py-4">
              <p className="text-sm font-bold text-[var(--color-muted-burgundy)]">
                {quotationLockedMessage}
              </p>
            </div>
          ) : null}

          <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.3fr]">
            <article className="glass-card p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--color-rosewood)]">
                    Request history
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]">
                    Vendor quotation activity.
                  </h2>
                </div>

                <button
                  type="button"
                  className="btn-primary shrink-0 text-sm font-bold"
                  disabled={!isQuotationEditable}
                  title={!isQuotationEditable ? quotationLockedMessage : undefined}
                  onClick={() => {
                    if (!isQuotationEditable) {
                      return;
                    }

                    openCreateDialog();
                  }}
                >
                  <Plus className="size-4" />
                  Request quotation
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <select
                  className="form-field min-h-12"
                  aria-label="Filter quotation requests by status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>

                  {quotationRequestStatuses.map((requestStatus) => (
                    <option key={requestStatus} value={requestStatus}>
                      {quotationRequestStatusLabels[requestStatus]}
                    </option>
                  ))}
                </select>

                <select
                  className="form-field min-h-12"
                  aria-label="Sort quotation requests"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as QuotationRequestSort);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>

              {filtersAreActive ? (
                <button
                  type="button"
                  className="btn-secondary mt-4 text-sm font-bold"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : null}

              {requests.length > 0 ? (
                <div className="mt-8 space-y-4">
                  {requests.map((request) => (
                    <article
                      key={request.id}
                      className="group/request relative overflow-hidden rounded-[1.65rem] border border-white/58 bg-[linear-gradient(145deg,rgba(255,255,255,0.36),rgba(255,255,255,0.18))] p-4 shadow-[0_18px_45px_rgba(31,27,29,0.05)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/88 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(231,222,240,0.58))] hover:shadow-[0_28px_68px_rgba(31,27,29,0.11)] sm:p-5"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[rgba(183,167,200,0.16)] opacity-60 blur-3xl transition duration-500 group-hover/request:scale-125 group-hover/request:bg-[rgba(183,167,200,0.30)] group-hover/request:opacity-100"
                      />

                      <div className="relative">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="status-chip transition duration-300 group-hover/request:-translate-y-0.5 group-hover/request:scale-[1.02] group-hover/request:shadow-[0_8px_20px_rgba(31,27,29,0.08)]"
                                data-tone={getRequestTone(request.status)}
                              >
                                {quotationRequestStatusLabels[request.status]}
                              </span>

                              {request.package?.category ? (
                                <span
                                  className="status-chip transition duration-300 group-hover/request:-translate-y-0.5 group-hover/request:bg-white/54"
                                  data-tone="gray"
                                >
                                  <Tags className="size-3.5" />
                                  {request.package.category.name}
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] transition duration-300 group-hover/request:translate-x-0.5 group-hover/request:text-[var(--color-deep-plum)]">
                              {request.package?.title ?? 'Custom service request'}
                            </h3>

                            <Link
                              to={`/vendors/${request.vendor.slug}`}
                              className="group/vendor-link mt-3 inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)] transition duration-300 hover:translate-x-0.5 hover:text-[var(--color-rosewood)]"
                            >
                              <Store
                                aria-hidden="true"
                                className="size-4 transition duration-300 group-hover/vendor-link:-translate-y-0.5 group-hover/vendor-link:scale-105"
                              />
                              {request.vendor.businessName}
                            </Link>

                            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-[var(--color-charcoal)]/64 transition duration-300 group-hover/request:text-[var(--color-charcoal)]/74">
                              {request.requirements}
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              <div className="rounded-2xl border border-white/46 bg-white/28 p-4 transition duration-300 group-hover/request:border-white/72 group-hover/request:bg-white/42">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/44 transition duration-300 group-hover/request:text-[var(--color-rosewood)]/70">
                                  {' '}
                                  Base price
                                </p>
                                <p className="mt-2 font-black text-[var(--color-near-black)] transition duration-300 group-hover/request:text-[var(--color-deep-plum)]">
                                  {formatCurrency(request.package?.basePrice ?? null)}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/46 bg-white/28 p-4 transition duration-300 group-hover/request:border-white/72 group-hover/request:bg-white/42">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/44 transition duration-300 group-hover/request:text-[var(--color-rosewood)]/70">
                                  {' '}
                                  Response deadline
                                </p>
                                <p className="mt-2 font-black text-[var(--color-near-black)] transition duration-300 group-hover/request:text-[var(--color-deep-plum)]">
                                  {request.responseDueAt
                                    ? formatDate(request.responseDueAt)
                                    : 'No deadline'}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/46 bg-white/28 p-4 transition duration-300 group-hover/request:border-white/72 group-hover/request:bg-white/42">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/44 transition duration-300 group-hover/request:text-[var(--color-rosewood)]/70">
                                  {' '}
                                  Requested
                                </p>
                                <p className="mt-2 font-black text-[var(--color-near-black)] transition duration-300 group-hover/request:text-[var(--color-deep-plum)]">
                                  {formatDate(request.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="group/view-quotations btn-secondary shrink-0 justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.24)] hover:bg-white/52 hover:shadow-[0_14px_30px_rgba(31,27,29,0.10)]"
                            onClick={() => {
                              setSelectedRequest(request);
                              acceptQuotationMutation.reset();
                            }}
                          >
                            <MessageSquareQuote
                              aria-hidden="true"
                              className="size-4 transition duration-300 group-hover/view-quotations:rotate-[4deg] group-hover/view-quotations:scale-105"
                            />
                            View quotations
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/70 bg-white/20 p-8 text-center">
                  <MessageSquareQuote className="mx-auto size-9 text-[var(--color-deep-plum)]" />

                  <p className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                    {filtersAreActive
                      ? 'No quotation requests match this filter'
                      : 'No quotation requests yet'}
                  </p>

                  <p className="mt-2 leading-7 text-[var(--color-charcoal)]/62">
                    {filtersAreActive
                      ? 'Try changing the request status or sorting option.'
                      : 'Choose a vendor package and send the first quotation request for this event.'}
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
                      disabled={!isQuotationEditable}
                      title={!isQuotationEditable ? quotationLockedMessage : undefined}
                      onClick={() => {
                        if (!isQuotationEditable) {
                          return;
                        }

                        openCreateDialog();
                      }}
                    >
                      <Plus className="size-4" />
                      Request quotation
                    </button>
                  )}
                </div>
              )}

              {pagination.totalPages > 1 ? (
                <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/55 bg-white/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[var(--color-charcoal)]/62">
                    Page {pagination.page} of {pagination.totalPages}
                    <span className="ml-2 text-[var(--color-charcoal)]/44">
                      ({pagination.total} requests)
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasPreviousPage || requestsQuery.isFetching}
                      onClick={() => {
                        setPage((currentPage) => Math.max(currentPage - 1, 1));
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="btn-secondary justify-center text-sm font-bold"
                      disabled={!pagination.hasNextPage || requestsQuery.isFetching}
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
              <article className="glass-card p-6">
                <PackageCheck className="size-6 text-[var(--color-deep-plum)]" />

                <h2 className="mt-6 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)]">
                  Before accepting
                </h2>

                <div className="mt-4 space-y-2 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/62">
                  <p>Review the final proposed price.</p>
                  <p>Check the required deposit.</p>
                  <p>Read all inclusions and exclusions.</p>
                  <p>Confirm the expiry date and vendor terms.</p>
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-quotation-request-title"
          onClick={closeCreateDialog}
        >
          <div className="grid min-h-full place-items-center">
            <div
              className="relative w-full max-w-5xl overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(246,239,248,0.48))] shadow-[0_36px_110px_rgba(31,27,29,0.28)] backdrop-blur-3xl"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.20)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[25%] top-[-7rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div className="relative overflow-hidden border-b border-white/45 px-6 py-6 sm:px-8 sm:py-7">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                      <Send aria-hidden="true" className="size-4" />
                      New quotation request
                    </div>

                    <h2
                      id="create-quotation-request-title"
                      className="max-w-3xl text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      Ask a vendor for a proposal.
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/62 sm:text-base">
                      Select an active package, describe what your event needs and optionally give
                      the vendor a response deadline.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/60 bg-white/34 text-[var(--color-charcoal)] shadow-[0_12px_30px_rgba(31,27,29,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close quotation request form"
                    disabled={createRequestMutation.isPending}
                    onClick={closeCreateDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>
              </div>

              <div className="relative px-6 py-6 sm:px-8 sm:py-8">
                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <section>
                    <form
                      className="flex flex-col gap-3 sm:flex-row"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setPackageSearch(packageSearchInput.trim());
                      }}
                    >
                      <div className="group/search flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-white/55 bg-white/26 px-4 shadow-[0_10px_26px_rgba(31,27,29,0.04)] transition duration-300 focus-within:border-[rgba(93,58,85,0.28)] focus-within:bg-white/42 focus-within:shadow-[0_14px_32px_rgba(31,27,29,0.08)]">
                        <Search
                          aria-hidden="true"
                          className="size-4 shrink-0 text-[var(--color-charcoal)]/42 transition duration-300 group-focus-within/search:text-[var(--color-deep-plum)]"
                        />

                        <input
                          className="w-full bg-transparent text-sm font-semibold outline-none"
                          type="search"
                          placeholder="Search packages or vendors"
                          value={packageSearchInput}
                          disabled={createRequestMutation.isPending}
                          onChange={(event) => {
                            setPackageSearchInput(event.target.value);
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-secondary justify-center px-4 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,27,29,0.08)]"
                      >
                        Search
                      </button>
                    </form>

                    <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                      {packagesQuery.isLoading ? (
                        <div className="grid min-h-44 place-items-center rounded-2xl border border-white/55 bg-white/20">
                          <LoaderCircle className="size-7 animate-spin text-[var(--color-deep-plum)]" />
                        </div>
                      ) : null}

                      {packagesQuery.isError ? (
                        <div
                          role="alert"
                          className="rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                        >
                          {getApiErrorMessage(packagesQuery.error)}
                        </div>
                      ) : null}

                      {(packagesQuery.data?.packages ?? []).map((servicePackage) => {
                        const isSelected = selectedPackage?.id === servicePackage.id;

                        return (
                          <button
                            key={servicePackage.id}
                            type="button"
                            className={`group/package relative w-full overflow-hidden rounded-[1.35rem] border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(31,27,29,0.09)] ${
                              isSelected
                                ? 'border-[rgba(93,58,85,0.34)] bg-[linear-gradient(145deg,rgba(239,228,245,0.82),rgba(255,255,255,0.58))] shadow-[0_16px_38px_rgba(93,58,85,0.10)]'
                                : 'border-white/55 bg-white/26 hover:border-white/86 hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(236,226,242,0.52))]'
                            }`}
                            disabled={createRequestMutation.isPending}
                            onClick={() => {
                              createRequestMutation.reset();
                              setSelectedPackage(servicePackage);
                            }}
                          >
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute -right-12 -top-14 size-32 rounded-full bg-[rgba(183,167,200,0.14)] blur-3xl transition duration-500 group-hover/package:scale-125 group-hover/package:bg-[rgba(183,167,200,0.24)]"
                            />

                            <div className="relative">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  {isSelected ? (
                                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(93,58,85,0.14)] bg-[rgba(93,58,85,0.10)] px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]">
                                      <CheckCircle2 aria-hidden="true" className="size-3.5" />
                                      Selected
                                    </div>
                                  ) : null}

                                  <p className="font-black text-[var(--color-near-black)] transition duration-300 group-hover/package:text-[var(--color-deep-plum)]">
                                    {servicePackage.title}
                                  </p>

                                  <p className="mt-1 text-sm font-bold text-[var(--color-deep-plum)]">
                                    {servicePackage.vendor.businessName}
                                  </p>
                                </div>

                                <span className="shrink-0 text-right text-sm font-black text-[var(--color-rosewood)] transition duration-300 group-hover/package:-translate-y-0.5">
                                  {formatCurrency(servicePackage.basePrice)}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="status-chip" data-tone="gray">
                                  <Tags aria-hidden="true" className="size-3.5" />
                                  {servicePackage.category.name}
                                </span>

                                {servicePackage.vendor.baseLocation ? (
                                  <span className="status-chip" data-tone="blue">
                                    <MapPin aria-hidden="true" className="size-3.5" />
                                    {servicePackage.vendor.baseLocation}
                                  </span>
                                ) : null}
                              </div>

                              {servicePackage.description ? (
                                <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[var(--color-charcoal)]/58 transition duration-300 group-hover/package:text-[var(--color-charcoal)]/70">
                                  {servicePackage.description}
                                </p>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}

                      {packagesQuery.data && packagesQuery.data.packages.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/70 bg-white/20 p-6 text-center">
                          <PackageCheck className="mx-auto size-8 text-[var(--color-deep-plum)]" />

                          <p className="mt-3 font-black text-[var(--color-near-black)]">
                            No packages found
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-white/58 bg-white/24 p-5 shadow-[0_18px_46px_rgba(31,27,29,0.05)] backdrop-blur-2xl sm:p-6">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-rosewood)]">
                      Request details
                    </p>

                    {selectedPackage ? (
                      <div className="relative mt-5 overflow-hidden rounded-[1.5rem] border border-[rgba(93,58,85,0.18)] bg-[linear-gradient(145deg,rgba(241,231,246,0.78),rgba(255,255,255,0.54))] p-5 shadow-[0_16px_38px_rgba(93,58,85,0.08)]">
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
                        />

                        <div className="relative">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(93,58,85,0.14)] bg-[rgba(93,58,85,0.10)] px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--color-deep-plum)]">
                                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                                Selected package
                              </div>

                              <p className="mt-4 text-xl font-black tracking-[-0.03em] text-[var(--color-near-black)]">
                                {selectedPackage.title}
                              </p>

                              <p className="mt-1 text-sm font-bold text-[var(--color-deep-plum)]">
                                {selectedPackage.vendor.businessName}
                              </p>
                            </div>

                            <button
                              type="button"
                              className="w-fit rounded-xl border border-[rgba(124,74,90,0.14)] bg-[rgba(124,74,90,0.08)] px-3 py-2 text-xs font-black text-[var(--color-muted-burgundy)] transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(124,74,90,0.14)]"
                              disabled={createRequestMutation.isPending}
                              onClick={() => {
                                setSelectedPackage(null);
                              }}
                            >
                              Change
                            </button>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/56 bg-white/34 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                                Category
                              </p>

                              <p className="mt-2 font-black text-[var(--color-near-black)]">
                                {selectedPackage.category.name}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/56 bg-white/34 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                                Base price
                              </p>

                              <p className="mt-2 font-black text-[var(--color-rosewood)]">
                                {formatCurrency(selectedPackage.basePrice)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/70 bg-white/18 p-5 text-center">
                        <ChevronDown className="mx-auto size-6 text-[var(--color-deep-plum)]" />

                        <p className="mt-3 text-sm font-bold text-[var(--color-charcoal)]/62">
                          Choose a package from the list.
                        </p>
                      </div>
                    )}

                    <label className="mt-5 block">
                      <span className="flex items-center justify-between gap-4">
                        <span className="text-sm font-black">Event requirements</span>

                        <span className="text-xs font-black tabular-nums text-[var(--color-charcoal)]/44">
                          {requirements.length.toLocaleString('en-LK')} / 5,000
                        </span>
                      </span>

                      <textarea
                        className="form-field mt-2 min-h-40 resize-y transition duration-300 focus:bg-white/46"
                        maxLength={5000}
                        value={requirements}
                        disabled={createRequestMutation.isPending}
                        placeholder="Describe the service, preferred style, quantities, timings and special requirements."
                        onChange={(event) => {
                          createRequestMutation.reset();
                          setRequirements(event.target.value);
                        }}
                      />

                      <div className="mt-2 flex flex-col gap-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48 sm:flex-row sm:items-center sm:justify-between">
                        <span>Include timings, quantities, style and special requirements.</span>

                        <span
                          className={
                            requirements.trim().length > 0 && requirements.trim().length < 10
                              ? 'font-black text-[var(--color-muted-burgundy)]'
                              : 'font-black text-[var(--color-deep-plum)]/60'
                          }
                        >
                          Minimum 10 characters
                        </span>
                      </div>
                    </label>

                    <div className="mt-5 rounded-[1.5rem] border border-[rgba(175,201,216,0.26)] bg-[rgba(222,236,242,0.30)] p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.30)] text-[#3b515b]">
                          <CalendarClock aria-hidden="true" className="size-4" />
                        </span>

                        <div>
                          <p className="text-sm font-black text-[var(--color-near-black)]">
                            Response deadline
                          </p>

                          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/52">
                            Choose when the vendor should reply. This field is optional.
                          </p>
                        </div>
                      </div>

                      <input
                        className="form-field mt-4"
                        type="datetime-local"
                        value={responseDueAt}
                        disabled={createRequestMutation.isPending}
                        onChange={(event) => {
                          createRequestMutation.reset();
                          setResponseDueAt(event.target.value);
                        }}
                      />

                      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-charcoal)]/48">
                        The deadline must be in the future and before the event date.
                      </p>
                    </div>

                    {createRequestMutation.isError ? (
                      <div
                        role="alert"
                        className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                      >
                        {getApiErrorMessage(createRequestMutation.error)}
                      </div>
                    ) : null}

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        className="btn-secondary justify-center text-sm font-bold"
                        disabled={createRequestMutation.isPending}
                        onClick={closeCreateDialog}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="group/send-request btn-primary justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.22)]"
                        disabled={createRequestMutation.isPending}
                        onClick={() => {
                          createRequestMutation.mutate();
                        }}
                      >
                        {createRequestMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Send
                            aria-hidden="true"
                            className="size-4 transition duration-300 group-hover/send-request:translate-x-0.5"
                          />
                        )}

                        {createRequestMutation.isPending ? 'Sending request...' : 'Send request'}
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedRequest ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-6 backdrop-blur-xl sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quotation-comparison-title"
          onClick={() => {
            if (!acceptQuotationMutation.isPending) {
              closeQuotationDialog();
            }
          }}
        >
          <div className="mx-auto flex min-h-full max-w-6xl items-start justify-center">
            <div
              className="relative w-full overflow-hidden rounded-[2.2rem] border border-white/65 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(246,239,248,0.84))] p-6 shadow-[0_40px_110px_rgba(31,27,29,0.24)] backdrop-blur-3xl sm:p-8"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[22%] top-[-7rem] size-64 rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl"
              />

              <div className="relative">
                <div className="flex flex-col gap-6 border-b border-[rgba(93,58,85,0.10)] pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                      <MessageSquareQuote aria-hidden="true" className="size-4" />
                      Quotation comparison
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="status-chip"
                        data-tone={getRequestTone(selectedRequest.status)}
                      >
                        {quotationRequestStatusLabels[selectedRequest.status]}
                      </span>

                      {selectedRequest.package?.category ? (
                        <span className="status-chip" data-tone="gray">
                          <Tags aria-hidden="true" className="size-3.5" />
                          {selectedRequest.package.category.name}
                        </span>
                      ) : null}
                    </div>

                    <h2
                      id="quotation-comparison-title"
                      className="mt-5 max-w-4xl text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)] sm:text-4xl"
                    >
                      {selectedRequest.package?.title ?? 'Vendor quotation'}
                    </h2>

                    <Link
                      to={`/vendors/${selectedRequest.vendor.slug}`}
                      className="group/comparison-vendor mt-3 inline-flex items-center gap-2 text-sm font-black text-[var(--color-deep-plum)] transition duration-300 hover:translate-x-0.5 hover:text-[var(--color-rosewood)]"
                    >
                      <Store
                        aria-hidden="true"
                        className="size-4 transition duration-300 group-hover/comparison-vendor:-translate-y-0.5"
                      />

                      {selectedRequest.vendor.businessName}
                    </Link>

                    <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[var(--color-charcoal)]/62">
                      Review every quotation version, compare pricing and terms, then choose the
                      proposal that best fits this event.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/64 bg-white/36 text-[var(--color-charcoal)] shadow-[0_12px_28px_rgba(31,27,29,0.07)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(93,58,85,0.22)] hover:bg-white/56 hover:text-[var(--color-deep-plum)] hover:shadow-[0_16px_34px_rgba(31,27,29,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-deep-plum)]/25 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close quotation comparison"
                    disabled={acceptQuotationMutation.isPending}
                    onClick={closeQuotationDialog}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                {quotationsQuery.isLoading ? (
                  <div className="mt-8 grid min-h-60 place-items-center rounded-[1.75rem] border border-white/55 bg-white/24">
                    <div className="text-center">
                      <LoaderCircle className="mx-auto size-8 animate-spin text-[var(--color-deep-plum)]" />

                      <p className="mt-4 text-sm font-bold text-[var(--color-charcoal)]/58">
                        Loading quotation versions
                      </p>
                    </div>
                  </div>
                ) : null}

                {quotationsQuery.isError ? (
                  <div
                    role="alert"
                    className="mt-8 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
                  >
                    {getApiErrorMessage(quotationsQuery.error)}
                  </div>
                ) : null}

                {quotationsQuery.data && quotationsQuery.data.length > 0 ? (
                  <div className="mt-8 grid gap-5 lg:grid-cols-2">
                    {quotationsQuery.data.map((quotation) => {
                      const expired = isQuotationExpired(quotation);

                      const canAccept =
                        selectedRequest.status === 'QUOTED' &&
                        quotation.status === 'SENT' &&
                        !expired;

                      const proposedPrice = Number(quotation.proposedPrice);
                      const depositAmount = quotation.depositAmount
                        ? Number(quotation.depositAmount)
                        : 0;

                      const remainingBalance =
                        Number.isFinite(proposedPrice) && Number.isFinite(depositAmount)
                          ? Math.max(proposedPrice - depositAmount, 0)
                          : null;

                      return (
                        <article
                          key={quotation.id}
                          className={`group/quotation relative overflow-hidden rounded-[1.75rem] border p-5 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_72px_rgba(31,27,29,0.12)] sm:p-6 ${
                            quotation.status === 'ACCEPTED'
                              ? 'border-[rgba(142,151,115,0.36)] bg-[linear-gradient(145deg,rgba(244,248,235,0.82),rgba(255,255,255,0.50))] shadow-[0_22px_58px_rgba(61,69,47,0.10)]'
                              : 'border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.60),rgba(238,229,244,0.40))] shadow-[0_20px_52px_rgba(31,27,29,0.07)] hover:border-white/88'
                          }`}
                        >
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[rgba(183,167,200,0.18)] blur-3xl transition duration-500 group-hover/quotation:scale-125 group-hover/quotation:bg-[rgba(183,167,200,0.30)]"
                          />

                          <div className="relative">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <span
                                  className="status-chip transition duration-300 group-hover/quotation:-translate-y-0.5 group-hover/quotation:shadow-[0_8px_20px_rgba(31,27,29,0.08)]"
                                  data-tone={getQuotationTone(quotation.status)}
                                >
                                  {quotationStatusLabels[quotation.status]}
                                </span>

                                <h3 className="mt-4 text-xl font-black tracking-[-0.035em] text-[var(--color-near-black)] transition duration-300 group-hover/quotation:text-[var(--color-deep-plum)]">
                                  Quotation version {quotation.version}
                                </h3>
                              </div>

                              <div className="sm:text-right">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/40">
                                  Submitted
                                </p>

                                <p className="mt-1 text-sm font-black text-[var(--color-charcoal)]/62">
                                  {formatDate(quotation.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 rounded-[1.5rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(242,233,247,0.52))] p-5 shadow-[0_14px_34px_rgba(31,27,29,0.06)]">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-rosewood)]">
                                Proposed price
                              </p>

                              <p className="mt-3 break-words text-3xl font-black tracking-[-0.055em] text-[var(--color-near-black)] sm:text-4xl">
                                {formatCurrency(quotation.proposedPrice)}
                              </p>

                              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/52 bg-white/32 p-4">
                                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                                    Deposit
                                  </p>

                                  <p className="mt-2 font-black text-[var(--color-deep-plum)]">
                                    {quotation.depositAmount
                                      ? formatCurrency(quotation.depositAmount)
                                      : 'No deposit'}
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-white/52 bg-white/32 p-4">
                                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--color-charcoal)]/42">
                                    Remaining balance
                                  </p>

                                  <p className="mt-2 font-black text-[var(--color-deep-plum)]">
                                    {remainingBalance !== null
                                      ? formatCurrency(String(remainingBalance))
                                      : 'Not available'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-4">
                              <section className="rounded-[1.35rem] border border-[rgba(142,151,115,0.18)] bg-[rgba(235,241,219,0.34)] p-5 transition duration-300 group-hover/quotation:bg-[rgba(235,241,219,0.46)]">
                                <div className="flex items-center gap-3">
                                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(142,151,115,0.20)] text-[#4d5739]">
                                    <CheckCircle2 aria-hidden="true" className="size-4" />
                                  </span>

                                  <p className="text-sm font-black text-[var(--color-near-black)]">
                                    Inclusions
                                  </p>
                                </div>

                                <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                                  {quotation.inclusions}
                                </p>
                              </section>

                              {quotation.exclusions ? (
                                <section className="rounded-[1.35rem] border border-[rgba(142,92,103,0.16)] bg-[rgba(245,225,230,0.30)] p-5 transition duration-300 group-hover/quotation:bg-[rgba(245,225,230,0.42)]">
                                  <div className="flex items-center gap-3">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(142,92,103,0.16)] text-[var(--color-muted-burgundy)]">
                                      <X aria-hidden="true" className="size-4" />
                                    </span>

                                    <p className="text-sm font-black text-[var(--color-near-black)]">
                                      Exclusions
                                    </p>
                                  </div>

                                  <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                                    {quotation.exclusions}
                                  </p>
                                </section>
                              ) : null}

                              {quotation.terms ? (
                                <section className="rounded-[1.35rem] border border-[rgba(175,201,216,0.24)] bg-[rgba(222,236,242,0.34)] p-5 transition duration-300 group-hover/quotation:bg-[rgba(222,236,242,0.46)]">
                                  <div className="flex items-center gap-3">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[rgba(175,201,216,0.26)] text-[#3b515b]">
                                      <FileText aria-hidden="true" className="size-4" />
                                    </span>

                                    <p className="text-sm font-black text-[var(--color-near-black)]">
                                      Terms
                                    </p>
                                  </div>

                                  <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-[var(--color-charcoal)]/68">
                                    {quotation.terms}
                                  </p>
                                </section>
                              ) : null}
                            </div>

                            <div
                              className={`mt-5 rounded-[1.35rem] border p-4 ${
                                expired
                                  ? 'border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)]'
                                  : 'border-white/54 bg-white/30'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                                    expired
                                      ? 'bg-[rgba(124,74,90,0.14)] text-[var(--color-muted-burgundy)]'
                                      : 'bg-[rgba(183,167,200,0.20)] text-[var(--color-deep-plum)]'
                                  }`}
                                >
                                  <Clock3 aria-hidden="true" className="size-4" />
                                </span>

                                <div>
                                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/44">
                                    Quotation expiry
                                  </p>

                                  <p className="mt-2 font-black text-[var(--color-near-black)]">
                                    {quotation.expiresAt
                                      ? formatDate(quotation.expiresAt)
                                      : 'No expiry date'}
                                  </p>

                                  {expired ? (
                                    <p className="mt-2 text-sm font-bold text-[var(--color-muted-burgundy)]">
                                      This quotation has expired and can no longer be accepted.
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {canAccept ? (
                              <button
                                type="button"
                                className="group/accept-quotation btn-primary mt-6 w-full justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.24)]"
                                disabled={!isQuotationEditable}
                                title={!isQuotationEditable ? quotationLockedMessage : undefined}
                                onClick={() => {
                                  if (!isQuotationEditable) {
                                    return;
                                  }

                                  acceptQuotationMutation.reset();
                                  setQuotationToAccept(quotation);
                                }}
                              >
                                <CheckCircle2
                                  aria-hidden="true"
                                  className="size-4 transition duration-300 group-hover/accept-quotation:scale-110"
                                />
                                Accept quotation
                              </button>
                            ) : null}

                            {quotation.status === 'ACCEPTED' ? (
                              <button
                                type="button"
                                className="group/create-booking btn-primary mt-6 w-full justify-center text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(93,58,85,0.24)]"
                                disabled={!isBookingCreationAllowed}
                                title={!isBookingCreationAllowed ? bookingLockedMessage : undefined}
                                onClick={() => {
                                  if (!isBookingCreationAllowed) {
                                    return;
                                  }

                                  openCreateBookingDialog(quotation);
                                }}
                              >
                                <CalendarRange
                                  aria-hidden="true"
                                  className="size-4 transition duration-300 group-hover/create-booking:scale-110"
                                />
                                Create booking
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}

                {quotationsQuery.data && quotationsQuery.data.length === 0 ? (
                  <div className="mt-8 rounded-[1.75rem] border border-dashed border-white/70 bg-white/24 p-8 text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-[var(--color-deep-plum)]">
                      <MessageSquareQuote aria-hidden="true" className="size-7" />
                    </span>

                    <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                      No quotation received yet
                    </p>

                    <p className="mx-auto mt-2 max-w-lg leading-7 text-[var(--color-charcoal)]/62">
                      The vendor has not sent a quotation for this request. It will appear here once
                      the vendor submits a proposal.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {quotationToAccept && selectedRequest ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[rgba(31,27,29,0.56)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-quotation-title"
          onClick={() => {
            if (!acceptQuotationMutation.isPending) {
              setQuotationToAccept(null);
              acceptQuotationMutation.reset();
            }
          }}
        >
          <div
            className="glass-card w-full max-w-lg p-6 sm:p-8"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(89,133,113,0.14)] text-[#3f735d]">
              <CheckCircle2 className="size-7" />
            </div>

            <h2
              id="accept-quotation-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Accept this quotation?
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/68">
              You are accepting <strong>{formatCurrency(quotationToAccept.proposedPrice)}</strong>{' '}
              from <strong>{selectedRequest.vendor.businessName}</strong>. Other active quotation
              versions for this request will be rejected.
            </p>

            {acceptQuotationMutation.isError ? (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-[rgba(124,74,90,0.22)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]"
              >
                {getApiErrorMessage(acceptQuotationMutation.error)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                disabled={acceptQuotationMutation.isPending}
                onClick={() => {
                  setQuotationToAccept(null);
                  acceptQuotationMutation.reset();
                }}
              >
                Review again
              </button>

              <button
                type="button"
                className="btn-primary justify-center text-sm font-bold"
                disabled={acceptQuotationMutation.isPending}
                onClick={() => {
                  acceptQuotationMutation.mutate();
                }}
              >
                {acceptQuotationMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}

                {acceptQuotationMutation.isPending
                  ? 'Accepting quotation...'
                  : 'Confirm acceptance'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Create Booking Dialog */}
      {quotationToBook ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(31,27,29,0.55)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-booking-title"
          onClick={() => {
            if (!createBookingMutation.isPending) {
              closeCreateBookingDialog();
            }
          }}
        >
          <div
            className="glass-card w-full max-w-xl p-6 sm:p-8"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="soft-chip mb-4 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <CalendarRange className="size-4" />
                  Create booking
                </div>

                <h2
                  id="create-booking-title"
                  className="text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
                >
                  Schedule this vendor
                </h2>

                <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/66">
                  Choose when this service should begin. The booking will be created from the
                  accepted quotation.
                </p>
              </div>

              <button
                type="button"
                className="grid size-11 place-items-center rounded-full border border-white/55 bg-white/28 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close create booking dialog"
                disabled={createBookingMutation.isPending}
                onClick={closeCreateBookingDialog}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black">Service start</span>

                <input
                  type="datetime-local"
                  className="form-field min-h-12"
                  value={serviceStart}
                  disabled={createBookingMutation.isPending}
                  onChange={(event) => {
                    createBookingMutation.reset();
                    setServiceStart(event.target.value);
                  }}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black">Service end (optional)</span>

                <input
                  type="datetime-local"
                  className="form-field min-h-12"
                  value={serviceEnd}
                  disabled={createBookingMutation.isPending}
                  onChange={(event) => {
                    createBookingMutation.reset();
                    setServiceEnd(event.target.value);
                  }}
                />
              </label>

              {createBookingMutation.isError ? (
                <div className="rounded-2xl border border-[rgba(124,74,90,0.24)] bg-[rgba(124,74,90,0.10)] px-4 py-3 text-sm font-bold text-[var(--color-muted-burgundy)]">
                  {getApiErrorMessage(createBookingMutation.error)}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="btn-secondary justify-center text-sm font-bold"
                  disabled={createBookingMutation.isPending}
                  onClick={closeCreateBookingDialog}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn-primary justify-center text-sm font-bold"
                  disabled={createBookingMutation.isPending}
                  onClick={() => {
                    createBookingMutation.mutate();
                  }}
                >
                  {createBookingMutation.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CalendarRange className="size-4" />
                      Create booking
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Booking Success Dialog */}
      {createdBooking ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(31,27,29,0.55)] px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-created-title"
          onClick={() => {
            setCreatedBooking(null);
          }}
        >
          <div
            className="glass-card w-full max-w-lg p-8 text-center"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[rgba(89,133,113,0.12)] text-[#3f735d]">
              <CheckCircle2 className="size-8" />
            </div>

            <h2
              id="booking-created-title"
              className="mt-6 text-3xl font-black tracking-[-0.045em] text-[var(--color-near-black)]"
            >
              Booking created
            </h2>

            <p className="mt-4 leading-7 text-[var(--color-charcoal)]/66">
              Your booking has been created successfully. The vendor will now receive the booking
              request for confirmation.
            </p>

            <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <button
                type="button"
                className="btn-secondary justify-center text-sm font-bold"
                onClick={() => {
                  setCreatedBooking(null);
                }}
              >
                Close
              </button>

              <Link
                to={`/events/${eventId}/bookings`}
                className="btn-primary justify-center text-sm font-bold"
              >
                Open bookings
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
