import { CalendarDays, MoreHorizontal, Pencil, Power, PowerOff, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { VendorServicePackage } from '../package.api';
import { PackageStatusBadge } from './PackageStatusBadge';

type PackageCardProps = {
  servicePackage: VendorServicePackage;
  isUpdatingStatus?: boolean;
  isDeleting?: boolean;
  onEdit: (servicePackage: VendorServicePackage) => void;
  onToggleStatus: (servicePackage: VendorServicePackage) => void;
  onDelete: (servicePackage: VendorServicePackage) => void;
};

function formatPrice(value: string | null) {
  if (value === null) {
    return 'Custom pricing';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function PackageCard({
  servicePackage,
  isUpdatingStatus = false,
  isDeleting = false,
  onEdit,
  onToggleStatus,
  onDelete,
}: PackageCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isBusy = isUpdatingStatus || isDeleting;

  function handleEdit() {
    setIsMenuOpen(false);
    onEdit(servicePackage);
  }

  function handleToggleStatus() {
    setIsMenuOpen(false);
    onToggleStatus(servicePackage);
  }

  function handleDelete() {
    setIsMenuOpen(false);
    onDelete(servicePackage);
  }

  return (
    <article className="group relative flex h-full flex-col overflow-visible rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(64,42,51,0.06)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(64,42,51,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <PackageStatusBadge isActive={servicePackage.isActive} />

          <h2 className="mt-4 line-clamp-2 text-xl font-semibold tracking-[-0.02em] text-[#34282e]">
            {servicePackage.title}
          </h2>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
            disabled={isBusy}
            aria-label={`Open actions for ${servicePackage.title}`}
            aria-expanded={isMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {isMenuOpen && (
            <>
              <button
                type="button"
                aria-label="Close package actions"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsMenuOpen(false)}
              />

              <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_50px_rgba(40,30,34,0.16)]">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  <Pencil className="h-4 w-4" />
                  Edit package
                </button>

                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={isUpdatingStatus}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {servicePackage.isActive ? (
                    <PowerOff className="h-4 w-4" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}

                  {isUpdatingStatus
                    ? 'Updating status...'
                    : servicePackage.isActive
                      ? 'Set inactive'
                      : 'Set active'}
                </button>

                <div className="my-1 border-t border-zinc-100" />

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete package'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm font-medium text-rose-800">
        <Tag className="h-4 w-4 shrink-0" />

        <span className="truncate">{servicePackage.category.name}</span>
      </div>

      <p className="mt-4 line-clamp-4 flex-1 text-sm leading-7 text-zinc-600">
        {servicePackage.description?.trim() ||
          'No description has been added for this service package yet.'}
      </p>

      <div className="mt-6 rounded-2xl border border-zinc-100 bg-[#faf8f7] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
          Starting price
        </p>

        <p className="mt-2 text-2xl font-semibold tracking-tight text-[#34282e]">
          {formatPrice(servicePackage.basePrice)}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-zinc-100 pt-4 text-xs font-medium text-zinc-400">
        <CalendarDays className="h-4 w-4 shrink-0" />

        <span>Updated {formatDate(servicePackage.updatedAt)}</span>
      </div>
    </article>
  );
}
