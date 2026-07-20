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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md rounded-[30px] border border-white/80 bg-white p-7 shadow-[0_30px_90px_rgba(25,25,25,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
          Delete package
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#34282e]">
          Delete "{servicePackage.title}"?
        </h2>

        <p className="mt-4 text-sm leading-7 text-zinc-600">
          This action permanently removes the package from your vendor profile. This cannot be
          undone.
        </p>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete package'}
          </button>
        </div>
      </div>
    </div>
  );
}
