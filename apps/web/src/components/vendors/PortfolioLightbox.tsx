import { ArrowLeft, ArrowRight, Image as ImageIcon, X } from 'lucide-react';
import { useEffect } from 'react';

export type PortfolioLightboxItem = {
  id: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
};

type PortfolioLightboxProps = {
  items: PortfolioLightboxItem[];
  activeIndex: number | null;
  vendorName: string;
  onClose: () => void;
  onChange: (index: number) => void;
};

export function PortfolioLightbox({
  items,
  activeIndex,
  vendorName,
  onClose,
  onChange,
}: PortfolioLightboxProps) {
  const isOpen = activeIndex !== null && activeIndex >= 0 && activeIndex < items.length;

  useEffect(() => {
    if (!isOpen || activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft') {
        const previousIndex = activeIndex === 0 ? items.length - 1 : activeIndex - 1;

        onChange(previousIndex);
        return;
      }

      if (event.key === 'ArrowRight') {
        const nextIndex = activeIndex === items.length - 1 ? 0 : activeIndex + 1;

        onChange(nextIndex);
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, isOpen, items.length, onChange, onClose]);

  if (!isOpen || activeIndex === null) {
    return null;
  }

  const activeItem = items[activeIndex];

  if (!activeItem) {
    return null;
  }

  const showNavigation = items.length > 1;

  const handlePrevious = () => {
    const previousIndex = activeIndex === 0 ? items.length - 1 : activeIndex - 1;

    onChange(previousIndex);
  };

  const handleNext = () => {
    const nextIndex = activeIndex === items.length - 1 ? 0 : activeIndex + 1;

    onChange(nextIndex);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${vendorName} portfolio image viewer`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,17,19,0.86)] p-4 backdrop-blur-xl sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-[rgba(31,27,29,0.82)] shadow-[0_40px_120px_rgba(0,0,0,0.52)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
              <ImageIcon className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">
                {activeItem.title ?? `${vendorName} portfolio`}
              </p>

              <p className="mt-0.5 text-xs font-bold text-white/52">
                Image {activeIndex + 1} of {items.length}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/8 text-white transition hover:rotate-3 hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Close portfolio viewer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-black/20 p-3 sm:p-5">
          <img
            src={activeItem.imageUrl}
            alt={activeItem.title ?? `${vendorName} portfolio image`}
            className="max-h-[68vh] w-full rounded-[1.4rem] object-contain"
          />

          {showNavigation ? (
            <>
              <button
                type="button"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/35 text-white shadow-lg backdrop-blur-xl transition hover:-translate-y-1/2 hover:scale-105 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:left-6"
                aria-label="View previous portfolio image"
              >
                <ArrowLeft className="size-5" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/35 text-white shadow-lg backdrop-blur-xl transition hover:-translate-y-1/2 hover:scale-105 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6"
                aria-label="View next portfolio image"
              >
                <ArrowRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>

        {activeItem.description ? (
          <div className="border-t border-white/10 px-5 py-4 sm:px-6">
            <p className="max-w-3xl text-sm leading-6 text-white/68">{activeItem.description}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
