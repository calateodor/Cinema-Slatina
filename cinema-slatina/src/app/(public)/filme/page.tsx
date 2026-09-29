import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GlowCard } from "@/components/motion/glow-card";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/page-header";
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
      <PageHeader
        title="Filme"
        description="Tot ce rulează acum și ce vine în curând. Apasă pe un film pentru trailer, descriere și orele de proiecție."
      />

      <Reveal
        stagger
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5"
      >
        {movies.map((movie) => {
          const firstGenre = movie.genres?.split(",")[0]?.trim();
          return (
            <Link
              key={movie.id}
              href={`/filme/${movie.slug}`}
              className="movie-card group block rounded-[1.1rem] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-yellow/70"
            >
              <GlowCard asCard={false} background="#101014" className="h-full rounded-[1.1rem]">
                <div className="relative aspect-[2/3] overflow-hidden rounded-t-[1.05rem]">
                  {movie.posterUrl ? (
                    <Image
                      src={movie.posterUrl}
                      alt={`Afișul filmului ${movie.title}`}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] motion-reduce:transition-none"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#2a1d08] to-[#0b0b0e] p-3 text-center">
                      <span className="display text-lg text-white/85">{movie.title}</span>
                    </div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#101014] via-[#101014]/50 to-transparent" />
                  {movie.ageRating ? (
                    <span className="absolute right-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[0.68rem] font-semibold text-white backdrop-blur-sm">
                      {movie.ageRating}
                    </span>
                  ) : null}
                  {movie.comingSoon ? (
                    <span className="ticket absolute left-2 top-2 -skew-x-12 bg-brand-yellow px-2 text-xs tracking-[0.18em] text-brand-ink">
                      <span className="inline-block skew-x-12">
                        {movie.comingSoonFrom
                          ? `DIN ${formatDayMonth(new Date(movie.comingSoonFrom)).toUpperCase()}`
                          : "ÎN CURÂND"}
                      </span>
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1 p-3 pt-1.5">
                  <p className="display line-clamp-2 text-[0.92rem] leading-tight text-white transition-colors group-hover:text-brand-yellow motion-reduce:transition-none">
                    {movie.title}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-[0.72rem] text-white/55">
                    {firstGenre ? <span>{firstGenre}</span> : null}
                    {firstGenre && movie.runtimeMin ? <span aria-hidden="true">·</span> : null}
                    {movie.runtimeMin ? <span>{movie.runtimeMin} min</span> : null}
                  </p>
                </div>
              </GlowCard>
            </Link>
          );
        })}
      </Reveal>
    </div>
  );
}
