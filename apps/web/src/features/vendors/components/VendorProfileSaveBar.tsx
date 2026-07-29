import { LoaderCircle, RotateCcw, Save } from 'lucide-react';

type VendorProfileSaveBarProps = {
  isVisible: boolean;
  isSaving: boolean;
  isDisabled: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export function VendorProfileSaveBar({
  isVisible,
  isSaving,
  isDisabled,
  onSave,
  onDiscard,
}: VendorProfileSaveBarProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 px-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-[1.5rem] border border-white/30 bg-[rgba(49,31,43,0.92)] px-5 py-4 text-white shadow-[0_24px_70px_rgba(28,15,23,0.34)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">You have unsaved profile changes.</p>

          <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
            Save your updates before leaving this page.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/24 bg-white/8 px-4 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            disabled={isSaving}
            onClick={onDiscard}
          >
            <RotateCcw className="size-4" />
            Discard
          </button>

          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-5 text-xs font-black text-[var(--color-deep-plum)] shadow-[0_12px_28px_rgba(12,7,10,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            disabled={isDisabled}
            onClick={onSave}
          >
            {isSaving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}

            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
