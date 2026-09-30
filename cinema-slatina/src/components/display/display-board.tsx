"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { addDays, formatDayMonth, formatTime, formatWeekday, isToday } from "@/lib/dates";
import { youtubeId } from "@/lib/format";
import { CINEMA } from "@/lib/constants";
import type { DisplayProgram, DisplayScreening } from "@/server/queries";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Afișajul de pe televizoarele din cinematograf. Două moduri:
   - fără sală: televizorul de la casierie, programul de azi pe două coloane;
   - cu sală: televizorul de la intrarea sălii, cu trailerul filmului care
     urmează și lista sălii.
   Starea fiecărei proiecții (urmează / rulează / s-a terminat) se calculează
   în browser din ora curentă, așa că se schimbă fără reîncărcare; programul
   se reia din bază la fiecare minut, iar pagina se reîncarcă de tot o dată la
   12 ore, ca să nu se împotmolească pe cutiile slabe.
--------------------------------------------------------------------------- */

/** Durata presupusă a unui film fără durată în bază. */
const DEFAULT_RUNTIME_MIN = 110;
/** Cât timp după început mai ține televizorul sălii trailerul filmului. */
const TRAILER_GRACE_MIN = 10;
const REFRESH_MS = 60_000;
const CLOCK_MS = 15_000;
const RELOAD_MS = 12 * 60 * 60_000;

type Status = "upcoming" | "running" | "ended";

function startOf(s: DisplayScreening) {
  return new Date(s.startsAt);
}
function endOf(s: DisplayScreening) {
  return new Date(startOf(s).getTime() + (s.movie.runtimeMin ?? DEFAULT_RUNTIME_MIN) * 60_000);
}
function statusOf(s: DisplayScreening, now: Date): Status {
  if (now >= endOf(s)) return "ended";
  if (now >= startOf(s)) return "running";
  return "upcoming";
}
const minutesUntil = (date: Date, now: Date) => Math.round((date.getTime() - now.getTime()) / 60_000);

/**
 * Ziua afișată: azi, cât mai e ceva de văzut; după ultimul film, mâine.
 * Dacă nici azi, nici mâine nu e nimic, rămâne lista de azi (eventual goală).
 */
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
  // pe televizorul sălii: filmul care urmează sau a început de sub 10 minute
  const featured = hall
    ? scoped.find((s) => minutesUntil(startOf(s), now) > -TRAILER_GRACE_MIN)
    : undefined;

  return (
    <div className="flex h-full w-full flex-col px-[2.4vw] py-[2vh]">
      <Header title={day.isTomorrow ? "PROGRAM MÂINE" : "PROGRAM AZI"} date={dayDate} hall={hall} />

      {hall ? (
        <main className="grid min-h-0 flex-1 grid-cols-[3fr_2fr] gap-[2.4vw] pt-[2vh]">
          <FeaturedPanel screening={featured} now={now} sound={sound} />
          <section className="flex min-h-0 min-w-0 flex-col">
            <HallHeading name={day.isTomorrow ? "Program mâine" : "Program azi"} colorHex={hall.colorHex} />
            <ScreeningList list={day.list} now={now} />
          </section>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-2 gap-[2.4vw] pt-[2vh]">
          {program.halls.map((h) => (
            <section key={h.slug} className="flex min-h-0 min-w-0 flex-col">
              <HallHeading name={h.name} colorHex={h.colorHex} />
              <ScreeningList list={day.list.filter((s) => s.hall.slug === h.slug)} now={now} />
            </section>
          ))}
        </main>
      )}

      <Footer />
    </div>
  );
}

function Header({
  title,
  date,
  hall,
}: {
  title: string;
  date: Date;
  hall?: { name: string; colorHex: string };
}) {
  const weekday = formatWeekday(date);
  const dateLabel = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${formatDayMonth(date)}`;
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center">
      <div className="flex items-center gap-[1.2vw]">
        <Image src="/brand/cinema-logo-dark.png" alt="" width={1550} height={1700} priority className="h-[9vh] w-auto" />
        <span className="ticket text-[1.5vw] leading-none tracking-[0.2em] text-brand-yellow">
          INTRARE
          <br />
          GRATUITĂ
        </span>
      </div>
      <div className="text-center">
        {hall ? (
          <>
            <h1 className="ticket text-[4.6vw] leading-none tracking-[0.22em]" style={{ color: hall.colorHex }}>
              {hall.name.toUpperCase()}
            </h1>
            <p className="ticket mt-[0.8vh] text-[1.5vw] tracking-[0.2em] text-white/70">
              {title} · {dateLabel.toUpperCase()}
            </p>
          </>
        ) : (
          <>
            <h1 className="ticket text-[4.6vw] leading-none tracking-[0.22em] text-brand-yellow">{title}</h1>
            <p className="mt-[0.6vh] text-[1.4vw] text-white/70">{dateLabel}</p>
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-[1vw]">
        <Image src="/brand/cred-in-slatina.png" alt="" width={462} height={503} className="h-[8vh] w-auto" />
        <Image src="/brand/primaria-slatina.png" alt="" width={404} height={600} className="h-[8vh] w-auto" />
      </div>
    </header>
  );
}

function HallHeading({ name, colorHex }: { name: string; colorHex: string }) {
  return (
    <h2
      className="ticket flex items-center gap-[0.7vw] border-b-[0.25vh] pb-[1vh] text-[2.4vw] leading-none tracking-[0.16em]"
      style={{ borderColor: `color-mix(in oklch, ${colorHex} 55%, transparent)`, color: colorHex }}
    >
      <span className="size-[1.1vw] rounded-full" style={{ backgroundColor: colorHex }} />
      {name.toUpperCase()}
    </h2>
  );
}

function ScreeningList({ list, now, large = false }: { list: DisplayScreening[]; now: Date; large?: boolean }) {
  if (list.length === 0) {
    return (
      <p className="display mt-[3vh] text-[1.8vw] text-white/55">Nicio proiecție programată.</p>
    );
  }
  const nextId = list.find((s) => statusOf(s, now) === "upcoming")?.id;
  return (
    <ul className="flex min-h-0 flex-1 flex-col justify-evenly">
      {list.map((s) => {
        const status = statusOf(s, now);
        return (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-[1.2vw] py-[0.6vh] transition-opacity",
              status === "ended" && "opacity-35",
            )}
          >
            <div
              className={cn(
                "relative shrink-0 overflow-hidden rounded-[0.5vw] bg-white/10",
                large ? "h-[13vh]" : "h-[10.5vh]",
                "aspect-[2/3]",
              )}
            >
              {s.movie.posterUrl ? (
                <Image src={s.movie.posterUrl} alt="" fill sizes="10vw" className="object-cover" />
              ) : null}
              {s.is3D ? (
                <span className="poster-type absolute bottom-[0.3vh] right-[0.3vw] text-[1.1vw] leading-none">3D</span>
              ) : null}
            </div>
            <span className={cn("poster-type shrink-0 leading-none", large ? "text-[3.6vw]" : "text-[2.9vw]")}>
              {formatTime(startOf(s))}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("display line-clamp-2 leading-tight", large ? "text-[2.3vw]" : "text-[1.85vw]")}>
                {s.movie.title}
              </p>
              <p className={cn("mt-[0.4vh] flex flex-wrap items-center gap-[0.6vw] text-white/65", large ? "text-[1.25vw]" : "text-[1.05vw]")}>
                {s.movie.ageRating ? <Chip>{s.movie.ageRating}</Chip> : null}
                <Chip>{s.isDubbed ? "Dublat" : "Subtitrat"}</Chip>
                {s.movie.genres ? <span className="truncate">{s.movie.genres}</span> : null}
              </p>
            </div>
            <StatusChip status={status} isNext={s.id === nextId} startsAt={startOf(s)} now={now} large={large} />
          </li>
        );
      })}
    </ul>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-[0.6vw] py-[0.15vh] text-[0.85em] font-medium text-white/80 ring-1 ring-white/20">
      {children}
    </span>
  );
}

function StatusChip({
  status,
  isNext,
  startsAt,
  now,
  large,
}: {
  status: Status;
  isNext: boolean;
  startsAt: Date;
  now: Date;
  large: boolean;
}) {
  const size = large ? "text-[1.3vw]" : "text-[1.05vw]";
  if (status === "running") {
    return (
      <span className={cn("ticket shrink-0 rounded-full bg-brand-yellow px-[1vw] py-[0.5vh] tracking-[0.14em] text-brand-ink", size)}>
        <span className="tv-live mr-[0.5vw] inline-block size-[0.6vw] rounded-full bg-brand-ink align-middle" />
        RULEAZĂ ACUM
      </span>
    );
  }
  if (status === "ended") {
    return <span className={cn("ticket shrink-0 tracking-[0.14em] text-white/60", size)}>S-A TERMINAT</span>;
  }
  const mins = minutesUntil(startsAt, now);
  return (
    <span
      className={cn(
        "ticket shrink-0 rounded-full px-[1vw] py-[0.5vh] tracking-[0.14em]",
        isNext ? "text-brand-yellow ring-[0.15vw] ring-brand-yellow/70" : "text-white/60",
        size,
      )}
    >
      {isNext && mins <= 90 ? `ÎNCEPE ÎN ${mins} MIN` : "URMEAZĂ"}
    </span>
  );
}

/** Trailerul filmului care urmează, pe televizorul de la intrarea sălii. */
function FeaturedPanel({ screening, now, sound }: { screening?: DisplayScreening; now: Date; sound: boolean }) {
  if (!screening) {
    return (
      <section className="flex flex-col items-center justify-center rounded-[1vw] bg-white/5 text-center">
        <p className="ticket text-[3vw] tracking-[0.2em] text-brand-yellow">MULȚUMIM CĂ AȚI VENIT</p>
        <p className="mt-[1vh] text-[1.5vw] text-white/70">Programul de mâine apare aici imediat ce e stabilit.</p>
      </section>
    );
  }
  const start = startOf(screening);
  const mins = minutesUntil(start, now);
  const videoId = youtubeId(screening.movie.trailerUrl);
  const still = screening.movie.backdropUrl ?? screening.movie.posterUrl;
  return (
    <section className="flex min-h-0 flex-col">
      <div className="relative w-full overflow-hidden rounded-[1vw] bg-black" style={{ aspectRatio: "16 / 9" }}>
        {videoId ? (
          <iframe
            key={`${videoId}-${sound}`}
            // cu 24% mai mare decât rama: bara de titlu și butoanele YouTube cad în afară
            className="pointer-events-none absolute left-[-12%] top-[-12%] h-[124%] w-[124%]"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${sound ? 0 : 1}&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&cc_load_policy=0&disablekb=1`}
            title={`Trailer ${screening.movie.title}`}
            allow="autoplay; encrypted-media"
          />
        ) : still ? (
          <Image src={still} alt="" fill sizes="60vw" className="object-cover" />
        ) : null}
      </div>
      <div className="mt-[2vh] flex items-end justify-between gap-[2vw]">
        <div className="min-w-0">
          <p className="ticket text-[1.4vw] tracking-[0.2em] text-brand-yellow">
            {mins > 0 ? "URMEAZĂ" : "RULEAZĂ ACUM"}
            {isToday(start, now) ? "" : " · MÂINE"}
          </p>
          <h2 className="display line-clamp-2 text-[3.2vw] leading-tight">{screening.movie.title}</h2>
          <p className="mt-[0.6vh] text-[1.3vw] text-white/70">
            {[screening.is3D ? "3D" : "2D", screening.isDubbed ? "Dublat" : "Subtitrat", screening.movie.ageRating, screening.movie.genres]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="poster-type text-[5vw] leading-none">{formatTime(start)}</p>
          <p className="ticket mt-[0.6vh] text-[1.3vw] tracking-[0.16em] text-white/75">
            {mins <= 0
              ? `A ÎNCEPUT ACUM ${-mins} MIN`
              : mins <= 90
                ? `ÎNCEPE ÎN ${mins} MIN`
                : isToday(start, now)
                  ? "ASTĂZI"
                  : "MÂINE"}
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ticket flex items-center justify-between pt-[1.5vh] text-[1.25vw] tracking-[0.16em] text-white/60">
      <span>
        REZERVĂRI GRATUITE · <span className="text-brand-yellow">{CINEMA.phone}</span> · {CINEMA.reservationHours.toUpperCase()}
      </span>
      <span>{CINEMA.hours.toUpperCase()}</span>
      <span>PRIMĂRIA MUNICIPIULUI SLATINA</span>
    </footer>
  );
}
