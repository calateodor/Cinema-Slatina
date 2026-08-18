import Link from "next/link";
import { Ticket } from "lucide-react";
import { MoviePoster } from "@/components/site/movie-poster";
import { SeatMeter } from "@/components/site/seat-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TimeBadge } from "@/components/site/showtime-badges";
import type { ScreeningView } from "@/server/queries";

/** Eticheta sălii, colorată cu accentul propriu al sălii. */
export function HallBadge({
  hall,
  className,
}: {
  hall: ScreeningView["hall"];
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={className}
      style={{
        borderColor: `color-mix(in oklch, ${hall.colorHex} 45%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${hall.colorHex} 12%, transparent)`,
        color: hall.colorHex,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: hall.colorHex }}
        aria-hidden="true"
      />
      {hall.name}
    </Badge>
  );
}

export function ShowtimeCard({
  screening,
  reservationsEnabled = true,
}: {
  screening: ScreeningView;
  reservationsEnabled?: boolean;
}) {
  const { movie, capacity } = screening;
  const full = capacity.soldOut;
  const canReserve =
    reservationsEnabled &&
    screening.reservationsOpen &&
    !full &&
    !screening.hasStarted;

  return (
    <Card className="group transition-shadow duration-300 hover:ring-brand-orange/40 motion-reduce:transition-none">
      <CardContent className="flex gap-4">
        <Link
          href={`/filme/${movie.slug}`}
          className="w-16 shrink-0 sm:w-20"
          tabIndex={-1}
          aria-hidden="true"
        >
          <MoviePoster
            title={movie.title}
            posterUrl={movie.posterUrl}
            sizes="80px"
            className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <TimeBadge startsAt={screening.startsAt} size="sm" />
            {movie.runtimeMin ? (
              <span className="text-xs text-muted-foreground">
                {movie.runtimeMin} min
              </span>
            ) : null}
            <HallBadge hall={screening.hall} className="ml-auto" />
          </div>

          <h3 className="text-pretty text-base font-semibold leading-snug">
            <Link
              href={`/filme/${movie.slug}`}
              className="transition-colors hover:text-brand-yellow motion-reduce:transition-none"
            >
              {movie.title}
            </Link>
          </h3>

          {movie.genres ? (
            <p className="truncate text-xs text-muted-foreground">
              {movie.genres}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {screening.is3D ? (
              <Badge variant="brand">3D</Badge>
            ) : (
              <Badge variant="outline">2D</Badge>
            )}
            <Badge variant="outline">
              {screening.isDubbed ? "Dublat" : "Subtitrat"}
            </Badge>
            {movie.ageRating ? (
              <Badge variant="outline">{movie.ageRating}</Badge>
            ) : null}
          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SeatMeter capacity={capacity} className="sm:max-w-60" compact />

            {canReserve ? (
              <Button asChild className="rounded-full font-semibold">
                <Link href={`/rezervare/${screening.id}`}>
                  <Ticket data-icon="inline-start" />
                  Rezervă
                </Link>
              </Button>
            ) : (
              <Button
                disabled
                variant="secondary"
                className="rounded-full font-semibold"
              >
                {screening.hasStarted
                  ? "A început"
                  : full
                    ? "Sala este plină"
                    : "Rezervări închise"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
