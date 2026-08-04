import type { ReactNode } from 'react';

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
  details?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  imagePosition?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  icon,
  actions,
  details,
  imageSrc,
  imageAlt = '',
  imagePosition = 'center',
}: PageHeroProps) {
  return (
    <section className="group relative isolate overflow-hidden rounded-[2.25rem] border border-white/55 bg-white/24 shadow-[0_28px_90px_rgba(31,27,29,0.10)] backdrop-blur-2xl">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-8 size-72 rounded-full bg-[rgba(183,167,200,0.22)] blur-3xl transition-transform duration-700 group-hover:scale-110"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-28 right-[18%] size-80 rounded-full bg-[rgba(175,201,216,0.20)] blur-3xl transition-transform duration-700 group-hover:scale-110"
      />

      {imageSrc ? (
        <div className="absolute inset-y-0 right-0 hidden w-[44%] overflow-hidden lg:block">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-[1.025]"
            style={{
              objectPosition: imagePosition,
            }}
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,242,239,1)_0%,rgba(247,242,239,0.72)_28%,rgba(93,58,85,0.18)_100%)]"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(31,27,29,0.16))]"
          />
        </div>
      ) : null}

      <div className={`relative p-6 sm:p-8 lg:p-10 ${imageSrc ? 'lg:max-w-[66%]' : ''}`}>
        <div className="flex w-fit items-center gap-2 rounded-full border border-white/50 bg-white/34 px-3.5 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--color-deep-plum)] shadow-[0_10px_28px_rgba(31,27,29,0.06)] backdrop-blur-xl">
          {icon ? <span className="text-[var(--color-rosewood)]">{icon}</span> : null}
          {eyebrow}
        </div>

        <h1 className="mt-6 max-w-4xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--color-near-black)] sm:text-5xl xl:text-6xl">
          {title}
        </h1>

        <p className="mt-5 max-w-2xl text-pretty text-base font-medium leading-8 text-[var(--color-charcoal)]/66 sm:text-lg">
          {description}
        </p>

        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}

        {details ? <div className="mt-9 border-t border-white/45 pt-6">{details}</div> : null}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.92),transparent)]"
      />
    </section>
  );
}
