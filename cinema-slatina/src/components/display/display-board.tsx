"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TvTrailer } from "@/components/display/tv-trailer";
import { addDays, formatDayMonth, formatTime, formatWeekday, isToday } from "@/lib/dates";
import { youtubeId } from "@/lib/format";
import type { DisplayProgram, DisplayScreening } from "@/server/queries";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Afișajul de pe televizoarele din cinematograf, în spiritul afișului din
   Canva: fundal negru cu punctele aurii de tipar, ora galbenă înclinată, un
   ceas mare.
   Două moduri:
   - fără sală: televizorul de la casierie, toate filmele zilei, pe carduri
     late cu imaginea panoramică a filmului; filmul care rulează are conturul
     galben și un cronometru cu cât mai e din el;
   - cu sală: televizorul de la intrarea sălii — indicatorul sălii cu săgeată
     (în culoarea sălii), trailerul filmului care rulează acum și programul
     sălii. Are trei aranjamente (`model`).
   Totul se calculează în browser din ora curentă; programul se reia din bază
   la fiecare minut, iar pagina se reîncarcă de tot o dată la 12 ore.
   Atenție: browserul cutiilor de pe televizoare e vechi; straturile și
   transformările sunt scrise în CSS simplu (clasele `tv-*` din globals.css).
--------------------------------------------------------------------------- */

const DEFAULT_RUNTIME_MIN = 110;
const REFRESH_MS = 60_000;
const CLOCK_MS = 5_000;
const RELOAD_MS = 12 * 60 * 60_000;

type Status = "upcoming" | "running" | "ended";
/** Aranjamentul televizorului de sală: 1 bandă sus, 2 coloană, 3 trailer pe tot ecranul. */
export type HallModel = 1 | 2 | 3;
/** Încotro arată săgeata indicatorului. */
export type Direction = "left" | "right";
type Hall = { slug: string; name: string; colorHex: string };

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
const two = (n: number) => String(n).padStart(2, "0");
/** „1:23:45” sau „23:45” */
function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}
const dateLabel = (date: Date) => `${formatWeekday(date).toUpperCase()}, ${formatDayMonth(date).toUpperCase()}`;
const metaOf = (s: DisplayScreening) =>
  [s.is3D ? "3D" : "2D", s.isDubbed ? "Dublat" : "Subtitrat", s.movie.genres?.split(",")[0]?.trim(), `${runtimeOf(s)} min`]
    .filter(Boolean)
    .join(" · ");

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
  model = 3,
  direction = "left",
  quality = 480,
  debug = false,
}: {
  program: DisplayProgram;
  hallSlug?: string;
  sound?: boolean;
  model?: HallModel;
  direction?: Direction;
  /** Rezoluția trailerului cerută de la YouTube, în linii. */
  quality?: number;
  /** Scrie pe ecran ce face playerul (diagnostic pe cutie). */
  debug?: boolean;
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

  if (hall) {
    // trailerul e al filmului care rulează acum în sală; între filme, al celui care urmează
    const featured =
      scoped.find((s) => statusOf(s, now) === "running") ?? scoped.find((s) => statusOf(s, now) === "upcoming");
    const view: HallView = { hall, direction, featured, list: day.list, now, date: dayDate, isTomorrow: day.isTomorrow, sound, quality, debug };
    if (model === 2) return <HallColumn {...view} />;
    if (model === 3) return <HallFullscreen {...view} />;
    return <HallBand {...view} />;
  }

  return (
    <div className="tv-canva flex h-full w-full flex-col px-[1.4vw] py-[1.6vh]">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center">
        <p className="ticket tv-muted text-[1.7vw] leading-none tracking-[0.2em]">
          {day.isTomorrow ? "PROGRAM MÂINE · " : ""}
          {dateLabel(dayDate)}
        </p>
        <p className="poster-type text-[5.6vw] leading-none" aria-label="Ora curentă">
          {formatTime(now)}
        </p>
        <span />
      </header>
      <main className="min-h-0 flex-1 pt-[3vh]">
        <CardGrid list={day.list} now={now} />
      </main>
    </div>
  );
}

/* ------------------------------ casierie ------------------------------ */

function CardGrid({ list, now }: { list: DisplayScreening[]; now: Date }) {
  if (list.length === 0) {
    return (
      <p className="display tv-muted flex h-full items-center justify-center text-[2.4vw]">
        Nicio proiecție programată.
      </p>
    );
  }
  return (
    <ul className="grid h-full auto-rows-fr grid-cols-4 gap-x-[1.4vw] gap-y-[4.5vh]">
      {list.map((s) => (
        <FilmCard key={s.id} screening={s} now={now} />
      ))}
    </ul>
  );
}

/**
 * Cardul lat al unui film: imaginea panoramică sus, cu ora galbenă înclinată
 * peste colț și sala în colțul opus, topită într-un gradient spre corpul
 * cardului; dedesubt titlul și starea. Filmul care rulează are tot conturul
 * galben, cu un halo care pulsează, și cronometrul cu cât mai e din film.
 */
function FilmCard({ screening: s, now }: { screening: DisplayScreening; now: Date }) {
  const status = statusOf(s, now);
  const running = status === "running";
  const firstGenre = s.movie.genres?.split(",")[0]?.trim();
  const image = s.movie.backdropUrl ?? s.movie.posterUrl;

  return (
    <li className={cn("relative min-h-0", running && "z-10")}>
      <span className="poster-type tv-tilt pointer-events-none absolute -top-[2.4vh] left-[0.4vw] z-20 text-[2.6vw] leading-none">
        {formatTime(startOf(s))}
      </span>
      <div className="relative h-full rounded-[1vw]">
        {running ? <span className="tv-running" aria-hidden="true" /> : null}
        <div className="relative flex h-full flex-col overflow-hidden rounded-[1vw] bg-[#101014] shadow-[0_2vh_4vh_-1.5vh_rgba(0,0,0,0.7)]">
          {/* Imaginea umple cardul până jos; peste ea, un gradient o topește
              în negrul cu detaliile. E cerută mare și puțin comprimată:
              cutiile raportează ecranul mai mic decât e. */}
          {image ? (
            <Image src={image} alt="" fill sizes="60vw" quality={90} className="object-cover object-top" />
          ) : (
            <div className="tv-layer flex items-center justify-center bg-[#1a1308] p-[1vw] text-center">
              <span className="display text-[1.5vw] text-white">{s.movie.title}</span>
            </div>
          )}
          <span className="tv-fade" aria-hidden="true" />
          <div className="tv-image-space">
            <span
              className="ticket absolute right-[0.6vw] top-[0.6vw] rounded-full px-[0.7vw] py-[0.35vh] text-[0.9vw] leading-none tracking-[0.1em] text-white shadow-[0_0.3vh_1vh_rgba(0,0,0,0.5)]"
              style={{ backgroundColor: s.hall.colorHex }}
            >
              {s.hall.name.toUpperCase()}
            </span>
            {s.is3D ? (
              <span className="poster-type tilt-strong absolute bottom-[0.6vh] right-[0.5vw] text-[2vw] leading-none">3D</span>
            ) : null}
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-between gap-[0.8vw] px-[0.9vw] pb-[1.2vh]">
            <div className="min-w-0">
              <p className="display line-clamp-2 text-[1.3vw] leading-tight text-white [overflow-wrap:anywhere]">
                {s.movie.title}
              </p>
              <p className="tv-muted mt-[0.5vh] text-[0.85vw] leading-snug">
                {[s.isDubbed ? "Dublat" : "Subtitrat", firstGenre, `${runtimeOf(s)} min`].filter(Boolean).join(" · ")}
              </p>
            </div>

            {running ? (
              <div className="ticket shrink-0 text-right leading-none">
                <span className="flex items-center justify-end gap-[0.4vw] text-[0.85vw] tracking-[0.18em] text-brand-yellow">
                  <span className="tv-live size-[0.5vw] rounded-full bg-brand-yellow" />
                  RULEAZĂ
                </span>
                <Countdown until={endOf(s)} now={now} className="tv-countdown mt-[0.6vh] text-[2.2vw] tabular-nums tracking-[0.06em] text-white" />
              </div>
            ) : status === "upcoming" ? (
              <div className="ticket shrink-0 text-right leading-none">
                <span className="tv-dim block text-[0.85vw] tracking-[0.18em]">ÎNCEPE ÎN</span>
                <span className="mt-[0.6vh] block text-[1.8vw] tracking-[0.06em] text-brand-yellow">
                  {isToday(startOf(s), now) ? fmtMinutes(Math.max(1, minutesUntil(startOf(s), now))) : "MÂINE"}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/** Cronometru pe secunde până la momentul dat; are ceasul lui, ca restul
    paginii să nu se redeseneze la fiecare secundă. */
function Countdown({ until, now, className }: { until: Date; now: Date; className?: string }) {
  // pornește de la ora serverului, ca HTML-ul să fie identic la hidratare
  const [left, setLeft] = useState(() => until.getTime() - now.getTime());
  useEffect(() => {
    const tick = () => setLeft(until.getTime() - Date.now());
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [until]);
  return <span className={className}>{fmtCountdown(left)}</span>;
}

/* -------------------------- televizorul sălii -------------------------- */

type HallView = {
  hall: Hall;
  direction: Direction;
  featured?: DisplayScreening;
  list: DisplayScreening[];
  now: Date;
  date: Date;
  isTomorrow: boolean;
  sound: boolean;
  quality: number;
  debug: boolean;
};

/** Rândul se așază dinspre partea în care arată săgeata. */
const rowOf = (direction: Direction): CSSProperties => ({
  flexDirection: direction === "left" ? "row" : "row-reverse",
});

/** Săgeata indicatorului: trei unghiuri care se aprind pe rând, în direcția de mers. */
function Arrow({ direction, height }: { direction: Direction; height: number }) {
  return (
    <svg
      viewBox="0 0 150 80"
      className={cn("shrink-0", direction === "right" && "tv-flip")}
      style={{ height: `${height}vh`, width: `${(height * 150) / 80}vh` }}
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline className="tv-chev" points="44,10 14,40 44,70" />
      <polyline className="tv-chev" points="90,10 60,40 90,70" />
      <polyline className="tv-chev" points="136,10 106,40 136,70" />
    </svg>
  );
}

/** Trailerul filmului din prim-plan, fără nimic scris de YouTube peste el. */
function Trailer({
  screening,
  sound,
  quality,
  debug,
}: {
  screening?: DisplayScreening;
  sound: boolean;
  quality: number;
  debug: boolean;
}) {
  if (!screening) {
    return (
      <div className="tv-layer flex items-center justify-center bg-black">
        <p className="ticket text-[2.6vw] tracking-[0.2em] text-brand-yellow">MULȚUMIM CĂ AȚI VENIT</p>
      </div>
    );
  }
  return (
    <TvTrailer
      videoId={youtubeId(screening.movie.trailerUrl)}
      stillUrl={screening.movie.backdropUrl ?? screening.movie.posterUrl}
      sound={sound}
      quality={quality}
      debug={debug}
    />
  );
}

/** Eticheta de stare a filmului din prim-plan: „rulează acum” sau „urmează”. */
function NowLabel({ running, className }: { running: boolean; className?: string }) {
  return (
    <span className={cn("ticket flex items-center gap-[0.5vw] leading-none tracking-[0.2em] text-brand-yellow", className)}>
      {running ? <span className="tv-live size-[0.7vw] rounded-full bg-brand-yellow" /> : null}
      {running ? "RULEAZĂ ACUM" : "URMEAZĂ"}
    </span>
  );
}

/** Dreapta filmului din prim-plan: cât mai e din el, sau ora la care începe. */
function NowTime({ screening: s, now, big }: { screening: DisplayScreening; now: Date; big: string }) {
  if (statusOf(s, now) === "running") {
    return <Countdown until={endOf(s)} now={now} className={cn("tv-countdown ticket tabular-nums leading-none tracking-[0.06em] text-white", big)} />;
  }
  return (
    <span className="block text-right leading-none">
      <span className={cn("poster-type block leading-none", big)}>{formatTime(startOf(s))}</span>
      <span className="ticket tv-muted mt-[0.8vh] block text-[1.2vw] tracking-[0.18em]">
        {isToday(startOf(s), now) ? `ÎNCEPE ÎN ${fmtMinutes(Math.max(1, minutesUntil(startOf(s), now)))}` : "MÂINE"}
      </span>
    </span>
  );
}

/** Programul sălii, pe rânduri: ora, titlul și, pentru ce urmează, în cât timp. */
function ScheduleRows({ list, now, date, isTomorrow }: Pick<HallView, "list" | "now" | "date" | "isTomorrow">) {
  return (
    <section className="flex min-h-0 flex-col">
      <p className="ticket tv-muted text-[1.2vw] leading-none tracking-[0.22em]">
        {isTomorrow ? "PROGRAM MÂINE · " : "PROGRAM · "}
        {dateLabel(date)}
      </p>
      {list.length === 0 ? (
        <p className="display tv-muted mt-[3vh] text-[1.8vw]">Nicio proiecție programată.</p>
      ) : (
        <ul className="mt-[1.5vh] flex min-h-0 flex-1 flex-col justify-around">
          {list.map((s) => {
            const status = statusOf(s, now);
            return (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-[1.2vw] rounded-[0.8vw] px-[1vw] py-[1.4vh]",
                  status === "running" && "tv-row-now",
                )}
              >
                <span className="poster-type shrink-0 text-[3vw] leading-none">{formatTime(startOf(s))}</span>
                <span className="min-w-0 flex-1">
                  <span className="display line-clamp-2 block text-[1.6vw] leading-tight text-white">{s.movie.title}</span>
                  <span className="tv-muted mt-[0.4vh] block text-[0.95vw]">{metaOf(s)}</span>
                </span>
                {status === "running" ? (
                  <span className="ticket flex shrink-0 items-center gap-[0.4vw] text-[1.1vw] tracking-[0.18em] text-brand-yellow">
                    <span className="tv-live size-[0.55vw] rounded-full bg-brand-yellow" />
                    RULEAZĂ
                  </span>
                ) : status === "upcoming" ? (
                  <span className="ticket shrink-0 text-right leading-none">
                    <span className="tv-dim block text-[0.8vw] tracking-[0.18em]">ÎNCEPE ÎN</span>
                    <span className="mt-[0.5vh] block text-[1.5vw] tracking-[0.06em] text-brand-yellow">
                      {isToday(startOf(s), now) ? fmtMinutes(Math.max(1, minutesUntil(startOf(s), now))) : "MÂINE"}
                    </span>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Titlul și starea filmului din prim-plan, sub trailer. */
function NowInfo({ screening, now }: { screening?: DisplayScreening; now: Date }) {
  if (!screening) return null;
  return (
    <div className="mt-[2.2vh] flex items-end justify-between gap-[2vw]">
      <div className="min-w-0">
        <NowLabel running={statusOf(screening, now) === "running"} className="text-[1.3vw]" />
        <h2 className="display mt-[0.8vh] line-clamp-1 text-[3vw] leading-tight text-white">{screening.movie.title}</h2>
        <p className="tv-muted mt-[0.4vh] text-[1.15vw]">{metaOf(screening)}</p>
      </div>
      <div className="shrink-0">
        <NowTime screening={screening} now={now} big="text-[4.6vw]" />
      </div>
    </div>
  );
}

/**
 * Modelul 1 — „bandă sus”: un panou lat, în culoarea sălii, cu săgeata și
 * numele sălii uriașe (ca un indicator de aeroport); dedesubt trailerul și
 * programul sălii.
 */
function HallBand({ hall, direction, featured, list, now, date, isTomorrow, sound, quality, debug }: HallView) {
  return (
    <div className="tv-canva flex h-full w-full flex-col">
      <header
        className="flex shrink-0 items-center justify-between px-[2.2vw] text-white"
        style={{ ...rowOf(direction), height: "17vh", backgroundColor: hall.colorHex }}
      >
        <div className="flex items-center gap-[2vw]" style={rowOf(direction)}>
          <Arrow direction={direction} height={10} />
          <h1 className="ticket text-[7.4vw] leading-none tracking-[0.12em]">{hall.name.toUpperCase()}</h1>
        </div>
        <p className="poster-type text-[5vw] leading-none" aria-label="Ora curentă">
          {formatTime(now)}
        </p>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[60fr_40fr] gap-[2vw] px-[2vw] py-[2.5vh]">
        <section className="flex min-h-0 flex-col">
          <div className="tv-video-space overflow-hidden rounded-[1vw] bg-black shadow-[0_3vh_6vh_-2vh_rgba(0,0,0,0.8)]">
            <Trailer screening={featured} sound={sound} quality={quality} debug={debug} />
          </div>
          <NowInfo screening={featured} now={now} />
        </section>
        <ScheduleRows list={list} now={now} date={date} isTomorrow={isTomorrow} />
      </main>
    </div>
  );
}

/**
 * Modelul 2 — „coloană”: o coloană în culoarea sălii pe partea în care e
 * sala, cu săgeata sus, numele pe verticală și ceasul jos; restul ecranului
 * e al trailerului și al programului.
 */
function HallColumn({ hall, direction, featured, list, now, date, isTomorrow, sound, quality, debug }: HallView) {
  return (
    <div className="tv-canva flex h-full w-full" style={rowOf(direction)}>
      <aside
        className="flex shrink-0 flex-col items-center justify-between py-[4vh] text-white"
        style={{ width: "15vw", backgroundColor: hall.colorHex }}
      >
        <Arrow direction={direction} height={11} />
        {/* mărime în vh, pe un singur rând: și „SALA ALBASTRĂ” încape pe înălțime */}
        <h1
          className={cn(
            "ticket whitespace-nowrap text-[7.4vh] leading-none tracking-[0.14em]",
            direction === "left" ? "tv-vert-up" : "tv-vert",
          )}
        >
          {hall.name.toUpperCase()}
        </h1>
        <p className="poster-type text-[3.6vw] leading-none" aria-label="Ora curentă">
          {formatTime(now)}
        </p>
      </aside>

      <main className="grid min-h-0 flex-1 grid-cols-[62fr_38fr] gap-[1.8vw] px-[1.8vw] py-[3vh]">
        <section className="flex min-h-0 flex-col justify-center">
          <div className="tv-video-space overflow-hidden rounded-[1vw] bg-black shadow-[0_3vh_6vh_-2vh_rgba(0,0,0,0.8)]">
            <Trailer screening={featured} sound={sound} quality={quality} debug={debug} />
          </div>
          <NowInfo screening={featured} now={now} />
        </section>
        <ScheduleRows list={list} now={now} date={date} isTomorrow={isTomorrow} />
      </main>
    </div>
  );
}

/**
 * Modelul 3 — „trailer pe tot ecranul”: clipul umple televizorul; jos, peste
 * un degradeu, indicatorul sălii, filmul care rulează și ce urmează.
 */
function HallFullscreen({ hall, direction, featured, list, now, sound, quality, debug }: HallView) {
  const upcoming = list.filter((s) => statusOf(s, now) === "upcoming" && s.id !== featured?.id).slice(0, 3);
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Trailer screening={featured} sound={sound} quality={quality} debug={debug} />
      <span className="tv-top-shade" aria-hidden="true" />
      <span className="tv-bottom-shade" aria-hidden="true" />

      <p
        className="poster-type absolute top-[3vh] text-[4.4vw] leading-none"
        style={direction === "left" ? { right: "2.5vw" } : { left: "2.5vw" }}
        aria-label="Ora curentă"
      >
        {formatTime(now)}
      </p>

      <div className="absolute bottom-0 left-0 w-full px-[2.5vw] pb-[4vh]">
        <div className="flex items-end justify-between gap-[2.5vw]" style={rowOf(direction)}>
          <div
            className="flex shrink-0 items-center gap-[1.6vw] rounded-[1.4vw] px-[2vw] py-[2vh] text-white shadow-[0_2vh_5vh_-1vh_rgba(0,0,0,0.8)]"
            style={{ ...rowOf(direction), backgroundColor: hall.colorHex }}
          >
            <Arrow direction={direction} height={9} />
            <h1 className="ticket text-[6vw] leading-none tracking-[0.12em]">{hall.name.toUpperCase()}</h1>
          </div>

          {featured ? (
            <div className={cn("min-w-0 flex-1", direction === "left" ? "text-right" : "text-left")}>
              <NowLabel
                running={statusOf(featured, now) === "running"}
                className={cn("text-[1.4vw]", direction === "left" && "justify-end")}
              />
              <h2 className="display mt-[0.8vh] line-clamp-1 text-[3.6vw] leading-tight text-white">{featured.movie.title}</h2>
              <div className={cn("mt-[0.8vh] flex items-end gap-[1.6vw]", direction === "left" && "justify-end")}>
                <p className="tv-muted text-[1.2vw]">{metaOf(featured)}</p>
                <NowTime screening={featured} now={now} big="text-[3.6vw]" />
              </div>
            </div>
          ) : null}
        </div>

        {upcoming.length ? (
          // filmele rămân în ordinea orelor; doar rândul se aliniază pe partea săgeții
          <ul className={cn("mt-[2.5vh] flex items-center gap-[1.2vw]", direction === "right" && "justify-end")}>
            <li className="ticket tv-muted text-[1.1vw] tracking-[0.22em]">URMEAZĂ</li>
            {upcoming.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-[0.8vw] rounded-full bg-[#101014] px-[1.2vw] py-[0.9vh] shadow-[0_1vh_3vh_-1vh_rgba(0,0,0,0.8)]"
              >
                <span className="poster-type text-[1.8vw] leading-none">{formatTime(startOf(s))}</span>
                <span className="display text-[1.2vw] leading-none text-white">{s.movie.title}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
