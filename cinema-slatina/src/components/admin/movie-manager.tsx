"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Download,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteMovie,
  fetchImdbMetadata,
  saveMovie,
  setMovieArchived,
} from "@/server/actions/admin";
import { AGE_RATINGS } from "@/lib/constants";
import { EmptyRow } from "@/components/staff/ui";

export type AdminMovie = {
  id: string;
  slug: string;
  title: string;
  originalTitle: string | null;
  imdbUrl: string | null;
  synopsis: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  genres: string | null;
  runtimeMin: number | null;
  releaseYear: number | null;
  ageRating: string | null;
  imdbRating: number | null;
  director: string | null;
  cast: string | null;
  comingSoon: boolean;
  comingSoonFrom: Date | null;
  isArchived: boolean;
  screeningCount: number;
};

type FormState = {
  id?: string;
  title: string;
  originalTitle: string;
  imdbUrl: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  genres: string;
  runtimeMin: string;
  releaseYear: string;
  ageRating: string;
  imdbRating: string;
  director: string;
  cast: string;
  comingSoon: boolean;
  comingSoonFrom: string;
};

const EMPTY: FormState = {
  title: "",
  originalTitle: "",
  imdbUrl: "",
  synopsis: "",
  posterUrl: "",
  backdropUrl: "",
  trailerUrl: "",
  genres: "",
  runtimeMin: "",
  releaseYear: "",
  ageRating: "AG",
  imdbRating: "",
  director: "",
  cast: "",
  comingSoon: false,
  comingSoonFrom: "",
};

function toForm(movie: AdminMovie): FormState {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle ?? "",
    imdbUrl: movie.imdbUrl ?? "",
    synopsis: movie.synopsis ?? "",
    posterUrl: movie.posterUrl ?? "",
    backdropUrl: movie.backdropUrl ?? "",
    trailerUrl: movie.trailerUrl ?? "",
    genres: movie.genres ?? "",
    runtimeMin: movie.runtimeMin ? String(movie.runtimeMin) : "",
    releaseYear: movie.releaseYear ? String(movie.releaseYear) : "",
    ageRating: movie.ageRating ?? "AG",
    imdbRating: movie.imdbRating ? String(movie.imdbRating) : "",
    director: movie.director ?? "",
    cast: movie.cast ?? "",
    comingSoon: movie.comingSoon,
    comingSoonFrom: movie.comingSoonFrom
      ? new Date(movie.comingSoonFrom).toISOString().slice(0, 10)
      : "",
  };
}

export function MovieManager({
  movies,
  tmdbConfigured,
}: {
  movies: AdminMovie[];
  tmdbConfigured: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();
  const [fetching, setFetching] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openNew() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(movie: AdminMovie) {
    setForm(toForm(movie));
    setOpen(true);
  }

  async function importFromImdb() {
    if (!form.imdbUrl.trim()) {
      toast.error("Adaugă mai întâi link-ul de IMDb.");
      return;
    }
    setFetching(true);
    const result = await fetchImdbMetadata(form.imdbUrl);
    setFetching(false);

    if (!result.ok || !result.data) {
      toast.error(result.message ?? "Nu am putut prelua datele.");
      return;
    }

    const d = result.data;
    setForm((prev) => ({
      ...prev,
      title: d.title || prev.title,
      originalTitle: d.originalTitle ?? prev.originalTitle,
      synopsis: d.synopsis ?? prev.synopsis,
      posterUrl: d.posterUrl ?? prev.posterUrl,
      backdropUrl: d.backdropUrl ?? prev.backdropUrl,
      trailerUrl: d.trailerUrl ?? prev.trailerUrl,
      genres: d.genres ?? prev.genres,
      runtimeMin: d.runtimeMin ? String(d.runtimeMin) : prev.runtimeMin,
      releaseYear: d.releaseYear ? String(d.releaseYear) : prev.releaseYear,
      imdbRating: d.imdbRating ? String(d.imdbRating) : prev.imdbRating,
      director: d.director ?? prev.director,
      cast: d.cast ?? prev.cast,
    }));
    toast.success("Am preluat descrierea, posterul și trailerul.");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveMovie({
        ...form,
        runtimeMin: form.runtimeMin || null,
        releaseYear: form.releaseYear || null,
        imdbRating: form.imdbRating || null,
        comingSoonFrom: form.comingSoon ? form.comingSoonFrom || null : null,
      });
      if (!result.ok) {
        toast.error(result.message ?? "Filmul nu a putut fi salvat.");
        return;
      }
      toast.success(form.id ? "Film actualizat." : "Film adăugat.");
      setOpen(false);
      router.refresh();
    });
  }

  function toggleArchive(movie: AdminMovie) {
    startTransition(async () => {
      await setMovieArchived(movie.id, !movie.isArchived);
      toast.success(movie.isArchived ? "Film reactivat." : "Film arhivat.");
      router.refresh();
    });
  }

  function remove(movie: AdminMovie) {
    if (!confirm(`Ștergi definitiv „${movie.title}”?`)) return;
    startTransition(async () => {
      const result = await deleteMovie(movie.id);
      if (!result.ok) {
        toast.error(result.message ?? "Filmul nu a putut fi șters.");
        return;
      }
      toast.success("Film șters.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <Button onClick={openNew} className="gap-2">
          <Plus data-icon="inline-start" />
          Adaugă film
        </Button>
      </div>

      {movies.length === 0 ? (
        <div className="mt-4">
          <EmptyRow>Niciun film adăugat încă.</EmptyRow>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {movies.map((movie) => (
            <li
              key={movie.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-secondary">
                {movie.posterUrl ? (
                  <Image
                    src={movie.posterUrl}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {movie.title}
                  {movie.isArchived ? (
                    <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                      arhivat
                    </span>
                  ) : null}
                  {movie.comingSoon ? (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      în curând
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    movie.genres,
                    movie.runtimeMin ? `${movie.runtimeMin} min` : null,
                    movie.ageRating,
                    `${movie.screeningCount} proiecții`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(movie)}
                  aria-label={`Editează ${movie.title}`}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleArchive(movie)}
                  aria-label={movie.isArchived ? "Reactivează" : "Arhivează"}
                >
                  {movie.isArchived ? (
                    <ArchiveRestore />
                  ) : (
                    <Archive data-icon="inline-start" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(movie)}
                  aria-label={`Șterge ${movie.title}`}
                  className="text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editează filmul" : "Film nou"}</DialogTitle>
            <DialogDescription>
              Pune link-ul de IMDb și apasă „Preia datele”. Descrierea în română,
              posterul și trailerul se completează automat.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="imdbUrl">Link IMDb</FieldLabel>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="imdbUrl"
                    value={form.imdbUrl}
                    onChange={(e) => set("imdbUrl", e.target.value)}
                    placeholder="https://www.imdb.com/title/tt9603212/"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={importFromImdb}
                    disabled={fetching}
                    className="shrink-0 gap-2"
                  >
                    {fetching ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <Download data-icon="inline-start" />
                    )}
                    Preia datele
                  </Button>
                </div>
                {!tmdbConfigured ? (
                  <p className="mt-1.5 text-xs text-warning">
                    Preluarea automată are nevoie de o cheie TMDB gratuită în
                    fișierul .env (TMDB_API_KEY). Până atunci poți completa manual.
                  </p>
                ) : null}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="title">Titlu (română)</FieldLabel>
                  <Input
                    id="title"
                    required
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="originalTitle">Titlu original</FieldLabel>
                  <Input
                    id="originalTitle"
                    value={form.originalTitle}
                    onChange={(e) => set("originalTitle", e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="synopsis">Descriere</FieldLabel>
                  <Textarea
                    id="synopsis"
                    rows={5}
                    value={form.synopsis}
                    onChange={(e) => set("synopsis", e.target.value)}
                  />
                </div>

                <Field>
                  <FieldLabel htmlFor="genres">Gen</FieldLabel>
                  <Input
                    id="genres"
                    value={form.genres}
                    onChange={(e) => set("genres", e.target.value)}
                    placeholder="Animație, Familie"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="runtime">Durată (minute)</FieldLabel>
                  <Input
                    id="runtime"
                    inputMode="numeric"
                    value={form.runtimeMin}
                    onChange={(e) =>
                      set("runtimeMin", e.target.value.replace(/\D/g, ""))
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="year">An</FieldLabel>
                  <Input
                    id="year"
                    inputMode="numeric"
                    value={form.releaseYear}
                    onChange={(e) =>
                      set("releaseYear", e.target.value.replace(/\D/g, ""))
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="ageRating">Clasificare</FieldLabel>
                  <Select
                    value={form.ageRating}
                    onValueChange={(v) => set("ageRating", v)}
                  >
                    <SelectTrigger id="ageRating" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_RATINGS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label} — {r.hint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="trailerUrl">Trailer (YouTube)</FieldLabel>
                  <Input
                    id="trailerUrl"
                    value={form.trailerUrl}
                    onChange={(e) => set("trailerUrl", e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="posterUrl">Poster (link imagine)</FieldLabel>
                  <Input
                    id="posterUrl"
                    value={form.posterUrl}
                    onChange={(e) => set("posterUrl", e.target.value)}
                  />
                </div>

                <Field>
                  <FieldLabel htmlFor="director">Regia</FieldLabel>
                  <Input
                    id="director"
                    value={form.director}
                    onChange={(e) => set("director", e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="cast">Distribuție</FieldLabel>
                  <Input
                    id="cast"
                    value={form.cast}
                    onChange={(e) => set("cast", e.target.value)}
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <Field>
                    <FieldLabel htmlFor="comingSoon">Marchează „în curând”</FieldLabel>
                    <p className="text-xs text-muted-foreground">
                      Filmul apare în secțiunea de premiere de pe prima pagină.
                    </p>
                  </Field>
                  <Switch
                    id="comingSoon"
                    checked={form.comingSoon}
                    onCheckedChange={(v) => set("comingSoon", v)}
                  />
                </div>
                {form.comingSoon ? (
                  <div className="mt-3">
                    <FieldLabel htmlFor="comingSoonFrom">Din data de</FieldLabel>
                    <Input
                      id="comingSoonFrom"
                      type="date"
                      value={form.comingSoonFrom}
                      onChange={(e) => set("comingSoonFrom", e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Renunță
              </Button>
              <Button type="submit" disabled={pending} className="gap-2">
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Salvează
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
