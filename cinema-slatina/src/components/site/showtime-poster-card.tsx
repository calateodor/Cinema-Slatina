import Link from "next/link";
import { Ticket } from "lucide-react";
import { MoviePoster } from "@/components/site/movie-poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/dates";
import type { ScreeningView } from "@/server/queries";
import { cn } from "@/lib/utils";

/**
 * Cartonașul unei proiecții, în forma afișului tipărit al cinematografului:
 * ora deasupra posterului, eticheta 3D în colț, restul detaliilor dedesubt.
 */
export function ShowtimePosterCard({
  screening,
  reservationsEnabled = true,
}: {
  screening: ScreeningView;
  reservationsEnabled?: boolean;
}) {
  const { movie, capacity } = screening;
  const full = capacity.soldOut;
  const canReserve = reservationsEnabled && screening.reservationsOpen && !full;
  const percent = Math.min(
    100,
    Math.round((capacity.takenBase / capacity.base) * 100),
  );

  return (
    <article className="group flex flex-col">
      {/* Ora, ca pe afiș: mare, galbenă, așezată peste marginea posterului. */}
      <div className="relative z-10 -mb-3 flex justify-center">
        <span className="ticket rounded-lg bg-brand-yellow px-3 py-0.5 text-2xl leading-tight text-brand-ink shadow-[0_6px_16px_-6px_rgba(0,0,0,0.8)] sm:text-3xl">
          {formatTime(screening.startsAt)}
        </span>
      </div>

      <Link
        href={`/filme/${movie.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`${movie.title}, ora ${formatTime(screening.startsAt)}, ${screening.hall.name}`}
      >
        <MoviePoster
          title={movie.title}
          posterUrl={movie.posterUrl}
          is3D={screening.is3D}
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px"
          className="transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none"
        />
      </Link>

      <div className="mt-3 flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-pretty text-sm font-semibold leading-snug sm:text-base">
          <Link
            href={`/filme/${movie.slug}`}
            className="transition-colors hover:text-brand-yellow motion-reduce:transition-none"
          >
            {movie.title}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            style={{
              borderColor: `color-mix(in oklch, ${screening.hall.colorHex} 45%, transparent)`,
              backgroundColor: `color-mix(in oklch, ${screening.hall.colorHex} 12%, transparent)`,
              color: screening.hall.colorHex,
            }}
          >
            {screening.hall.name}
          </Badge>
          <Badge variant="outline">
            {screening.isDubbed ? "Dublat" : "Subtitrat"}
          </Badge>
          {movie.ageRating ? (
            <Badge variant="outline">{movie.ageRating}</Badge>
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <div>
            <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span>Locuri ocupate</span>
              <span className="ticket text-sm tabular-nums text-foreground">
                {capacity.takenBase}
                <span className="text-muted-foreground">/{capacity.base}</span>
              </span>
            </div>
            <div
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={capacity.takenBase}
              aria-valuemin={0}
              aria-valuemax={capacity.base}
              aria-label="Grad de ocupare"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
                  percent >= 100
                    ? "bg-destructive"
                    : percent >= 80
                      ? "bg-brand-orange"
                      : "bg-brand-yellow",
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            {capacity.extraUnlocked ? (
              <p className="mt-1 text-[0.7rem] text-brand-yellow">
                Scaune suplimentare: {capacity.takenExtra}/{capacity.extra}
              </p>
            ) : null}
          </div>

          {canReserve ? (
            <Button asChild size="sm" className="w-full rounded-full font-semibold">
              <Link href={`/rezervare/${screening.id}`}>
                <Ticket data-icon="inline-start" />
                Rezervă
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              size="sm"
              variant="secondary"
              className="w-full rounded-full font-semibold"
            >
              {full ? "Sala este plină" : "Rezervări închise"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
