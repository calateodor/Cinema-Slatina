import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarX2, Clock3, Star } from "lucide-react";
import { MoviePoster } from "@/components/site/movie-poster";
import { TrailerPlayer } from "@/components/site/trailer-player";
import { ShowtimeCard } from "@/components/site/showtime-card";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  areReservationsEnabled,
  getMovieBySlug,
  getUpcomingScreeningsForMovie,
} from "@/server/queries";
import { formatDayMonth, formatLongDate } from "@/lib/dates";

export async function generateMetadata(
  props: PageProps<"/filme/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const movie = await getMovieBySlug(slug);
  if (!movie) return { title: "Film indisponibil" };
  return {
    title: movie.title,
    description: movie.synopsis?.slice(0, 160) ?? undefined,
    openGraph: {
      title: movie.title,
      description: movie.synopsis ?? undefined,
      images: movie.posterUrl ? [movie.posterUrl] : undefined,
    },
  };
}

export default async function MoviePage(props: PageProps<"/filme/[slug]">) {
  const { slug } = await props.params;
  const movie = await getMovieBySlug(slug);
  if (!movie || movie.isArchived) notFound();

  const [screenings, reservationsEnabled] = await Promise.all([
    getUpcomingScreeningsForMovie(movie.id),
    areReservationsEnabled(),
  ]);

  const byDay = new Map<string, typeof screenings>();
  for (const s of screenings) {
    const key = formatLongDate(new Date(s.startsAt));
    const list = byDay.get(key) ?? [];
    list.push(s);
    byDay.set(key, list);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/filme"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Toate filmele
      </Link>

      <Reveal y={16} className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <div className="mx-auto w-40 sm:w-52 lg:mx-0 lg:w-full">
          <MoviePoster
            title={movie.title}
            posterUrl={movie.posterUrl}
            priority
            sizes="220px"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {movie.comingSoon ? (
            <p className="ticket text-sm tracking-[0.28em] text-brand-orange">
              ÎN CURÂND
              {movie.comingSoonFrom
                ? ` · DIN ${formatDayMonth(new Date(movie.comingSoonFrom)).toUpperCase()}`
                : ""}
            </p>
          ) : null}

          <div className="flex flex-col gap-1">
            <h1 className="display text-balance text-[clamp(1.75rem,5vw,3rem)]">
              {movie.title}
            </h1>
            {movie.originalTitle && movie.originalTitle !== movie.title ? (
              <p className="text-sm italic text-muted-foreground">
                {movie.originalTitle}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {movie.genres ? (
              <Badge variant="outline" className="text-brand-yellow">
                {movie.genres}
              </Badge>
            ) : null}
            {movie.runtimeMin ? (
              <Badge variant="outline">
                <Clock3 data-icon="inline-start" />
                {movie.runtimeMin} min
              </Badge>
            ) : null}
            {movie.ageRating ? (
              <Badge variant="outline">{movie.ageRating}</Badge>
            ) : null}
            {movie.releaseYear ? (
              <Badge variant="outline">{movie.releaseYear}</Badge>
            ) : null}
            {movie.imdbRating ? (
              <Badge variant="outline">
                <Star
                  data-icon="inline-start"
                  className="fill-brand-yellow text-brand-yellow"
                />
                {movie.imdbRating.toFixed(1)}
              </Badge>
            ) : null}
          </div>

          {movie.synopsis ? (
            <p className="max-w-prose text-[0.95rem] leading-relaxed text-muted-foreground">
              {movie.synopsis}
            </p>
          ) : null}

          {movie.director || movie.cast ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {movie.director ? (
                <div>
                  <dt className="text-muted-foreground">Regia</dt>
                  <dd className="font-medium">{movie.director}</dd>
                </div>
              ) : null}
              {movie.cast ? (
                <div>
                  <dt className="text-muted-foreground">Distribuție</dt>
                  <dd className="font-medium">{movie.cast}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {movie.imdbUrl ? (
            <a
              href={movie.imdbUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="w-fit text-sm font-medium text-brand-orange hover:text-brand-yellow"
            >
              Vezi filmul pe IMDb ↗
            </a>
          ) : null}
        </div>
      </Reveal>

      <Reveal y={16} className="flex flex-col gap-4">
        <h2 className="display text-[clamp(1.35rem,3.5vw,2rem)]">Trailer</h2>
        <div className="max-w-3xl">
          <TrailerPlayer url={movie.trailerUrl} title={movie.title} />
        </div>
      </Reveal>

      <section className="flex flex-col gap-5">
        <h2 className="display text-[clamp(1.35rem,3.5vw,2rem)]">
          Proiecții disponibile
        </h2>

        {screenings.length === 0 ? (
          <Empty className="border bg-card/50">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarX2 />
              </EmptyMedia>
              <EmptyDescription>
                {movie.comingSoon
                  ? "Filmul nu a intrat încă în program. Anunțăm orele imediat ce programul este stabilit."
                  : "Nu mai sunt proiecții programate pentru acest film."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-8">
            {[...byDay.entries()].map(([day, list]) => (
              <div key={day} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {day}
                </h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {list.map((s) => (
                    <ShowtimeCard
                      key={s.id}
                      screening={s}
                      reservationsEnabled={reservationsEnabled}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
