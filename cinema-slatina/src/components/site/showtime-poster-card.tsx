import { MovieCard } from "@/components/site/movie-card";
import { formatTime } from "@/lib/dates";
import type { ScreeningView } from "@/server/queries";
import { cn } from "@/lib/utils";

/**
 * O proiecție din pagina Program, în același card ca pe prima pagină: ora
 * peste marginea de sus, posterul, sala și ocuparea, apoi butonul de rezervare.
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
  const canReserve =
    reservationsEnabled && screening.reservationsOpen && !full && !screening.hasStarted;
  const percent = Math.min(100, Math.round((capacity.takenBase / capacity.base) * 100));

  return (
    <MovieCard
      className="w-full"
      dimmed={screening.hasStarted}
      href={`/filme/${movie.slug}`}
      title={movie.title}
      posterUrl={movie.posterUrl}
      times={[formatTime(new Date(screening.startsAt))]}
      is3D={screening.is3D}
      isDubbed={screening.isDubbed}
      genres={movie.genres}
      runtimeMin={movie.runtimeMin}
      ageRating={movie.ageRating}
      halls={[{ name: screening.hall.name, colorHex: screening.hall.colorHex }]}
      action={
        canReserve
          ? { href: `/rezervare/${screening.id}`, label: "Rezervă gratuit" }
          : {
              label: screening.hasStarted
                ? "A început"
                : full
                  ? "Sala este plină"
                  : "Rezervări închise",
            }
      }
      footer={
        <div>
          <div className="flex items-baseline justify-between gap-2 text-[0.7rem] text-white/55">
            <span>Locuri ocupate</span>
            <span className="ticket text-sm tabular-nums text-white">
              {capacity.takenBase}
              <span className="text-white/45">/{capacity.base}</span>
            </span>
          </div>
          <div
            className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={capacity.takenBase}
            aria-valuemin={0}
            aria-valuemax={capacity.base}
            aria-label="Grad de ocupare"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none",
                percent >= 100 ? "bg-destructive" : percent >= 80 ? "bg-brand-orange" : "bg-brand-yellow",
              )}
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>
          {capacity.extraUnlocked ? (
            <p className="mt-1 text-[0.68rem] text-brand-yellow">
              Scaune suplimentare: {capacity.takenExtra}/{capacity.extra}
            </p>
          ) : null}
        </div>
      }
    />
  );
}
