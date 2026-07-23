import { CheckCircle2, MessageSquareQuote, UsersRound, WalletCards } from 'lucide-react';

const floatingCards = [
  {
    title: 'Quotation requests',
    detail: 'Responses organised',
    icon: MessageSquareQuote,
    position: 'left-3 top-[11%] lg:-left-8 xl:-left-12',
    animationClass: 'hero-float-card-a',
    iconClass: 'bg-[rgba(183,167,200,0.32)] text-[var(--color-deep-plum)]',
  },
  {
    title: 'Budget overview',
    detail: 'Planning on track',
    icon: WalletCards,
    position: 'bottom-[11%] left-[7%] lg:-left-5 xl:-left-8',
    animationClass: 'hero-float-card-b',
    iconClass: 'bg-[rgba(142,151,115,0.24)] text-[#465036]',
  },
  {
    title: 'Guest management',
    detail: 'Invitations in one place',
    icon: UsersRound,
    position: 'right-3 top-[38%] lg:-right-7 xl:-right-10',
    animationClass: 'hero-float-card-c',
    iconClass: 'bg-[rgba(175,201,216,0.34)] text-[#334954]',
  },
];

export function HeroFloatingCards() {
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 z-20 hidden md:block">
        {floatingCards.map(({ title, detail, icon: Icon, position, animationClass, iconClass }) => (
          <div key={title} className={`absolute ${position} ${animationClass}`}>
            <div className="group flex min-w-[12.5rem] items-center gap-3 rounded-[1.3rem] border border-white/65 bg-white/58 px-3.5 py-3 shadow-[0_18px_44px_rgba(31,27,29,0.16)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/68 hover:shadow-[0_24px_54px_rgba(31,27,29,0.22)]">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl transition duration-300 group-hover:scale-105 ${iconClass}`}
              >
                <Icon className="size-[1.1rem]" />
              </span>

              <div className="min-w-0">
                <p className="truncate text-[0.7rem] font-black uppercase tracking-[0.13em] text-[var(--color-charcoal)]/55">
                  {title}
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-xs font-black text-[var(--color-near-black)]">
                  <CheckCircle2 className="size-3.5 shrink-0 text-[var(--color-dusty-olive)]" />
                  {detail}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
  @keyframes heroFloatCardA {
    0%,
    100% {
      transform: translate3d(0, 0, 0);
    }

    50% {
      transform: translate3d(0, -7px, 0);
    }
  }

  @keyframes heroFloatCardB {
    0%,
    100% {
      transform: translate3d(0, 0, 0);
    }

    50% {
      transform: translate3d(4px, -6px, 0);
    }
  }

  @keyframes heroFloatCardC {
    0%,
    100% {
      transform: translate3d(0, 0, 0);
    }

    50% {
      transform: translate3d(-4px, 7px, 0);
    }
  }

  .hero-float-card-a {
    animation: heroFloatCardA 4.8s ease-in-out infinite;
    will-change: transform;
  }

  .hero-float-card-b {
    animation: heroFloatCardB 5.6s ease-in-out infinite;
    animation-delay: -1.2s;
    will-change: transform;
  }

  .hero-float-card-c {
    animation: heroFloatCardC 5.2s ease-in-out infinite;
    animation-delay: -2s;
    will-change: transform;
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-float-card-a,
    .hero-float-card-b,
    .hero-float-card-c {
      animation: none;
    }
  }
`}</style>
    </>
  );
}
