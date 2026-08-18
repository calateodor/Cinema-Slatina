"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  copyDayToDays,
  copyWeek,
  deleteScreening,
  fetchImdbMetadata,
  publishWeek,
  saveMovie,
  saveScreening,
} from "@/server/actions/admin";
import { dayKey, formatTime, formatWeekRange, parseDayKey } from "@/lib/dates";

export type ScheduleMovie = {
  id: string;
  title: string;
  posterUrl: string | null;
  imdbUrl: string | null;
};

export type ScheduleScreening = {
  id: string;
  movieId: string;
  hallId: string;
  startsAt: string;
  is3D: boolean;
  isDubbed: boolean;
  reservationsOpen: boolean;
  allowExtraSeats: boolean;
  capacityOverride: number | null;
  isCancelled: boolean;
  note: string | null;
  movieTitle: string;
  posterUrl: string | null;
  ageRating: string | null;
  hallName: string;
  hallColor: string;
  baseCapacity: number;
  reservedSeats: number;
};

type Hall = { id: string; name: string; colorHex: string };
type Day = { key: string; label: string };

type Props = {
  weekStartKey: string;
  prevWeekKey: string;
  nextWeekKey: string;
  thisWeekKey: string;
  isPublished: boolean;
  screenings: ScheduleScreening[];
  movies: ScheduleMovie[];
  halls: Hall[];
  days: Day[];
  tmdbConfigured: boolean;
};

type Draft = {
  id?: string;
  day: string;
  time: string;
  movieId: string;
  hallId: string;
  is3D: boolean;
  isDubbed: boolean;
  reservationsOpen: boolean;
};

/** Orele obișnuite ale cinematografului, propuse pentru fiecare card nou. */
const DEFAULT_TIMES = [
  "15:00",
  "15:30",
  "17:00",
  "17:30",
  "19:00",
  "19:30",
  "21:00",
  "21:40",
];

export function ScheduleManager({
  weekStartKey,
  prevWeekKey,
  nextWeekKey,
  thisWeekKey,
  isPublished,
  screenings,
  movies,
  halls,
  days,
  tmdbConfigured,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [activeDay, setActiveDay] = useState(() => days[0]?.key ?? "");
  /** Câte cartonașe goale în plus arătăm, pentru fiecare zi. */
  const [extraSlots, setExtraSlots] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Draft | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleScreening[]>();
    for (const s of screenings) {
      const day = dayKey(new Date(s.startsAt));
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }
    return map;
  }, [screenings]);

  const dayList = byDay.get(activeDay) ?? [];
  const extras = extraSlots[activeDay] ?? 0;

  function goToWeek(key: string) {
    router.push(`/admin/program?saptamana=${key}`);
  }

  function openCard(s?: ScheduleScreening) {
    if (s) {
      setDraft({
        id: s.id,
        day: dayKey(new Date(s.startsAt)),
        time: formatTime(new Date(s.startsAt)),
        movieId: s.movieId,
        hallId: s.hallId,
        is3D: s.is3D,
        isDubbed: s.isDubbed,
        reservationsOpen: s.reservationsOpen,
      });
      return;
    }
    // Card nou: propunem prima oră liberă din tiparul obișnuit.
    const used = new Set(dayList.map((x) => formatTime(new Date(x.startsAt))));
    const time = DEFAULT_TIMES.find((t) => !used.has(t)) ?? "19:00";
    setDraft({
      day: activeDay,
      time,
      movieId: movies[0]?.id ?? "",
      hallId: halls[0]?.id ?? "",
      is3D: false,
      isDubbed: true,
      reservationsOpen: true,
    });
  }

  function togglePublish() {
    startTransition(async () => {
      await publishWeek(weekStartKey, !isPublished);
      toast.success(
        !isPublished
          ? "Programul este acum vizibil pe site."
          : "Programul a fost retras de pe site.",
      );
      router.refresh();
    });
  }

  function spreadDay() {
    const others = days.map((d) => d.key).filter((d) => d !== activeDay);
    if (
      !confirm(
        `Copiezi cele ${dayList.length} filme în celelalte ${others.length} zile?`,
      )
    )
      return;
    startTransition(async () => {
      const result = await copyDayToDays(activeDay, others);
      if (!result.ok) {
        toast.error(result.message ?? "Nu am putut copia ziua.");
        return;
      }
      toast.success(`Am adăugat ${result.data?.copied ?? 0} proiecții.`);
      router.refresh();
    });
  }

  function duplicatePreviousWeek() {
    startTransition(async () => {
      const result = await copyWeek(prevWeekKey, weekStartKey);
      if (!result.ok) {
        toast.error(result.message ?? "Nu am putut copia programul.");
        return;
      }
      toast.success(`Am copiat ${result.data?.copied ?? 0} proiecții.`);
      router.refresh();
    });
  }

  function removeScreening(s: ScheduleScreening) {
    if (
      !confirm(`Ștergi „${s.movieTitle}” de la ${formatTime(new Date(s.startsAt))}?`)
    )
      return;
    startTransition(async () => {
      const result = await deleteScreening(s.id);
      if (!result.ok) {
        toast.error(result.message ?? "Proiecția nu a putut fi ștearsă.");
        return;
      }
      toast.success("Proiecție ștearsă.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => goToWeek(prevWeekKey)}
          aria-label="Săptămâna anterioară"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => goToWeek(nextWeekKey)}
          aria-label="Săptămâna următoare"
        >
          <ChevronRight />
        </Button>

        <div className="min-w-0">
          <p className="font-medium">{formatWeekRange(parseDayKey(weekStartKey))}</p>
          <p className="text-xs text-muted-foreground">
            {weekStartKey === thisWeekKey ? "Săptămâna curentă" : "Altă săptămână"} ·{" "}
            {screenings.length} proiecții
          </p>
        </div>

        {weekStartKey !== thisWeekKey ? (
          <Button variant="ghost" size="sm" onClick={() => goToWeek(thisWeekKey)}>
            Săptămâna curentă
          </Button>
        ) : null}

        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={duplicatePreviousWeek} disabled={pending}>
            <Copy data-icon="inline-start" />
            Copiază săptămâna trecută
          </Button>
          <Button onClick={togglePublish} disabled={pending}>
            {isPublished ? (
              <EyeOff data-icon="inline-start" />
            ) : (
              <Eye data-icon="inline-start" />
            )}
            {isPublished ? "Retrage de pe site" : "Publică programul"}
          </Button>
        </div>
      </div>

      <Alert variant={isPublished ? "success" : "warning"} className="mt-3">
        <AlertDescription>
          {isPublished
            ? "Programul acestei săptămâni este vizibil publicului."
            : "Programul nu este publicat. Pe site apare mesajul „Programul nu este încă stabilit”."}
        </AlertDescription>
      </Alert>

      <ToggleGroup
        type="single"
        value={activeDay}
        onValueChange={(v) => v && setActiveDay(v)}
        variant="outline"
        className="mt-5 max-w-full flex-wrap"
        aria-label="Zilele săptămânii"
      >
        {days.map((day) => {
          const count = (byDay.get(day.key) ?? []).length;
          const [weekday, rest] = day.label.split(", ");
          return (
            <ToggleGroupItem
              key={day.key}
              value={day.key}
              className="h-auto flex-col items-start gap-0 px-3 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <span className="text-sm font-semibold capitalize">{weekday}</span>
              <span className="text-xs opacity-75">
                {rest} · {count} {count === 1 ? "film" : "filme"}
              </span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium capitalize">
          {days.find((d) => d.key === activeDay)?.label}
        </p>
        {dayList.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={spreadDay} disabled={pending}>
            <CalendarPlus data-icon="inline-start" />
            Copiază ziua în restul săptămânii
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {dayList.map((s) => (
          <AdminCard
            key={s.id}
            screening={s}
            onEdit={() => openCard(s)}
            onDelete={() => removeScreening(s)}
            disabled={pending}
          />
        ))}

        {Array.from({ length: extras }, (_, i) => (
          <EmptyCard key={`gol-${i}`} onClick={() => openCard()} />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setExtraSlots((p) => ({
              ...p,
              [activeDay]: Math.max(0, (p[activeDay] ?? 0) - 1),
            }))
          }
          disabled={extras === 0}
          aria-label="Un card gol mai puțin"
        >
          <Minus />
        </Button>
        <span className="min-w-48 text-center text-sm text-muted-foreground">
          {dayList.length} {dayList.length === 1 ? "film" : "filme"}
          {extras > 0 ? ` · ${extras} carduri goale` : ""}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setExtraSlots((p) => ({ ...p, [activeDay]: (p[activeDay] ?? 0) + 1 }))
          }
          aria-label="Încă un card gol"
        >
          <Plus />
        </Button>
      </div>

      {draft ? (
        <ScreeningDialog
          draft={draft}
          movies={movies}
          halls={halls}
          days={days}
          tmdbConfigured={tmdbConfigured}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            setExtraSlots((p) => ({
              ...p,
              [activeDay]: Math.max(0, (p[activeDay] ?? 0) - 1),
            }));
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function AdminCard({
  screening,
  onEdit,
  onDelete,
  disabled,
}: {
  screening: ScheduleScreening;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <article className="group flex flex-col">
      <div className="relative z-10 -mb-3 flex justify-center">
        <span className="ticket rounded-lg bg-brand-yellow px-3 py-0.5 text-2xl leading-tight text-brand-ink shadow-sm">
          {formatTime(new Date(screening.startsAt))}
        </span>
      </div>

      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-secondary ring-1 ring-border transition-shadow hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
        aria-label={`Modifică ${screening.movieTitle}`}
      >
        {screening.posterUrl ? (
          <Image
            src={screening.posterUrl}
            alt=""
            fill
            sizes="260px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center p-3 text-center text-sm font-medium">
            {screening.movieTitle}
          </span>
        )}
        {screening.is3D ? (
          <Badge variant="brand" className="ticket absolute right-2 top-2 text-sm">
            3D
          </Badge>
        ) : null}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-center text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none">
          Apasă pentru modificare
        </span>
      </button>

      <div className="mt-2 flex min-w-0 flex-col gap-1.5">
        <p className="truncate text-sm font-medium">{screening.movieTitle}</p>
        <div className="flex flex-wrap items-center gap-1">
          <Badge
            variant="outline"
            style={{
              borderColor: `color-mix(in oklch, ${screening.hallColor} 45%, transparent)`,
              color: screening.hallColor,
            }}
          >
            {screening.hallName}
          </Badge>
          <Badge variant="secondary">
            {screening.isDubbed ? "Dublat" : "Subtitrat"}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {screening.reservedSeats}/{screening.baseCapacity} rezervate
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive"
            onClick={onDelete}
            disabled={disabled}
            aria-label={`Șterge ${screening.movieTitle}`}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </article>
  );
}

function EmptyCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary motion-reduce:transition-none"
    >
      <Plus className="size-8" />
      <span className="text-sm font-medium">Adaugă film</span>
    </button>
  );
}

type Fetched = Awaited<ReturnType<typeof fetchImdbMetadata>>["data"];

function ScreeningDialog({
  draft,
  movies,
  halls,
  days,
  tmdbConfigured,
  onClose,
  onSaved,
}: {
  draft: Draft;
  movies: ScheduleMovie[];
  halls: Hall[];
  days: Day[];
  tmdbConfigured: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Draft>(draft);
  const [mode, setMode] = useState<"existent" | "nou">(
    movies.length === 0 ? "nou" : "existent",
  );
  const [imdbUrl, setImdbUrl] = useState("");
  const [fetched, setFetched] = useState<Fetched>(undefined);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  /** Linkul folosit pentru a reimprospata datele unui film deja existent. */
  const [refreshUrl, setRefreshUrl] = useState("");

  const useExisting = Boolean(form.id) || mode === "existent";
  const selected = movies.find((m) => m.id === form.movieId);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  /** Preia datele filmului si le intoarce, ca sa putem salva imediat. */
  async function importLink(url: string, quiet = false): Promise<Fetched> {
    if (!url.trim()) {
      if (!quiet) toast.error("Lipsește linkul filmului.");
      return undefined;
    }
    setLoading(true);
    const result = await fetchImdbMetadata(url);
    setLoading(false);
    if (!result.ok || !result.data) {
      toast.error(result.message ?? "Nu am putut prelua datele.");
      return undefined;
    }
    setFetched(result.data);
    if (!quiet) toast.success(`Am găsit „${result.data.title}”.`);
    return result.data;
  }

  /** Reimprospateaza un film existent de pe linkul dat. */
  function refreshMovie() {
    const url = refreshUrl.trim() || selected?.imdbUrl || "";
    if (!url) {
      toast.error("Adaugă linkul filmului ca să pot lua datele.");
      return;
    }
    startTransition(async () => {
      const data = await importLink(url, true);
      if (!data) return;
      const saved = await saveMovie({
        id: form.movieId,
        title: data.title,
        originalTitle: data.originalTitle,
        imdbUrl: url,
        imdbId: data.imdbId,
        tmdbId: data.tmdbId,
        synopsis: data.synopsis,
        posterUrl: data.posterUrl,
        backdropUrl: data.backdropUrl,
        trailerUrl: data.trailerUrl,
        genres: data.genres,
        runtimeMin: data.runtimeMin,
        releaseYear: data.releaseYear,
        imdbRating: data.imdbRating,
        director: data.director,
        cast: data.cast,
        comingSoon: false,
      });
      if (!saved.ok) {
        toast.error(saved.message ?? "Filmul nu a putut fi actualizat.");
        return;
      }
      toast.success(`„${data.title}” a fost actualizat.`);
      onSaved();
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      let movieId = form.movieId;

      if (!useExisting) {
        // Daca utilizatorul a lipit doar linkul, preluam datele acum.
        const data = fetched ?? (await importLink(imdbUrl));
        if (!data) return;
        const saved = await saveMovie({
          title: data.title,
          originalTitle: data.originalTitle,
          imdbUrl,
          imdbId: data.imdbId,
          tmdbId: data.tmdbId,
          synopsis: data.synopsis,
          posterUrl: data.posterUrl,
          backdropUrl: data.backdropUrl,
          trailerUrl: data.trailerUrl,
          genres: data.genres,
          runtimeMin: data.runtimeMin,
          releaseYear: data.releaseYear,
          imdbRating: data.imdbRating,
          director: data.director,
          cast: data.cast,
          comingSoon: false,
        });
        if (!saved.ok || !saved.data) {
          toast.error(saved.message ?? "Filmul nu a putut fi salvat.");
          return;
        }
        movieId = saved.data.id;
      }

      if (!movieId) {
        toast.error("Alege un film.");
        return;
      }

      const result = await saveScreening({
        id: form.id,
        movieId,
        hallId: form.hallId,
        date: form.day,
        time: form.time,
        is3D: form.is3D,
        isDubbed: form.isDubbed,
        reservationsOpen: form.reservationsOpen,
        allowExtraSeats: true,
      });
      if (!result.ok) {
        toast.error(result.message ?? "Proiecția nu a putut fi salvată.");
        return;
      }
      toast.success(form.id ? "Proiecție actualizată." : "Film adăugat în program.");
      onSaved();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {form.id ? "Modifică proiecția" : "Film nou în program"}
          </DialogTitle>
          <DialogDescription>
            Alege un film existent sau adaugă unul nou direct de pe IMDb.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <FieldGroup>
            {!form.id ? (
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(v) => v && setMode(v as "existent" | "nou")}
                variant="outline"
                className="w-full"
              >
                <ToggleGroupItem value="existent" className="flex-1">
                  Film existent
                </ToggleGroupItem>
                <ToggleGroupItem value="nou" className="flex-1">
                  Film nou de pe IMDb
                </ToggleGroupItem>
              </ToggleGroup>
            ) : null}

            {useExisting ? (
              <Field>
                <FieldLabel htmlFor="movie">Film</FieldLabel>
                <Select value={form.movieId} onValueChange={(v) => set("movieId", v)}>
                  <SelectTrigger id="movie" className="w-full">
                    <SelectValue placeholder="Alege filmul" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {movies.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {form.movieId ? (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border p-3">
                    <FieldLabel htmlFor="refresh" className="text-xs">
                      Actualizează datele filmului (poster, descriere, trailer)
                    </FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="refresh"
                        value={refreshUrl || selected?.imdbUrl || ""}
                        onChange={(e) => setRefreshUrl(e.target.value)}
                        placeholder="Link IMDb sau TMDB"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={refreshMovie}
                        disabled={loading || pending}
                        className="shrink-0"
                      >
                        {loading ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <RefreshCw data-icon="inline-start" />
                        )}
                        Preia
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="imdb">Link IMDb sau TMDB</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="imdb"
                    value={imdbUrl}
                    onChange={(e) => setImdbUrl(e.target.value)}
                    onBlur={() => {
                      if (imdbUrl.trim() && !fetched) void importLink(imdbUrl, true);
                    }}
                    placeholder="imdb.com/title/tt9603212 sau themoviedb.org/movie/575264"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => importLink(imdbUrl)}
                    disabled={loading}
                    className="shrink-0"
                  >
                    {loading ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <Download data-icon="inline-start" />
                    )}
                    Preia datele
                  </Button>
                </div>
                {!tmdbConfigured ? (
                  <FieldDescription className="text-warning">
                    Lipsește cheia TMDB din configurare.
                  </FieldDescription>
                ) : (
                  <FieldDescription>
                    Lipești linkul și apesi Salvează — datele se preiau singure.
                  </FieldDescription>
                )}
                {fetched ? (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-border p-2">
                    {fetched.posterUrl ? (
                      <Image
                        src={fetched.posterUrl}
                        alt=""
                        width={44}
                        height={66}
                        className="rounded"
                      />
                    ) : null}
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-medium">{fetched.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          fetched.genres,
                          fetched.runtimeMin ? `${fetched.runtimeMin} min` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                ) : null}
              </Field>
            )}

            <div className="grid gap-5 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="day">Ziua</FieldLabel>
                <Select value={form.day} onValueChange={(v) => set("day", v)}>
                  <SelectTrigger id="day" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {days.map((d) => (
                        <SelectItem key={d.key} value={d.key}>
                          <span className="capitalize">{d.label}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="time">Ora</FieldLabel>
                <Input
                  id="time"
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => set("time", e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="hall">Sala</FieldLabel>
                <Select value={form.hallId} onValueChange={(v) => set("hallId", v)}>
                  <SelectTrigger id="hall" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {halls.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="is3D">Proiecție 3D</FieldLabel>
                <Switch
                  id="is3D"
                  checked={form.is3D}
                  onCheckedChange={(v) => set("is3D", v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="isDubbed">Dublat în română</FieldLabel>
                <Switch
                  id="isDubbed"
                  checked={form.isDubbed}
                  onCheckedChange={(v) => set("isDubbed", v)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="resOpen">Rezervări deschise</FieldLabel>
                <Switch
                  id="resOpen"
                  checked={form.reservationsOpen}
                  onCheckedChange={(v) => set("reservationsOpen", v)}
                />
              </div>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Renunță
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Salvează
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
