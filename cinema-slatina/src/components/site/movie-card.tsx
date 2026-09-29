import Image from "next/image";
import Link from "next/link";
import { Clock3, Ticket } from "lucide-react";
import { GlowCard } from "@/components/motion/glow-card";
import { Glare } from "@/components/motion/glare";
import { cn } from "@/lib/utils";

export type MovieCardProps = {
  href: string;
  title: string;
  posterUrl: string | null;
  /** Orele „HH:mm” afișate deasupra cardului, ca pe afiș. */
  times: string[];
  is3D?: boolean;
  isDubbed?: boolean;
  genres?: string | null;
  runtimeMin?: number | null;
  ageRating?: string | null;
  halls?: { name: string; colorHex: string }[];
  /** Butonul de jos. Fără `href`, butonul e inactiv și arată doar eticheta. */
  action: { href?: string; label: string };
  /** Opțional: rândul de ocupare al sălii (pe pagina Program). */
  footer?: React.ReactNode;
  /** Proiecție trecută: cardul stă estompat. */
  dimmed?: boolean;
  sizes?: string;
  className?: string;
};

/**
 * Cardul unui film: ora mare, galbenă și înclinată, lipită peste marginea de
 * sus (ca pe afișul tipărit), posterul cu un gradient spre text, apoi titlul,
 * detaliile și butonul de rezervare. Marginea se aprinde spre cursor
 * (Border Glow).
 */
export function MovieCard({
  href,
  title,
  posterUrl,
  times,
  is3D = false,
  isDubbed,
  genres,
  runtimeMin,
  ageRating,
  halls = [],
  action,
  footer,
  dimmed = false,
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px",
  className,
}: MovieCardProps) {
  const firstGenre = genres?.split(",")[0]?.trim();

  return (
    <article className={cn("movie-card group relative pt-5 sm:pt-6", dimmed && "opacity-55", className)}>
      {/* Orele, peste marginea de sus a cardului. */}
      <div className="pointer-events-none absolute left-2 top-0 z-20 flex -rotate-6 flex-wrap gap-x-2">
        {times.map((time) => (
          <span key={time} className="poster-type text-[clamp(1.55rem,4.4vw,2.35rem)] leading-none">
            {time}
          </span>
        ))}
      </div>

      <GlowCard asCard={false} background="#101014" className="flex h-full flex-col rounded-[1.1rem]">
        <Link
          href={href}
          aria-label={`${title}${times.length ? `, ora ${times.join(" și ")}` : ""}`}
          className="relative block aspect-[2/3] overflow-hidden rounded-t-[1.1rem] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-yellow/70"
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={`Afișul filmului ${title}`}
              fill
              sizes={sizes}
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] motion-reduce:transition-none"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#2a1d08] to-[#0b0b0e] p-4 text-center">
              <span className="display text-xl text-white/85">{title}</span>
            </div>
          )}
          {/* gradientul de jos leagă posterul de text */}
          <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#101014] via-[#101014]/55 to-transparent" />
          {ageRating ? (
            <span className="absolute right-2.5 top-2.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[0.68rem] font-semibold tracking-wide text-white backdrop-blur-sm">
              {ageRating}
            </span>
          ) : null}
          {is3D ? (
            <span className="poster-type tilt-strong absolute bottom-2 right-2.5 text-[clamp(1.2rem,3.4vw,1.8rem)]">
              3D
            </span>
          ) : null}
          <Glare />
        </Link>

        <div className="flex flex-1 flex-col gap-2.5 p-3 pt-2 sm:p-4 sm:pt-2.5">
          <h3 className="display line-clamp-2 text-[0.95rem] leading-tight text-white sm:text-[1.08rem]">
            <Link href={href} className="transition-colors hover:text-brand-yellow motion-reduce:transition-none">
              {title}
            </Link>
          </h3>

          {firstGenre || runtimeMin ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.72rem] text-white/60 sm:text-xs">
              {firstGenre ? <span>{firstGenre}</span> : null}
              {firstGenre && runtimeMin ? <span aria-hidden="true">·</span> : null}
              {runtimeMin ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3" aria-hidden="true" />
                  {runtimeMin} min
                </span>
              ) : null}
            </p>
          ) : null}

          {halls.length || isDubbed !== undefined ? (
            <div className="flex flex-wrap gap-1.5">
              {halls.map((hall) => (
                <span
                  key={hall.name}
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.68rem] font-medium"
                  style={{
                    color: hall.colorHex,
                    backgroundColor: `color-mix(in oklch, ${hall.colorHex} 14%, transparent)`,
                    boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${hall.colorHex} 40%, transparent)`,
                  }}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: hall.colorHex }} />
                  {hall.name}
                </span>
              ))}
              {isDubbed !== undefined ? (
                <span className="rounded-full px-2 py-0.5 text-[0.68rem] font-medium text-white/70 ring-1 ring-white/15">
                  {isDubbed ? "Dublat" : "Subtitrat"}
                </span>
              ) : null}
            </div>
          ) : null}

          {footer}

          <div className="mt-auto pt-1">
            {action.href ? (
              <Link
                href={action.href}
                className="relative flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-yellow text-sm font-semibold text-brand-ink shadow-[0_10px_28px_-12px_rgba(255,222,89,0.8)] transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-brand-yellow-soft hover:shadow-[0_16px_34px_-12px_rgba(255,222,89,0.95)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/70 motion-reduce:transition-none"
              >
                <Ticket className="size-4" aria-hidden="true" />
                {action.label}
                {/* luciul care trece peste buton la hover */}
                <span className="movie-card-shine pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/45" />
              </Link>
            ) : (
              <span className="flex h-10 w-full items-center justify-center rounded-xl bg-white/6 text-sm font-semibold text-white/55 ring-1 ring-white/10">
                {action.label}
              </span>
            )}
          </div>
        </div>
      </GlowCard>
    </article>
  );
}
