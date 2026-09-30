"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { addDays, formatDayMonth, formatTime, formatWeekday, isToday } from "@/lib/dates";
import { youtubeId } from "@/lib/format";
import type { DisplayProgram, DisplayScreening } from "@/server/queries";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Afișajul de pe televizoarele din cinematograf, în forma afișului din Canva:
   fundal portocaliu, afișele filmelor în ordinea orelor, ora galbenă înclinată
   peste colțul fiecăruia, un ceas mare sus. Fiecare card are, lângă afiș,
   sala, titlul și starea: „rulează” cu minutele rămase, sau în cât timp
   începe. Filmele terminate rămân la fel, doar fără stare.
   Două moduri:
   - fără sală: televizorul de la casierie, toate filmele zilei, pe lat;
   - cu sală: televizorul de la intrarea sălii, cu trailerul filmului care
     urmează și cardurile sălii.
   Totul se calculează în browser din ora curentă; programul se reia din bază
   la fiecare minut, iar pagina se reîncarcă de tot o dată la 12 ore.
--------------------------------------------------------------------------- */

const DEFAULT_RUNTIME_MIN = 110;
/** Cât timp după început mai ține televizorul sălii trailerul filmului. */
const TRAILER_GRACE_MIN = 10;
const REFRESH_MS = 60_000;
const CLOCK_MS = 5_000;
const RELOAD_MS = 12 * 60 * 60_000;

type Status = "upcoming" | "running" | "ended";

const startOf = (s: DisplayScreening) => new Date(s.startsAt);
const runtimeOf = (s: DisplayScreening) => s.movie.runtimeMin ?? DEFAULT_RUNTIME_MIN;
const endOf = (s: DisplayScreening) => new Date(startOf(s).getTime() + runtimeOf(s) * 60_000);
function statusOf(s: DisplayScreening, now: Date): Status {
  if (now >= endOf(s)) return "ended";
  if (now >= startOf(s)) return "running";
  return "upcoming";
}
const minutesUntil = (date: Date, now: Date) => Math.round((date.getTime() - now.getTime()) / 60_000);
/** „25 MIN” sau „1 H 20” */
const fmtMinutes = (m: number) => (m < 60 ? `${m} MIN` : `${Math.floor(m / 60)} H${m % 60 ? ` ${m % 60}` : ""}`);

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
    // ora reală a cutiei, imediat după hidratare, apoi din 5 în 5 secunde
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

  return (
    <div className="tv-canva flex h-full w-full flex-col px-[1.3vw] py-[1.8vh]">
      <TopBar now={now} date={dayDate} isTomorrow={day.isTomorrow} hall={hall} />

      {hall ? (
        <main className="grid min-h-0 flex-1 grid-cols-[52fr_48fr] gap-[2vw] pt-[2vh]">
          <FeaturedPanel screening={featured} now={now} sound={sound} />
          <CardGrid list={day.list} now={now} columns={2} />
        </main>
      ) : (
        <main className="min-h-0 flex-1 pt-[2.5vh]">
          <CardGrid list={day.list} now={now} columns={4} />
        </main>
      )}
    </div>
  );
}

/** Ceasul mare, la mijloc; în stânga ziua, în dreapta sala (pe televizorul sălii). */
function TopBar({
  now,
  date,
  isTomorrow,
  hall,
}: {
  now: Date;
  date: Date;
  isTomorrow: boolean;
  hall?: { name: string; colorHex: string };
}) {
  const weekday = formatWeekday(date);
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center">
      <p className="ticket text-[1.9vw] leading-none tracking-[0.2em] text-brand-ink/85">
        {isTomorrow ? "PROGRAM MÂINE · " : ""}
        {weekday.toUpperCase()}, {formatDayMonth(date).toUpperCase()}
      </p>
      <p className="poster-type text-[6.5vw] leading-none" aria-label="Ora curentă">
        {formatTime(now)}
      </p>
      <p className="ticket flex items-center justify-end gap-[0.7vw] text-[1.9vw] leading-none tracking-[0.2em] text-brand-ink/85">
        {hall ? (
          <>
            <span className="size-[1vw] rounded-full ring-[0.15vw] ring-brand-ink/40" style={{ backgroundColor: hall.colorHex }} />
            {hall.name.toUpperCase()}
          </>
        ) : null}
      </p>
    </header>
  );
}

function CardGrid({ list, now, columns }: { list: DisplayScreening[]; now: Date; columns: 2 | 4 }) {
  if (list.length === 0) {
    return (
      <p className="display flex h-full items-center justify-center text-[2.4vw] text-brand-ink/80">
        Nicio proiecție programată.
      </p>
    );
  }
  return (
    <ul
      className={cn("grid h-full auto-rows-fr gap-x-[1.1vw] gap-y-[4.2vh]", columns === 4 ? "grid-cols-4" : "grid-cols-2")}
    >
      {list.map((s) => (
        <FilmCard key={s.id} screening={s} now={now} />
      ))}
    </ul>
  );
}

/**
 * Cardul unui film: afișul întreg în stânga, cu ora galbenă înclinată peste
 * colț (ca pe afișul din Canva); în dreapta sala, titlul și starea. Filmul
 * care rulează are ramă galbenă și banda „RULEAZĂ” cu minutele rămase.
 */
function FilmCard({ screening: s, now }: { screening: DisplayScreening; now: Date }) {
  const status = statusOf(s, now);
  const running = status === "running";
  const toStart = minutesUntil(startOf(s), now);
  const left = minutesUntil(endOf(s), now);
  const firstGenre = s.movie.genres?.split(",")[0]?.trim();

  return (
    <li className={cn("relative min-h-0 transition-[scale] duration-700", running && "z-10 scale-[1.04]")}>
      <span className="poster-type pointer-events-none absolute -top-[2.4vh] left-[0.3vw] z-20 -rotate-6 text-[2.7vw] leading-none">
        {formatTime(startOf(s))}
      </span>
      <div
        className={cn(
          "flex h-full overflow-hidden rounded-[1vw] bg-[#101014] shadow-[0_2vh_4vh_-1.5vh_rgba(0,0,0,0.7)]",
          running ? "ring-[0.35vw] ring-brand-yellow" : "ring-[0.15vw] ring-black/25",
        )}
      >
        <div className="relative h-full shrink-0" style={{ aspectRatio: "2 / 3" }}>
          {s.movie.posterUrl ? (
            <Image src={s.movie.posterUrl} alt="" fill sizes="18vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#2a1d08] to-[#0b0b0e] p-[1vw] text-center">
              <span className="display text-[1.5vw] text-white/85">{s.movie.title}</span>
            </div>
          )}
          {s.is3D ? (
            <span className="poster-type tilt-strong absolute bottom-[0.6vh] right-[0.5vw] text-[2vw] leading-none">3D</span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-[0.8vh] p-[0.6vw] pt-[1.3vh]">
          <span
            className="ticket w-fit whitespace-nowrap rounded-full px-[0.6vw] py-[0.3vh] text-[0.82vw] leading-none tracking-[0.1em] text-white"
            style={{ backgroundColor: s.hall.colorHex }}
          >
            {s.hall.name.toUpperCase()}
          </span>
          <p className="display line-clamp-3 text-[1.08vw] leading-tight text-white [overflow-wrap:anywhere]">{s.movie.title}</p>
          <p className="text-[0.82vw] leading-snug text-white/60">
            {[s.movie.ageRating, s.isDubbed ? "Dublat" : "Subtitrat", firstGenre].filter(Boolean).join(" · ")}
            <br />
            {runtimeOf(s)} min
          </p>

          <div className="mt-auto">
            {running ? (
              <div className="ticket rounded-[0.6vw] bg-brand-yellow px-[0.6vw] py-[0.8vh] leading-none text-brand-ink">
                <span className="flex items-center gap-[0.45vw] text-[1.2vw] tracking-[0.14em]">
                  <span className="tv-live size-[0.55vw] shrink-0 rounded-full bg-brand-ink" />
                  RULEAZĂ
                </span>
                <span className="mt-[0.8vh] block text-[0.8vw] tracking-[0.12em] text-brand-ink/75">MAI SUNT</span>
                <span className="mt-[0.4vh] block text-[1.35vw] tracking-[0.08em]">{fmtMinutes(Math.max(1, left))}</span>
              </div>
            ) : status === "upcoming" ? (
              <div className="ticket rounded-[0.6vw] bg-white/10 px-[0.6vw] py-[0.8vh] leading-none text-white ring-1 ring-white/15">
                <span className="block text-[0.8vw] tracking-[0.14em] text-white/60">ÎNCEPE ÎN</span>
                <span className="mt-[0.5vh] block text-[1.35vw] tracking-[0.08em] text-brand-yellow">
                  {isToday(startOf(s), now) ? fmtMinutes(Math.max(1, toStart)) : "MÂINE"}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/** Trailerul filmului care urmează, pe televizorul de la intrarea sălii. */
function FeaturedPanel({ screening, now, sound }: { screening?: DisplayScreening; now: Date; sound: boolean }) {
  const videoId = screening ? youtubeId(screening.movie.trailerUrl) : null;
  const still = screening?.movie.backdropUrl ?? screening?.movie.posterUrl ?? null;
  const mins = screening ? minutesUntil(startOf(screening), now) : 0;

  return (
    <section className="flex min-h-0 flex-col">
      <div
        className="relative w-full overflow-hidden rounded-[1vw] bg-black shadow-[0_3vh_6vh_-2vh_rgba(0,0,0,0.8)] ring-[0.15vw] ring-black/25"
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
          <Image src={still} alt="" fill sizes="55vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="ticket text-[2.6vw] tracking-[0.2em] text-brand-yellow">MULȚUMIM CĂ AȚI VENIT</p>
          </div>
        )}
      </div>

      {screening ? (
        <div className="mt-[2.5vh] flex items-end justify-between gap-[2vw] text-brand-ink">
          <div className="min-w-0">
            <h2 className="display line-clamp-2 text-[2.8vw] leading-tight">{screening.movie.title}</h2>
            <p className="mt-[0.6vh] text-[1.2vw] text-brand-ink/75">
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
            <p className="poster-type text-[4.4vw] leading-none">{formatTime(startOf(screening))}</p>
            <p className="ticket mt-[0.6vh] text-[1.2vw] tracking-[0.18em] text-brand-ink/85">
              {mins <= 0
                ? `RULEAZĂ · A ÎNCEPUT ACUM ${-mins} MIN`
                : isToday(startOf(screening), now)
                  ? `ÎNCEPE ÎN ${fmtMinutes(mins)}`
                  : "MÂINE"}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
