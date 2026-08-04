import type { ReactNode } from 'react';

type SectionHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  align?: 'start' | 'center';
  tone?: 'default' | 'light';
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  icon,
  badge,
  actions,
  align = 'start',
  tone = 'default',
}: SectionHeaderProps) {
  const isCentered = align === 'center';
  const isLight = tone === 'light';

  return (
    <div
      className={`flex flex-col gap-5 ${
        isCentered ? 'items-center text-center' : 'sm:flex-row sm:items-start sm:justify-between'
      }`}
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <div
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] ${
              isCentered ? 'justify-center' : ''
            } ${isLight ? 'text-white/58' : 'text-[var(--color-rosewood)]'}`}
          >
            {icon ? (
              <span
                className={`grid size-8 place-items-center rounded-xl ${
                  isLight
                    ? 'border border-white/10 bg-white/10 text-[var(--color-powder-blue)]'
                    : 'bg-[rgba(142,92,103,0.12)] text-[var(--color-rosewood)]'
                }`}
              >
                {icon}
              </span>
            ) : null}

            <span>{eyebrow}</span>
          </div>
        ) : null}

        <div
          className={`mt-3 flex flex-wrap items-center gap-3 ${isCentered ? 'justify-center' : ''}`}
        >
          <h2
            className={`text-balance text-3xl font-black tracking-[-0.045em] sm:text-4xl ${
              isLight ? 'text-[#fffaf5]' : 'text-[var(--color-near-black)]'
            }`}
          >
            {title}
          </h2>

          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>

        {description ? (
          <p
            className={`mt-3 text-sm font-semibold leading-7 sm:text-base ${
              isLight ? 'text-white/62' : 'text-[var(--color-charcoal)]/60'
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className={`flex shrink-0 flex-wrap gap-3 ${isCentered ? 'justify-center' : ''}`}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
