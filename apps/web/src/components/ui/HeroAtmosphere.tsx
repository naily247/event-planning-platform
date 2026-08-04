type HeroAtmosphereProps = {
  imageSrc?: string;
  imageAlt?: string;
  imagePosition?: string;
  imageOpacity?: number;
  className?: string;
};

export function HeroAtmosphere({
  imageSrc,
  imageAlt = '',
  imagePosition = 'center',
  imageOpacity = 0.9,
  className = '',
}: HeroAtmosphereProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-visible [border-radius:inherit] ${className}`}
    >
      {/* Everything in this layer remains clipped inside the rounded hero. */}
      <div className="absolute inset-0 overflow-hidden [border-radius:inherit]">
        <div className="absolute -left-28 -top-32 size-[28rem] rounded-full bg-[rgba(183,167,200,0.16)] blur-3xl" />

        <div className="absolute -bottom-48 left-[22%] size-[30rem] rounded-full bg-[rgba(175,201,216,0.16)] blur-3xl" />

        <div className="absolute -right-24 -top-20 size-[30rem] rounded-full bg-[rgba(255,210,190,0.13)] blur-3xl" />

        <div className="absolute inset-y-0 right-0 hidden w-[52%] bg-[radial-gradient(circle_at_76%_34%,rgba(255,255,255,0.13),transparent_46%),linear-gradient(90deg,transparent,rgba(255,255,255,0.045))] lg:block" />

        <div className="absolute bottom-0 right-0 hidden h-[72%] w-[42%] rounded-tl-[8rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] backdrop-blur-[2px] lg:block" />

        <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.28)_0.55px,transparent_0.55px)] [background-size:5px_5px]" />

        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.025),transparent_34%,rgba(255,255,255,0.018)_72%,transparent)]" />
      </div>

      {/* Only the photograph is allowed to bleed beyond the right edge. */}
      {imageSrc ? (
        <div className="absolute inset-y-0 -right-[5%] left-0 hidden overflow-hidden rounded-l-[2.35rem] rounded-r-[2.8rem] lg:block">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="absolute inset-0 size-full object-cover"
            style={{
              objectPosition: imagePosition,
              opacity: imageOpacity,
              WebkitMaskImage:
                'linear-gradient(90deg, transparent 0%, transparent 23%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.34) 41%, rgba(0,0,0,0.7) 54%, black 68%, black 100%)',
              maskImage:
                'linear-gradient(90deg, transparent 0%, transparent 23%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.34) 41%, rgba(0,0,0,0.7) 54%, black 68%, black 100%)',
            }}
          />

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(73,43,68,0.98)_0%,rgba(73,43,68,0.9)_25%,rgba(73,43,68,0.56)_43%,rgba(73,43,68,0.18)_61%,rgba(73,43,68,0.03)_78%,transparent_100%)]" />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,25,42,0.06),rgba(42,25,42,0.18))]" />

          <div className="absolute inset-y-0 left-[21%] w-[34%] bg-[radial-gradient(circle_at_center,rgba(112,61,78,0.42),transparent_72%)] blur-3xl" />
        </div>
      ) : null}
    </div>
  );
}
