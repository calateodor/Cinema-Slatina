import Image from "next/image";
import Link from "next/link";
import { MoviePoster } from "@/components/site/movie-poster";
import { CINEMA } from "@/lib/constants";
import { formatDayMonth } from "@/lib/dates";
import type { GridEntry } from "@/server/queries";

type Props = {
  entries: GridEntry[];
  published: boolean;
  weekStart: Date;
  reservationsEnabled: boolean;
};

/**
 * Programul săptămânii în forma afișului tipărit din Canva: panou portocaliu
 * care se ridică din întunericul sălii (sus e transparent), opt afișe pe patru coloane cu orele galbene
 * înclinate deasupra și marcajul 3D în colț, iar jos „INTRARE GRATUITĂ”,
 * telefonul, programul și data de început.
 */
export function PosterGrid({ entries, published, weekStart, reservationsEnabled }: Props) {
  return (
    <div className="poster-panel relative rounded-b-[1.75rem] px-4 pb-8 pt-14 sm:rounded-b-[2.25rem] sm:px-8 sm:pb-12 sm:pt-24">
      {!published || entries.length === 0 ? (
        <div className="mx-auto my-10 max-w-xl text-center">
          <p className="display text-[clamp(1.4rem,4.5vw,2.4rem)] leading-tight text-white drop-shadow-[0_3px_0_rgba(28,19,5,0.5)]">
            Programul săptămânii nu este încă stabilit
          </p>
          <p className="mt-3 text-sm text-white/85 sm:text-base">
            Filmele și orele apar aici imediat ce programul este publicat. Până
            atunci, sună la casierie: {CINEMA.phone}.
          </p>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-10 sm:mt-5 sm:grid-cols-4 sm:gap-x-5 sm:gap-y-12">
          {entries.map((entry) => {
            const reserveHref =
              entry.nextScreeningId && reservationsEnabled
                ? `/rezervare/${entry.nextScreeningId}`
                : `/filme/${entry.movie.slug}`;
            return (
              <li key={entry.movie.id} className="relative flex flex-col">
                <div className="pointer-events-none absolute -top-5 left-0 z-10 -rotate-6 sm:-top-7">
                  <span className="poster-type text-[clamp(1.6rem,5.2vw,2.75rem)] whitespace-nowrap">
                    {entry.times.join(" · ")}
                  </span>
                </div>

                <Link
                  href={`/filme/${entry.movie.slug}`}
                  aria-label={`${entry.movie.title}, ora ${entry.times.join(" și ")}`}
                  className="group block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/70"
                >
                  <MoviePoster
                    title={entry.movie.title}
                    posterUrl={entry.movie.posterUrl}
                    is3D={entry.is3D}
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 250px"
                    className="rounded-lg shadow-[0_22px_40px_-18px_rgba(0,0,0,0.9)] ring-0 transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:scale-[1.02] motion-reduce:transition-none"
                  />
                </Link>

                <div className="mt-2.5 flex items-start justify-between gap-2">
                  <Link
                    href={`/filme/${entry.movie.slug}`}
                    className="display line-clamp-2 text-[0.8rem] leading-tight text-white drop-shadow-[0_2px_0_rgba(28,19,5,0.45)] transition-colors hover:text-brand-yellow motion-reduce:transition-none sm:text-[0.95rem]"
                  >
                    {entry.movie.title}
                  </Link>
                  <Link
                    href={reserveHref}
                    className="poster-type shrink-0 rounded-full bg-brand-ink/85 px-2.5 py-1 text-[0.95rem] leading-none transition-colors hover:bg-brand-ink motion-reduce:transition-none sm:px-3 sm:text-base"
                    aria-label={`Rezervă la ${entry.movie.title}`}
                  >
                    {entry.nextScreeningId ? "Rezervă" : "Detalii"}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PosterFooter weekStart={weekStart} />
    </div>
  );
}

/** Subsolul afișului: intrare gratuită, telefon, program, data și Primăria. */
function PosterFooter({ weekStart }: { weekStart: Date }) {
  const shadow = "drop-shadow-[0_3px_0_rgba(28,19,5,0.55)]";
  return (
    <div className="mt-10 flex flex-col items-center text-center text-white sm:mt-14">
      <p className={`display text-[clamp(1.9rem,7.6vw,4.8rem)] leading-none ${shadow}`}>
        INTRARE GRATUITĂ
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-center gap-x-5 gap-y-1 sm:mt-3 sm:gap-x-8">
        <a
          href={`tel:${CINEMA.phone.replace(/\s/g, "")}`}
          className={`display text-brand-yellow text-[clamp(1.7rem,6.6vw,4.2rem)] leading-none transition-colors hover:text-brand-yellow-soft motion-reduce:transition-none ${shadow}`}
        >
          {CINEMA.phone}
        </a>
        <p className={`display text-[clamp(0.95rem,2.7vw,1.7rem)] leading-[1.05] ${shadow}`}>
          PROGRAM
          <br />
          14:00-22:00
        </p>
      </div>
      <p className={`display mt-2 text-[clamp(1.25rem,4.4vw,2.8rem)] leading-none ${shadow}`}>
        DIN {formatDayMonth(weekStart).toUpperCase()}
      </p>
      <div className="mt-3 flex items-center gap-2 sm:mt-4">
        <Image
          src="/brand/primaria-slatina.png"
          alt="Stema Municipiului Slatina"
          width={88}
          height={128}
          className="h-8 w-auto sm:h-10"
        />
        <p className={`display text-[clamp(0.8rem,2.4vw,1.5rem)] leading-none ${shadow}`}>
          PRIMĂRIA MUNICIPIULUI SLATINA
        </p>
      </div>
    </div>
  );
}
