import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * Antetul paginilor interioare: eticheta înclinată ca paralelogramul galben
 * din sigla cinematografului, titlul mare cu ecoul lui conturat în spate și o
 * linie de peliculă dedesubt.
 */
export function PageHeader({
  eyebrow = "CINEMA „EUGEN IONESCU” · SLATINA",
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative pb-8 pt-8 sm:pb-12 sm:pt-12", className)}>
      {/* ecoul titlului: mare, doar contur, în spate */}
      <span
        aria-hidden="true"
        className="page-header-echo display pointer-events-none absolute -left-1 top-2 select-none whitespace-nowrap text-[clamp(4rem,16vw,11rem)] leading-none sm:top-0"
      >
        {title}
      </span>

      <Reveal stagger y={18} className="relative flex flex-col items-start gap-4">
        <span className="ticket -skew-x-12 bg-brand-yellow px-3 py-0.5 text-sm tracking-[0.22em] text-brand-ink shadow-[0_10px_30px_-10px_rgba(255,222,89,0.8)] sm:text-base">
          <span className="inline-block skew-x-12">{eyebrow}</span>
        </span>
        <h1 className="display text-balance text-[clamp(2.3rem,7vw,4.6rem)] leading-[0.95] text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-[0.95rem] leading-relaxed text-white/70 sm:text-base">
            {description}
          </p>
        ) : null}
        {children}
        <div className="film-strip mt-2 h-1 w-40 rounded-full opacity-70" aria-hidden="true" />
      </Reveal>
    </header>
  );
}
