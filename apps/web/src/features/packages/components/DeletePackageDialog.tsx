import { CircleAlert, LoaderCircle, Trash2, X } from 'lucide-react';
import type { VendorServicePackage } from '../package.api';

type DeletePackageDialogProps = {
  open: boolean;
  servicePackage: VendorServicePackage | null;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeletePackageDialog({
  open,
  servicePackage,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeletePackageDialogProps) {
  if (!open || !servicePackage) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(31,27,29,0.5)] px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-package-title"
      aria-describedby="delete-package-description"
    >
      <div className="grid min-h-full place-items-center">
        <button
          type="button"
          aria-label="Close delete package dialog"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute inset-0 cursor-default disabled:cursor-not-allowed"
        />

        <div className="glass-card relative z-10 w-full max-w-lg overflow-hidden p-6 shadow-[0_30px_90px_rgba(25,25,25,0.28)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-red-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 size-40 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-5">
              <div className="grid size-14 shrink-0 place-items-center rounded-[1.2rem] bg-[rgba(124,74,90,0.12)] text-[var(--color-muted-burgundy)] shadow-[0_14px_34px_rgba(64,42,51,0.08)]">
                <Trash2 className="size-6" />
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-white/60 bg-white/36 text-[var(--color-charcoal)]/58 transition hover:bg-white/52 hover:text-[var(--color-deep-plum)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close delete package dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-muted-burgundy)]">
              Delete package
            </p>

            <h2
              id="delete-package-title"
              className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-near-black)] sm:text-3xl"
            >
              Permanently remove this package?
            </h2>

            <div className="mt-5 rounded-[22px] border border-white/65 bg-white/34 p-5 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-charcoal)]/42">
                Selected package
              </p>

              <p className="mt-2 break-words text-lg font-black tracking-[-0.025em] text-[var(--color-near-black)]">
                {servicePackage.title}
              </p>

              <p className="mt-1 text-sm font-semibold text-[var(--color-charcoal)]/52">
                {servicePackage.category.name}
              </p>
            </div>

            <div
              id="delete-package-description"
              className="mt-5 flex items-start gap-3 rounded-[22px] border border-[rgba(124,74,90,0.18)] bg-[rgba(124,74,90,0.08)] p-4 text-sm leading-6 text-[var(--color-muted-burgundy)]"
            >
              <CircleAlert className="mt-0.5 size-5 shrink-0" />

              <p>
                This action permanently removes the package from your vendor profile. Customers will
                no longer be able to view it, and the action cannot be undone.
              </p>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/55 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="btn-secondary justify-center text-sm font-bold"
              >
                Keep package
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-muted-burgundy)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(124,74,90,0.22)] transition duration-300 hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                {isDeleting ? 'Deleting package...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
