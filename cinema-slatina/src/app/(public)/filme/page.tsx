import type { Metadata } from "next";
import Link from "next/link";
import { MoviePoster } from "@/components/site/movie-poster";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/site/sections";
import { db } from "@/lib/db";
import { formatDayMonth } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Filme",
  description:
    "Toate filmele din programul curent și premierele anunțate la Cinema Eugen Ionescu Slatina.",
};

export default async function MoviesPage() {
  const movies = await db.movie.findMany({
    where: { isArchived: false },
    orderBy: [{ comingSoon: "desc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      posterUrl: true,
      genres: true,
      runtimeMin: true,
      ageRating: true,
      comingSoon: true,
      comingSoonFrom: true,
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Reveal y={16}>
        <SectionHeading
          title="Filme"
          description="Apasă pe un film pentru trailer, gen și descriere completă."
        />
      </Reveal>

      <Reveal
        stagger
        className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
      >
        {movies.map((movie) => (
          <Link key={movie.id} href={`/filme/${movie.slug}`} className="group block">
            <MoviePoster
              title={movie.title}
              posterUrl={movie.posterUrl}
              sizes="(max-width: 640px) 45vw, 200px"
              className="transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-brand-yellow/50"
            />
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-brand-yellow">
              {movie.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {movie.comingSoon && movie.comingSoonFrom
                ? `Din ${formatDayMonth(new Date(movie.comingSoonFrom))}`
                : (movie.genres ?? "")}
            </p>
          </Link>
        ))}
      </Reveal>
    </div>
  );
}
