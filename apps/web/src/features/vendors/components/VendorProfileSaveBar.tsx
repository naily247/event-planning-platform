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
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 px-4 sm:bottom-6">
      <div className="pointer-events-auto mx-auto w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-[rgba(44,28,39,0.94)] px-5 py-4 text-white shadow-[0_26px_80px_rgba(28,15,23,0.38)] backdrop-blur-2xl sm:px-6 sm:py-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-white/[0.08] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 left-[28%] size-40 rounded-full bg-[rgba(183,167,200,0.12)] blur-3xl"
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/[0.08] text-white">
                <Save className="size-4.5" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-black tracking-[-0.015em] text-white">
                  You have unsaved profile changes.
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-white/60">
                  Save your updates before leaving this page, or discard them to restore the last
                  saved version.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2.5 sm:justify-end">
              <button
                type="button"
                disabled={isSaving}
                onClick={onDiscard}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/[0.07] px-4 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.13] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
              >
                <RotateCcw className="size-4" />
                Discard changes
              </button>

              <button
                type="button"
                disabled={isDisabled}
                onClick={onSave}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-xs font-black !text-[var(--color-deep-plum)] shadow-[0_12px_30px_rgba(12,7,10,0.20)] transition hover:-translate-y-0.5 hover:bg-white/94 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
              >
                {isSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}

                {isSaving ? 'Saving changes...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
