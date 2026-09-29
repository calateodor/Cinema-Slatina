import Link from "next/link";
import { Ticket } from "lucide-react";
import { GlowCard } from "@/components/motion/glow-card";
import { HallBadge } from "@/components/site/showtime-card";
import { dayTabLabel, formatDayMonth, formatTime } from "@/lib/dates";
import type { ScreeningView } from "@/server/queries";
import { cn } from "@/lib/utils";

/**
 * O proiecție pe fișa filmului, fără afiș și titlu (sunt deja sus, pe
 * pagină): ziua, ora mare ca pe afiș, sala, formatul, ocuparea și butonul.
 */
export function ScreeningTile({
  screening,
  reservationsEnabled = true,
}: {
  screening: ScreeningView;
  reservationsEnabled?: boolean;
}) {
  const { capacity } = screening;
  const startsAt = new Date(screening.startsAt);
  const full = capacity.soldOut;
  const canReserve =
    reservationsEnabled && screening.reservationsOpen && !full && !screening.hasStarted;
  const percent = Math.min(100, Math.round((capacity.takenBase / capacity.base) * 100));

  return (
    <GlowCard asCard={false} background="#101014" className="flex flex-col gap-3 rounded-[1.1rem] p-3 sm:p-4">
      <div>
        <p className="ticket text-xs tracking-[0.2em] text-white/80">
          {dayTabLabel(startsAt).toUpperCase()}
          <span className="mt-0.5 block text-white/45">{formatDayMonth(startsAt)}</span>
        </p>
        <p className="poster-type mt-1 text-[2rem] leading-none">{formatTime(startsAt)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[0.7rem] font-medium">
        <HallBadge hall={screening.hall} />
        <span
          className={cn(
            "rounded-full px-2 py-0.5",
            screening.is3D ? "bg-brand-yellow text-brand-ink" : "text-white/70 ring-1 ring-white/15",
          )}
        >
          {screening.is3D ? "3D" : "2D"}
        </span>
        <span className="rounded-full px-2 py-0.5 text-white/70 ring-1 ring-white/15">
          {screening.isDubbed ? "Dublat" : "Subtitrat"}
        </span>
      </div>

      {/* ocuparea, într-un singur rând */}
      <div className="flex items-center gap-2 text-xs text-white/60">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn(
              "h-full rounded-full",
              percent >= 100 ? "bg-destructive" : percent >= 80 ? "bg-brand-orange" : "bg-brand-yellow",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="tabular-nums">
          {capacity.takenBase}/{capacity.base}
        </span>
      </div>

      {canReserve ? (
        <Link
          href={`/rezervare/${screening.id}`}
          className="mt-auto flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-yellow text-sm font-semibold text-brand-ink transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-brand-yellow-soft motion-reduce:transition-none"
        >
          <Ticket className="size-4" aria-hidden="true" />
          Rezervă<span className="hidden sm:inline"> gratuit</span>
        </Link>
      ) : (
        <span className="mt-auto flex h-10 items-center justify-center rounded-xl bg-white/6 text-sm font-semibold text-white/55 ring-1 ring-white/10">
          {screening.hasStarted ? "A început" : full ? "Sala este plină" : "Rezervări închise"}
        </span>
      )}
    </GlowCard>
  );
}
