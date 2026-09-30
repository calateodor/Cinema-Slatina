"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { addDays, formatDayMonth, formatTime, formatWeekday, isToday } from "@/lib/dates";
import { youtubeId } from "@/lib/format";
import type { DisplayProgram, DisplayScreening } from "@/server/queries";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Afișajul de pe televizoarele din cinematograf: un perete de afișe mari, în
   stilul cardurilor de pe prima pagină, pe un fundal cinematic (cadrul din
   filmul care rulează, estompat). Două moduri:
   - fără sală: televizorul de la casierie, un rând de afișe pentru fiecare sală;
   - cu sală: televizorul de la intrarea sălii, cu trailerul filmului care
     urmează și afișele sălii.
   Singura stare marcată e „rulează acum”: afișul se luminează și primește o
   bandă galbenă; filmele terminate doar se sting. Totul se calculează în
   browser din ora curentă; programul se reia din bază la fiecare minut, iar
   pagina se reîncarcă de tot o dată la 12 ore, ca să nu se împotmolească pe
   cutiile slabe.
--------------------------------------------------------------------------- */

const DEFAULT_RUNTIME_MIN = 110;
/** Cât timp după început mai ține televizorul sălii trailerul filmului. */
const TRAILER_GRACE_MIN = 10;
const REFRESH_MS = 60_000;
const CLOCK_MS = 15_000;
const RELOAD_MS = 12 * 60 * 60_000;

type Status = "upcoming" | "running" | "ended";

const startOf = (s: DisplayScreening) => new Date(s.startsAt);
const endOf = (s: DisplayScreening) =>
  new Date(startOf(s).getTime() + (s.movie.runtimeMin ?? DEFAULT_RUNTIME_MIN) * 60_000);
function statusOf(s: DisplayScreening, now: Date): Status {
  if (now >= endOf(s)) return "ended";
  if (now >= startOf(s)) return "running";
  return "upcoming";
}
const minutesUntil = (date: Date, now: Date) => Math.round((date.getTime() - now.getTime()) / 60_000);

/** Ziua afișată: azi, cât mai e ceva de văzut; după ultimul film, mâine. */
function pickDay(screenings: DisplayScreening[], now: Date) {
  const today = screenings.filter((s) => isToday(startOf(s), now));
  const tomorrow = screenings.filter((s) => isToday(startOf(s), addDays(now, 1)));
  const todayLeft = today.some((s) => statusOf(s, now) !== "ended");
  if (todayLeft || tomorrow.length === 0) return { list: today, isTomorrow: false };
  return { list: tomorrow, isTomorrow: true };
}

export function DisplayBoard({
  program,
  hallSlug,
  sound = false,
}: {
  program: DisplayProgram;
  hallSlug?: string;
  sound?: boolean;
}) {
  const router = useRouter();
  // pornește de la ora serverului, ca HTML-ul să fie identic la hidratare
  const [now, setNow] = useState(() => new Date(program.generatedAt));

  useEffect(() => {
    // ora reală a cutiei, imediat după hidratare, apoi din 15 în 15 secunde
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const clock = window.setInterval(() => setNow(new Date()), CLOCK_MS);
    const refresh = window.setInterval(() => router.refresh(), REFRESH_MS);
    const reload = window.setTimeout(() => window.location.reload(), RELOAD_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(clock);
      window.clearInterval(refresh);
      window.clearTimeout(reload);
    };
  }, [router]);

  const hall = hallSlug ? program.halls.find((h) => h.slug === hallSlug) : undefined;
  const scoped = hall ? program.screenings.filter((s) => s.hall.slug === hall.slug) : program.screenings;
  const day = pickDay(scoped, now);
  const dayDate = day.list[0] ? startOf(day.list[0]) : addDays(now, day.isTomorrow ? 1 : 0);
  // filmul care urmează sau a început de sub 10 minute (pe sală: trailerul lui)
  const featured = scoped.find((s) => minutesUntil(startOf(s), now) > -TRAILER_GRACE_MIN);
  // fundalul: cadrul filmului care rulează, altfel al celui care urmează
  const backdropOf = day.list.find((s) => statusOf(s, now) === "running") ?? featured;
  const backdrop = backdropOf?.movie.backdropUrl ?? backdropOf?.movie.posterUrl ?? null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {backdrop ? (
        <Image key={backdrop} src={backdrop} alt="" fill priority sizes="100vw" className="tv-backdrop object-cover" />
      ) : null}
      <div className="tv-shade absolute inset-0" />

      {hall ? (
        <main className="relative grid h-full grid-cols-[58fr_42fr] gap-[2.5vw] px-[2.5vw] py-[3vh]">
          <FeaturedPanel
            screening={featured}
            now={now}
            sound={sound}
            hall={hall}
            date={dayDate}
            isTomorrow={day.isTomorrow}
          />
          <PosterWall list={day.list} now={now} posterHeight="38vh" />
        </main>
      ) : (
        <main className="relative flex h-full flex-col justify-evenly px-[2.5vw] py-[2vh]">
          {program.halls.map((h) => (
            <section key={h.slug} className="grid grid-cols-[auto_1fr] items-center gap-[2vw]">
              <HallLabel name={h.name} colorHex={h.colorHex} />
              <PosterWall list={day.list.filter((s) => s.hall.slug === h.slug)} now={now} posterHeight="41vh" />
            </section>
          ))}
          {day.isTomorrow ? <DayNote date={dayDate} /> : null}
        </main>
      )}
    </div>
  );
}

/** Numele sălii, pe verticală, în culoarea ei, la capătul rândului de afișe. */
function HallLabel({ name, colorHex }: { name: string; colorHex: string }) {
  return (
    <div className="flex h-[42vh] items-center gap-[0.8vw]">
      <span className="h-full w-[0.45vw] rounded-full" style={{ backgroundColor: colorHex }} />
      <span
        className="ticket rotate-180 whitespace-nowrap text-[2.8vw] leading-none tracking-[0.2em] [writing-mode:vertical-rl]"
        style={{ color: colorHex }}
      >
        {name.toUpperCase()}
      </span>
    </div>
  );
}

/** Mențiune discretă când, după ultimul film, se afișează deja ziua următoare. */
function DayNote({ date }: { date: Date }) {
  const weekday = formatWeekday(date);
  return (
    <p className="ticket absolute right-[2.5vw] top-[1.6vh] text-[1.4vw] tracking-[0.22em] text-white/60">
      MÂINE · {weekday.toUpperCase()}, {formatDayMonth(date).toUpperCase()}
    </p>
  );
}

function PosterWall({ list, now, posterHeight }: { list: DisplayScreening[]; now: Date; posterHeight: string }) {
  if (list.length === 0) {
    return <p className="display self-center text-center text-[2vw] text-white/50">Nicio proiecție programată.</p>;
  }
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-[2.2vw] gap-y-[6vh]">
      {list.map((s) => (
        <PosterCard key={s.id} screening={s} status={statusOf(s, now)} height={posterHeight} />
      ))}
    </ul>
  );
}

/**
 * Afișul unui film, ca pe prima pagină: ora galbenă, înclinată, peste colțul
 * de sus; titlul pe un gradient jos. Când rulează, cardul se luminează și
 * primește banda galbenă „RULEAZĂ ACUM”; când s-a terminat, se stinge.
 */
function PosterCard({ screening: s, status, height }: { screening: DisplayScreening; status: Status; height: string }) {
  return (
    <li
      className={cn(
        "relative shrink-0 transition-[opacity,filter,scale] duration-700",
        status === "running" && "tv-card-running z-10 scale-[1.07]",
        status === "ended" && "opacity-45 saturate-[0.35]",
      )}
      style={{ height, aspectRatio: "2 / 3" }}
    >
      <span className="poster-type pointer-events-none absolute -top-[2.2vh] left-[0.4vw] z-20 -rotate-6 text-[2.6vw] leading-none">
        {formatTime(startOf(s))}
      </span>
      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-[1vw] bg-[#101014] shadow-[0_2vh_5vh_-1vh_rgba(0,0,0,0.8)]",
          status === "running" ? "ring-[0.3vw] ring-brand-yellow" : "ring-1 ring-white/10",
        )}
      >
        {s.movie.posterUrl ? (
          <Image src={s.movie.posterUrl} alt="" fill sizes="20vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#2a1d08] to-[#0b0b0e] p-[1vw] text-center">
            <span className="display text-[1.6vw] text-white/85">{s.movie.title}</span>
          </div>
        )}
        {s.movie.ageRating ? (
          <span className="absolute right-[0.6vw] top-[0.6vw] rounded-[0.4vw] bg-black/70 px-[0.5vw] py-[0.2vh] text-[0.95vw] font-semibold tracking-wide text-white">
            {s.movie.ageRating}
          </span>
        ) : null}
        {s.is3D ? (
          <span className="poster-type tilt-strong absolute bottom-[26%] right-[0.6vw] text-[1.8vw] leading-none">3D</span>
        ) : null}
        {/* titlul pe gradient, ca pe cardurile de pe prima pagină */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#101014] via-[#101014]/85 to-transparent px-[0.9vw] pt-[6vh]",
            // când rulează, textul urcă deasupra benzii galbene
            status === "running" ? "pb-[5.6vh]" : "pb-[1.2vh]",
          )}
        >
          <p className="display line-clamp-2 text-[1.45vw] leading-tight text-white">{s.movie.title}</p>
          <p className="mt-[0.4vh] truncate text-[0.95vw] text-white/60">
            {[s.is3D ? "3D" : null, s.isDubbed ? "Dublat" : "Subtitrat", s.movie.genres?.split(",")[0]?.trim()]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {status === "running" ? (
          <div className="ticket absolute inset-x-0 bottom-0 flex items-center justify-center gap-[0.6vw] bg-brand-yellow py-[0.9vh] text-[1.35vw] tracking-[0.22em] text-brand-ink">
            <span className="tv-live size-[0.7vw] rounded-full bg-brand-ink" />
            RULEAZĂ ACUM
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** Trailerul filmului care urmează, pe televizorul de la intrarea sălii. */
function FeaturedPanel({
  screening,
  now,
  sound,
  hall,
  date,
  isTomorrow,
}: {
  screening?: DisplayScreening;
  now: Date;
  sound: boolean;
  hall: { name: string; colorHex: string };
  date: Date;
  isTomorrow: boolean;
}) {
  const weekday = formatWeekday(date);
  const videoId = screening ? youtubeId(screening.movie.trailerUrl) : null;
  const still = screening?.movie.backdropUrl ?? screening?.movie.posterUrl ?? null;
  const mins = screening ? minutesUntil(startOf(screening), now) : 0;

  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-[2vh] flex items-baseline gap-[1.2vw]">
        <h1 className="ticket text-[3.4vw] leading-none tracking-[0.2em]" style={{ color: hall.colorHex }}>
          {hall.name.toUpperCase()}
        </h1>
        <p className="ticket text-[1.3vw] tracking-[0.2em] text-white/60">
          {isTomorrow ? "MÂINE · " : ""}
          {weekday.toUpperCase()}, {formatDayMonth(date).toUpperCase()}
        </p>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-[1vw] bg-black shadow-[0_3vh_8vh_-2vh_rgba(0,0,0,0.9)] ring-1 ring-white/10"
        style={{ aspectRatio: "16 / 9" }}
      >
        {videoId ? (
          <iframe
            key={`${videoId}-${sound}`}
            // cu 24% mai mare decât rama: bara de titlu și butoanele YouTube cad în afară
            className="pointer-events-none absolute left-[-12%] top-[-12%] h-[124%] w-[124%]"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${sound ? 0 : 1}&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&cc_load_policy=0&disablekb=1`}
            title={screening ? `Trailer ${screening.movie.title}` : ""}
            allow="autoplay; encrypted-media"
          />
        ) : still ? (
          <Image src={still} alt="" fill sizes="60vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="ticket text-[2.6vw] tracking-[0.2em] text-brand-yellow">MULȚUMIM CĂ AȚI VENIT</p>
          </div>
        )}
      </div>

      {screening ? (
        <div className="mt-[2.5vh] flex items-end justify-between gap-[2vw]">
          <div className="min-w-0">
            <h2 className="display line-clamp-2 text-[3vw] leading-tight">{screening.movie.title}</h2>
            <p className="mt-[0.6vh] text-[1.25vw] text-white/65">
              {[
                screening.is3D ? "3D" : "2D",
                screening.isDubbed ? "Dublat" : "Subtitrat",
                screening.movie.ageRating,
                screening.movie.genres,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="poster-type text-[4.6vw] leading-none">{formatTime(startOf(screening))}</p>
            <p
              className={cn(
                "ticket mt-[0.6vh] text-[1.25vw] tracking-[0.18em]",
                mins <= 0 ? "text-brand-yellow" : "text-white/70",
              )}
            >
              {mins <= 0
                ? `RULEAZĂ · A ÎNCEPUT ACUM ${-mins} MIN`
                : mins <= 90
                  ? `ÎNCEPE ÎN ${mins} MIN`
                  : isToday(startOf(screening), now)
                    ? "ASTĂZI"
                    : "MÂINE"}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
