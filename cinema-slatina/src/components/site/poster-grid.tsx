import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { MovieCard } from "@/components/site/movie-card";
import { CINEMA } from "@/lib/constants";
import { formatDayMonth, formatWeekRange } from "@/lib/dates";
import type { GridEntry } from "@/server/queries";

type Props = {
  entries: GridEntry[];
  published: boolean;
  weekStart: Date;
  reservationsEnabled: boolean;
};

/**
 * Programul săptămânii în forma afișului tipărit din Canva: panou portocaliu
 * care se ridică din întunericul sălii (sus e transparent), cardurile
 * filmelor cu orele galbene înclinate deasupra, iar jos „INTRARE GRATUITĂ”,
 * telefonul, programul și data de început.
 */
export function PosterGrid({ entries, published, weekStart, reservationsEnabled }: Props) {
  return (
    <div className="poster-panel relative rounded-b-[1.75rem] px-3 pb-8 pt-10 sm:rounded-b-[2.25rem] sm:px-8 sm:pb-12 sm:pt-16">
      {/* Titlul stă în zona în care panoul iese din întunericul sălii. */}
      <div className="mb-8 flex flex-col items-center gap-2 text-center sm:mb-12">
        <span className="ticket -skew-x-12 bg-brand-yellow px-3 py-0.5 text-sm tracking-[0.22em] text-brand-ink shadow-[0_8px_24px_-8px_rgba(255,222,89,0.8)] sm:text-base">
          <span className="inline-block skew-x-12">
            SĂPTĂMÂNA {formatWeekRange(weekStart).toUpperCase()}
          </span>
        </span>
        <h2 className="display text-[clamp(1.9rem,5.4vw,3.6rem)] leading-none text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.65)]">
          Programul săptămânii
        </h2>
      </div>

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
        <Reveal
          as="ul"
          cards
          className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4"
        >
          {entries.map((entry) => (
            <li key={entry.movie.id} className="flex">
              <MovieCard
                className="w-full"
                href={`/filme/${entry.movie.slug}`}
                title={entry.movie.title}
                posterUrl={entry.movie.posterUrl}
                times={entry.times}
                is3D={entry.is3D}
                isDubbed={entry.isDubbed}
                genres={entry.movie.genres}
                runtimeMin={entry.movie.runtimeMin}
                ageRating={entry.movie.ageRating}
                halls={entry.halls}
                action={
                  entry.nextScreeningId && reservationsEnabled
                    ? { href: `/rezervare/${entry.nextScreeningId}`, label: "Rezervă gratuit" }
                    : { href: `/filme/${entry.movie.slug}`, label: "Vezi filmul" }
                }
              />
            </li>
          ))}
        </Reveal>
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
