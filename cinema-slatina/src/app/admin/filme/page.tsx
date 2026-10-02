import { MovieManager, type AdminMovie } from "@/components/admin/movie-manager";
import { TrailerPanel } from "@/components/admin/trailer-panel";
import { PageTitle } from "@/components/staff/ui";
import { db } from "@/lib/db";
import { isTmdbConfigured } from "@/lib/tmdb";
import { getTrailerStatus } from "@/server/actions/trailers";

export default async function AdminMoviesPage() {
  const [rows, trailers] = await Promise.all([
    db.movie.findMany({
      orderBy: [{ isArchived: "asc" }, { comingSoon: "desc" }, { title: "asc" }],
      include: { _count: { select: { screenings: true } } },
    }),
    getTrailerStatus(),
  ]);

  const movies: AdminMovie[] = rows.map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    originalTitle: m.originalTitle,
    imdbUrl: m.imdbUrl,
    synopsis: m.synopsis,
    posterUrl: m.posterUrl,
    backdropUrl: m.backdropUrl,
    trailerUrl: m.trailerUrl,
    genres: m.genres,
    runtimeMin: m.runtimeMin,
    releaseYear: m.releaseYear,
    ageRating: m.ageRating,
    imdbRating: m.imdbRating,
    director: m.director,
    cast: m.cast,
    comingSoon: m.comingSoon,
    comingSoonFrom: m.comingSoonFrom,
    isArchived: m.isArchived,
    screeningCount: m._count.screenings,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Filme"
        description="Adaugă filme cu link de IMDb — descrierea tradusă, posterul și trailerul se completează singure."
      />
      <TrailerPanel initial={trailers} />
      <MovieManager movies={movies} tmdbConfigured={isTmdbConfigured()} />
    </div>
  );
}
