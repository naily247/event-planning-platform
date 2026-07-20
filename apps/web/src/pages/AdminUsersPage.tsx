import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  Store,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import { AdminWorkspaceNav } from '../features/admin/components/AdminWorkspaceNav';
import {
  adminAccountStatuses,
  adminUserRoles,
  adminUserSortOptions,
  getAdminUserById,
  getAdminUsers,
  updateAdminUserStatus,
  type AdminAccountStatus,
  type AdminUser,
  type AdminUserRole,
  type AdminUserSort,
} from '../features/admin/admin.api';

const PAGE_LIMIT = 20;

type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: {
    message?: string;
  };
};

const userRoleLabels: Record<AdminUserRole, string> = {
  CUSTOMER: 'Customer',
  VENDOR: 'Vendor',
  ADMIN: 'Administrator',
};

const accountStatusLabels: Record<AdminAccountStatus, string> = {
  ACTIVE: 'Active',
  PENDING_VERIFICATION: 'Pending verification',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
};

const userSortLabels: Record<AdminUserSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name_asc: 'Name A–Z',
  name_desc: 'Name Z–A',
  email_asc: 'Email A–Z',
  email_desc: 'Email Z–A',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  return error.response?.data?.message ?? error.response?.data?.error?.message ?? fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getStatusTone(status: AdminAccountStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'success';

    case 'PENDING_VERIFICATION':
      return 'warning';

    case 'SUSPENDED':
    case 'DEACTIVATED':
      return 'danger';

    default:
      return 'plum';
  }
}

function getRoleTone(role: AdminUserRole) {
  switch (role) {
    case 'ADMIN':
      return 'plum';

    case 'VENDOR':
      return 'olive';

    case 'CUSTOMER':
    default:
      return 'blue';
  }
}

function UserAvatar({ user }: { user: AdminUser }) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-sm font-black text-[var(--color-deep-plum)]">
      {initials}
    </div>
  );
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AdminAccountStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState<AdminUserSort>('newest');
  const [page, setPage] = useState(1);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusReason, setStatusReason] = useState('');

  const usersQuery = useQuery({
    queryKey: [
      'admin',
      'users',
      {
        page,
        search,
        roleFilter,
        statusFilter,
        sort,
      },
    ],
    queryFn: () =>
      getAdminUsers({
        page,
        limit: PAGE_LIMIT,
        search: search || undefined,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        sort,
      }),
  });

  const userDetailQuery = useQuery({
    queryKey: ['admin', 'users', selectedUserId],
    queryFn: () => getAdminUserById(selectedUserId as string),
    enabled: Boolean(selectedUserId),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: 'ACTIVE' | 'SUSPENDED';
      reason?: string;
    }) =>
      updateAdminUserStatus(userId, {
        status,
        ...(reason?.trim() && {
          reason: reason.trim(),
        }),
      }),

    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'users'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'dashboard', 'summary'],
      });

      void queryClient.invalidateQueries({
        queryKey: ['admin', 'users', variables.userId],
      });

      setShowStatusDialog(false);
      setStatusReason('');
    },
  });

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;

  const selectedUser = userDetailQuery.data;

  const filtersAreActive =
    Boolean(search) || roleFilter !== 'ALL' || statusFilter !== 'ALL' || sort !== 'newest';

  const pageSummary = useMemo(() => {
    return {
      active: users.filter((user) => user.status === 'ACTIVE').length,
      suspended: users.filter((user) => user.status === 'SUSPENDED').length,
      vendors: users.filter((user) => user.role === 'VENDOR').length,
      customers: users.filter((user) => user.role === 'CUSTOMER').length,
    };
  }, [users]);

  function submitSearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSort('newest');
    setPage(1);
  }

  function openUser(userId: string) {
    statusMutation.reset();
    setSelectedUserId(userId);
  }

  function closeUser() {
    if (statusMutation.isPending) {
      return;
    }

    statusMutation.reset();
    setSelectedUserId(null);
    setShowStatusDialog(false);
    setStatusReason('');
  }

  function openStatusDialog() {
    statusMutation.reset();
    setStatusReason('');
    setShowStatusDialog(true);
  }

  function submitStatusChange() {
    if (!selectedUser) {
      return;
    }

    const nextStatus = selectedUser.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    if (nextStatus === 'SUSPENDED' && statusReason.trim().length < 10) {
      return;
    }

    statusMutation.mutate({
      userId: selectedUser.id,
      status: nextStatus,
      ...(nextStatus === 'SUSPENDED' && {
        reason: statusReason.trim(),
      }),
    });
  }

  return (
    <div className="workspace-shell">
      <div className="workspace-container">
        <AdminWorkspaceNav />

        <main className="py-8">
          <section className="workspace-hero">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="soft-chip mb-5 w-fit text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)]">
                  <Users className="size-4" />
                  Account administration
                </div>

                <h1 className="max-w-4xl text-balance text-4xl font-black leading-[1] tracking-[-0.05em] text-[var(--color-near-black)] sm:text-5xl">
                  Manage platform users safely and clearly.
                </h1>

                <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--color-charcoal)]/68">
                  Search customer, vendor, and administrator accounts, inspect their platform
                  activity, and suspend or reactivate eligible users.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/72 px-5 py-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                  Matching users
                </p>

                <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-near-black)]">
                  {usersQuery.isLoading ? '—' : (pagination?.total ?? 0)}
                </p>
              </div>
            </div>
          </section>

          {usersQuery.isLoading ? (
            <section className="state-surface mt-6">
              <div>
                <LoaderCircle className="mx-auto size-10 animate-spin text-[var(--color-deep-plum)]" />

                <p className="mt-5 text-xl font-black text-[var(--color-near-black)]">
                  Loading user accounts
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--color-charcoal)]/60">
                  Preparing account statuses, roles, and vendor profile details.
                </p>
              </div>
            </section>
          ) : usersQuery.isError ? (
            <section className="state-surface mt-6">
              <div className="max-w-lg">
                <div className="icon-tile mx-auto">
                  <AlertCircle className="size-6" />
                </div>

                <h2 className="mt-5 text-2xl font-black text-[var(--color-near-black)]">
                  Users could not be loaded
                </h2>

                <p className="mt-3 leading-7 text-[var(--color-charcoal)]/66">
                  {getErrorMessage(usersQuery.error, 'We could not load the user directory.')}
                </p>

                <button
                  type="button"
                  className="btn-primary mt-6 text-sm"
                  onClick={() => usersQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="workspace-card p-5">
                  <div className="icon-tile">
                    <UserRoundCheck className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Active on this page
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {pageSummary.active}
                  </p>
                </article>

                <article className="workspace-card p-5">
                  <div className="icon-tile">
                    <Ban className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Suspended on this page
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {pageSummary.suspended}
                  </p>
                </article>

                <article className="workspace-card p-5">
                  <div className="icon-tile">
                    <Store className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Vendors on this page
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {pageSummary.vendors}
                  </p>
                </article>

                <article className="workspace-card p-5">
                  <div className="icon-tile">
                    <CircleUserRound className="size-5" />
                  </div>

                  <p className="mt-5 text-sm font-bold text-[var(--color-charcoal)]/56">
                    Customers on this page
                  </p>

                  <p className="mt-2 text-3xl font-black text-[var(--color-near-black)]">
                    {pageSummary.customers}
                  </p>
                </article>
              </section>

              <section className="workspace-panel mt-6">
                <div>
                  <p className="section-eyebrow">User directory</p>

                  <h2 className="section-title">Search and filter accounts</h2>

                  <p className="section-description">
                    Narrow the directory by role, status, name, or email address.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 lg:grid-cols-[1.5fr_0.75fr_0.9fr_0.9fr]">
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitSearch();
                    }}
                  >
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--color-charcoal)]/42" />

                      <input
                        className="form-field !pl-11"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search name or email"
                      />
                    </div>

                    <button type="submit" className="btn-primary shrink-0 px-5 text-sm">
                      Search
                    </button>
                  </form>

                  <select
                    className="form-field"
                    value={roleFilter}
                    onChange={(event) => {
                      setRoleFilter(event.target.value as AdminUserRole | 'ALL');
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All roles</option>

                    {adminUserRoles.map((role) => (
                      <option key={role} value={role}>
                        {userRoleLabels[role]}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-field"
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as AdminAccountStatus | 'ALL');
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All statuses</option>

                    {adminAccountStatuses.map((status) => (
                      <option key={status} value={status}>
                        {accountStatusLabels[status]}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-field"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value as AdminUserSort);
                      setPage(1);
                    }}
                  >
                    {adminUserSortOptions.map((sortOption) => (
                      <option key={sortOption} value={sortOption}>
                        {userSortLabels[sortOption]}
                      </option>
                    ))}
                  </select>
                </div>

                {filtersAreActive ? (
                  <button
                    type="button"
                    className="btn-secondary mt-4 text-sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : null}

                {users.length > 0 ? (
                  <div className="mt-7 overflow-hidden rounded-2xl border border-white/70 bg-white/46">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-soft)] text-left">
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                              User
                            </th>

                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                              Role
                            </th>

                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                              Status
                            </th>

                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                              Vendor profile
                            </th>

                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                              Joined
                            </th>

                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {users.map((user) => (
                            <tr
                              key={user.id}
                              className="border-b border-[var(--border-soft)] last:border-b-0"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <UserAvatar user={user} />

                                  <div>
                                    <p className="text-sm font-black text-[var(--color-near-black)]">
                                      {user.firstName} {user.lastName}
                                    </p>

                                    <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/52">
                                      {user.email}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span className="status-chip" data-tone={getRoleTone(user.role)}>
                                  {userRoleLabels[user.role]}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className="status-chip"
                                  data-tone={getStatusTone(user.status)}
                                >
                                  {accountStatusLabels[user.status]}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                {user.vendorProfile ? (
                                  <div>
                                    <p className="text-sm font-bold text-[var(--color-near-black)]">
                                      {user.vendorProfile.businessName}
                                    </p>

                                    <p className="mt-1 text-xs font-semibold text-[var(--color-charcoal)]/48">
                                      {user.vendorProfile.verificationStatus}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-sm font-semibold text-[var(--color-charcoal)]/38">
                                    —
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4 text-sm font-semibold text-[var(--color-charcoal)]/58">
                                {formatDate(user.createdAt)}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  className="btn-secondary min-h-0 px-4 py-2 text-xs"
                                  onClick={() => openUser(user.id)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="empty-surface mt-7">
                    <Users className="mx-auto size-8 text-[var(--color-deep-plum)]/64" />

                    <h3 className="mt-4 text-xl font-black text-[var(--color-near-black)]">
                      No users match these filters
                    </h3>

                    <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-[var(--color-charcoal)]/56">
                      Try changing the search term, role, status, or sort order.
                    </p>

                    {filtersAreActive ? (
                      <button
                        type="button"
                        className="btn-secondary mt-5 text-sm"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                )}

                {pagination && pagination.totalPages > 1 ? (
                  <div className="mt-7 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/48 px-5 py-4 sm:flex-row">
                    <p className="text-sm font-semibold text-[var(--color-charcoal)]/58">
                      Page{' '}
                      <span className="font-black text-[var(--color-near-black)]">
                        {pagination.page}
                      </span>{' '}
                      of{' '}
                      <span className="font-black text-[var(--color-near-black)]">
                        {pagination.totalPages}
                      </span>
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-4 py-2.5 text-sm"
                        disabled={!pagination.hasPreviousPage || usersQuery.isFetching}
                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </button>

                      <button
                        type="button"
                        className="btn-secondary min-h-0 px-4 py-2.5 text-sm"
                        disabled={!pagination.hasNextPage || usersQuery.isFetching}
                        onClick={() => setPage((currentPage) => currentPage + 1)}
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </main>
      </div>

      {selectedUserId ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUser();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-detail-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/80 bg-[#fbf8f5] p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Account details</p>

                <h2 id="admin-user-detail-title" className="section-title">
                  User profile
                </h2>
              </div>

              <button
                type="button"
                className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                onClick={closeUser}
                aria-label="Close user details"
              >
                <X className="size-5" />
              </button>
            </div>

            {userDetailQuery.isLoading ? (
              <div className="state-surface mt-6 min-h-72">
                <div>
                  <LoaderCircle className="mx-auto size-9 animate-spin text-[var(--color-deep-plum)]" />

                  <p className="mt-4 font-black text-[var(--color-near-black)]">
                    Loading user details
                  </p>
                </div>
              </div>
            ) : userDetailQuery.isError ? (
              <div className="feedback-surface mt-6" data-tone="danger">
                {getErrorMessage(userDetailQuery.error, 'We could not load this user account.')}
              </div>
            ) : selectedUser ? (
              <>
                <div className="mt-6 flex flex-col justify-between gap-5 rounded-2xl border border-white/80 bg-white/72 p-5 sm:flex-row sm:items-start">
                  <div className="flex items-center gap-4">
                    <div className="grid size-14 place-items-center rounded-2xl bg-[rgba(183,167,200,0.22)] text-lg font-black text-[var(--color-deep-plum)]">
                      {selectedUser.firstName.charAt(0)}
                      {selectedUser.lastName.charAt(0)}
                    </div>

                    <div>
                      <p className="text-xl font-black text-[var(--color-near-black)]">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/56">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="status-chip" data-tone={getRoleTone(selectedUser.role)}>
                      {userRoleLabels[selectedUser.role]}
                    </span>

                    <span className="status-chip" data-tone={getStatusTone(selectedUser.status)}>
                      {accountStatusLabels[selectedUser.status]}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/80 bg-white/64 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                      Joined
                    </p>

                    <p className="mt-2 font-bold text-[var(--color-near-black)]">
                      {formatDateTime(selectedUser.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/80 bg-white/64 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                      Last updated
                    </p>

                    <p className="mt-2 font-bold text-[var(--color-near-black)]">
                      {formatDateTime(selectedUser.updatedAt)}
                    </p>
                  </div>
                </div>

                {selectedUser.customer ? (
                  <section className="workspace-panel mt-6">
                    <p className="section-eyebrow">Customer profile</p>

                    <h3 className="section-title">Customer information</h3>

                    <div className="mt-5 rounded-2xl border border-white/80 bg-white/58 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                        Phone
                      </p>

                      <p className="mt-2 font-bold text-[var(--color-near-black)]">
                        {selectedUser.customer.phone}
                      </p>
                    </div>
                  </section>
                ) : null}

                {selectedUser.vendorProfile ? (
                  <section className="workspace-panel mt-6">
                    <p className="section-eyebrow">Vendor profile</p>

                    <h3 className="section-title">{selectedUser.vendorProfile.businessName}</h3>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/80 bg-white/58 p-5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                          Verification
                        </p>

                        <p className="mt-2 font-bold text-[var(--color-near-black)]">
                          {selectedUser.vendorProfile.verificationStatus}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/80 bg-white/58 p-5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-charcoal)]/44">
                          Base location
                        </p>

                        <p className="mt-2 font-bold text-[var(--color-near-black)]">
                          {selectedUser.vendorProfile.baseLocation ?? 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {selectedUser.vendorProfile.description ? (
                      <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[var(--color-charcoal)]/68">
                        {selectedUser.vendorProfile.description}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {selectedUser.vendorProfile.categories.map((category) => (
                        <span key={category.id} className="soft-chip text-xs font-bold">
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="workspace-panel mt-6">
                  <p className="section-eyebrow">Platform activity</p>

                  <h3 className="section-title">Account usage</h3>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-white/58 p-4">
                      <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Events</p>

                      <p className="mt-2 text-2xl font-black text-[var(--color-near-black)]">
                        {selectedUser._count.createdEvents}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/58 p-4">
                      <p className="text-xs font-bold text-[var(--color-charcoal)]/48">
                        Payments submitted
                      </p>

                      <p className="mt-2 text-2xl font-black text-[var(--color-near-black)]">
                        {selectedUser._count.submittedPayments}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/58 p-4">
                      <p className="text-xs font-bold text-[var(--color-charcoal)]/48">Reviews</p>

                      <p className="mt-2 text-2xl font-black text-[var(--color-near-black)]">
                        {selectedUser._count.customerReviews}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/58 p-4">
                      <p className="text-xs font-bold text-[var(--color-charcoal)]/48">
                        Complaints submitted
                      </p>

                      <p className="mt-2 text-2xl font-black text-[var(--color-near-black)]">
                        {selectedUser._count.submittedComplaints}
                      </p>
                    </div>
                  </div>
                </section>

                {statusMutation.isError ? (
                  <div className="feedback-surface mt-6" data-tone="danger" role="alert">
                    {getErrorMessage(
                      statusMutation.error,
                      'We could not update this user account.',
                    )}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col justify-between gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-black text-[var(--color-near-black)]">Account controls</p>

                    <p className="mt-1 text-sm leading-6 text-[var(--color-charcoal)]/56">
                      Administrator accounts and unsupported status transitions cannot be changed
                      through this action.
                    </p>
                  </div>

                  {selectedUser.role !== 'ADMIN' &&
                  ['ACTIVE', 'SUSPENDED'].includes(selectedUser.status) ? (
                    <button
                      type="button"
                      className={
                        selectedUser.status === 'SUSPENDED'
                          ? 'btn-primary text-sm'
                          : 'btn-danger text-sm'
                      }
                      onClick={openStatusDialog}
                    >
                      {selectedUser.status === 'SUSPENDED' ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          Reactivate account
                        </>
                      ) : (
                        <>
                          <Ban className="size-4" />
                          Suspend account
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {showStatusDialog && selectedUser ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/48 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !statusMutation.isPending) {
              setShowStatusDialog(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-status-title"
            className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-[#fbf8f5] p-6 shadow-2xl"
          >
            <div className="icon-tile">
              {selectedUser.status === 'SUSPENDED' ? (
                <UserRoundCheck className="size-5" />
              ) : (
                <Ban className="size-5" />
              )}
            </div>

            <h2
              id="admin-user-status-title"
              className="mt-5 text-2xl font-black text-[var(--color-near-black)]"
            >
              {selectedUser.status === 'SUSPENDED'
                ? 'Reactivate this account?'
                : 'Suspend this account?'}
            </h2>

            <p className="mt-3 text-sm leading-7 text-[var(--color-charcoal)]/64">
              {selectedUser.status === 'SUSPENDED'
                ? `${selectedUser.firstName} will regain access to the platform.`
                : `${selectedUser.firstName} will lose access until an administrator reactivates the account.`}
            </p>

            {selectedUser.status !== 'SUSPENDED' ? (
              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-black text-[var(--color-charcoal)]/72">
                  Suspension reason
                </span>

                <textarea
                  className="form-field min-h-28"
                  value={statusReason}
                  onChange={(event) => setStatusReason(event.target.value)}
                  placeholder="Explain why this account is being suspended."
                  aria-invalid={statusReason.length > 0 && statusReason.trim().length < 10}
                  disabled={statusMutation.isPending}
                />

                <span className="mt-2 block text-xs font-semibold text-[var(--color-charcoal)]/48">
                  Minimum 10 characters.
                </span>
              </label>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={statusMutation.isPending}
                onClick={() => {
                  setShowStatusDialog(false);
                  setStatusReason('');
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  selectedUser.status === 'SUSPENDED' ? 'btn-primary text-sm' : 'btn-danger text-sm'
                }
                disabled={
                  statusMutation.isPending ||
                  (selectedUser.status !== 'SUSPENDED' && statusReason.trim().length < 10)
                }
                onClick={submitStatusChange}
              >
                {statusMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : selectedUser.status === 'SUSPENDED' ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Ban className="size-4" />
                )}

                {statusMutation.isPending
                  ? 'Updating...'
                  : selectedUser.status === 'SUSPENDED'
                    ? 'Reactivate account'
                    : 'Suspend account'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
