"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyRow } from "@/components/staff/ui";
import {
  copyWeek,
  deleteScreening,
  publishWeek,
  saveScreening,
} from "@/server/actions/admin";
import { dayKey, formatTime, formatWeekRange } from "@/lib/dates";

export type ScheduleScreening = {
  id: string;
  movieId: string;
  hallId: string;
  startsAt: string; // ISO
  is3D: boolean;
  isDubbed: boolean;
  reservationsOpen: boolean;
  allowExtraSeats: boolean;
  capacityOverride: number | null;
  isCancelled: boolean;
  note: string | null;
  movieTitle: string;
  hallName: string;
  hallColor: string;
  reservedSeats: number;
};

type Props = {
  weekStartIso: string;
  prevWeekIso: string;
  nextWeekIso: string;
  thisWeekIso: string;
  isPublished: boolean;
  screenings: ScheduleScreening[];
  movies: { id: string; title: string }[];
  halls: { id: string; name: string }[];
  /** Zilele săptămânii, yyyy-MM-dd, în ordine. */
  days: { key: string; label: string }[];
};

type FormState = {
  id?: string;
  movieId: string;
  hallId: string;
  date: string;
  time: string;
  is3D: boolean;
  isDubbed: boolean;
  reservationsOpen: boolean;
  allowExtraSeats: boolean;
  capacityOverride: string;
  note: string;
};

export function ScheduleManager({
  weekStartIso,
  prevWeekIso,
  nextWeekIso,
  thisWeekIso,
  isPublished,
  screenings,
  movies,
  halls,
  days,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(days[0]?.key ?? ""));

  function emptyForm(date: string): FormState {
    return {
      movieId: movies[0]?.id ?? "",
      hallId: halls[0]?.id ?? "",
      date,
      time: "15:00",
      is3D: false,
      isDubbed: true,
      reservationsOpen: true,
      allowExtraSeats: true,
      capacityOverride: "",
      note: "",
    };
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goToWeek(iso: string) {
    router.push(`/admin/program?saptamana=${iso.slice(0, 10)}`);
  }

  function openNew(date: string) {
    setForm(emptyForm(date));
    setOpen(true);
  }

  function openEdit(s: ScheduleScreening) {
    const d = new Date(s.startsAt);
    setForm({
      id: s.id,
      movieId: s.movieId,
      hallId: s.hallId,
      date: toDateInput(d),
      time: toTimeInput(d),
      is3D: s.is3D,
      isDubbed: s.isDubbed,
      reservationsOpen: s.reservationsOpen,
      allowExtraSeats: s.allowExtraSeats,
      capacityOverride: s.capacityOverride ? String(s.capacityOverride) : "",
      note: s.note ?? "",
    });
    setOpen(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveScreening({
        ...form,
        capacityOverride: form.capacityOverride || null,
      });
      if (!result.ok) {
        toast.error(result.message ?? "Proiecția nu a putut fi salvată.");
        return;
      }
      toast.success(form.id ? "Proiecție actualizată." : "Proiecție adăugată.");
      setOpen(false);
      router.refresh();
    });
  }

  function remove(s: ScheduleScreening) {
    if (!confirm(`Ștergi proiecția „${s.movieTitle}” de la ${toTimeInput(new Date(s.startsAt))}?`))
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

  function togglePublish() {
    startTransition(async () => {
      await publishWeek(weekStartIso, !isPublished);
      toast.success(
        !isPublished
          ? "Programul este acum vizibil pe site."
          : "Programul a fost retras de pe site.",
      );
      router.refresh();
    });
  }

  function duplicatePreviousWeek() {
    startTransition(async () => {
      const result = await copyWeek(prevWeekIso, weekStartIso);
      if (!result.ok) {
        toast.error(result.message ?? "Nu am putut copia programul.");
        return;
      }
      toast.success(`Am copiat ${result.data?.copied ?? 0} proiecții.`);
      router.refresh();
    });
  }

  const byDay = new Map<string, ScheduleScreening[]>();
  for (const s of screenings) {
    const key = toDateInput(new Date(s.startsAt));
    const list = byDay.get(key) ?? [];
    list.push(s);
    byDay.set(key, list);
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToWeek(prevWeekIso)}
          aria-label="Săptămâna anterioară"
        >
          <ChevronLeft />
        </Button>
        <div className="min-w-0">
          <p className="font-medium">{formatWeekRange(new Date(weekStartIso))}</p>
          <p className="text-xs text-muted-foreground">
            {weekStartIso.slice(0, 10) === thisWeekIso.slice(0, 10)
              ? "Săptămâna curentă"
              : "Altă săptămână"}{" "}
            · {screenings.length} proiecții
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goToWeek(nextWeekIso)}
          aria-label="Săptămâna următoare"
        >
          <ChevronRight />
        </Button>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={duplicatePreviousWeek}
            disabled={pending}
            className="gap-2"
          >
            <Copy data-icon="inline-start" />
            Copiază săptămâna trecută
          </Button>
          <Button onClick={togglePublish} disabled={pending} className="gap-2">
            {isPublished ? (
              <EyeOff data-icon="inline-start" />
            ) : (
              <Eye data-icon="inline-start" />
            )}
            {isPublished ? "Retrage de pe site" : "Publică programul"}
          </Button>
        </div>
      </div>

      <p
        className={`mt-3 rounded-lg border p-3 text-sm ${
          isPublished
            ? "border-success/40 bg-success/10 text-success"
            : "border-warning/40 bg-warning/10 text-warning"
        }`}
      >
        {isPublished
          ? "Programul acestei săptămâni este vizibil publicului."
          : 'Programul nu este publicat. Pe site apare mesajul „Programul nu este încă stabilit”.'}
      </p>

      <div className="mt-5 gap-4">
        {days.map((day) => {
          const list = (byDay.get(day.key) ?? []).sort((a, b) =>
            a.startsAt.localeCompare(b.startsAt),
          );
          return (
            <section key={day.key} className="rounded-xl border border-border bg-card">
              <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <h2 className="text-sm font-semibold first-letter:uppercase">{day.label}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openNew(day.key)}
                  className="gap-1.5"
                >
                  <Plus data-icon="inline-start" />
                  Adaugă
                </Button>
              </header>

              {list.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                  Nicio proiecție în această zi.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {list.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-12 shrink-0 font-semibold tabular-nums">
                        {toTimeInput(new Date(s.startsAt))}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {s.movieTitle}
                          {s.isCancelled ? (
                            <span className="ml-2 text-xs text-destructive">
                              anulată
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span style={{ color: s.hallColor }}>{s.hallName}</span>
                          {" · "}
                          {s.is3D ? "3D" : "2D"}
                          {" · "}
                          {s.isDubbed ? "Dublat" : "Subtitrat"}
                          {" · "}
                          {s.reservedSeats} locuri rezervate
                          {!s.reservationsOpen ? " · rezervări închise" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(s)}
                        aria-label="Editează proiecția"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(s)}
                        aria-label="Șterge proiecția"
                        className="text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {movies.length === 0 ? (
        <div className="mt-4">
          <EmptyRow>
            Adaugă întâi filme din secțiunea „Filme”, apoi le poți pune în program.
          </EmptyRow>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editează proiecția" : "Proiecție nouă"}
            </DialogTitle>
            <DialogDescription>
              Alege filmul, sala și ora. Bifează 3D dacă proiecția este
              tridimensională.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="movie">Film</FieldLabel>
                <Select value={form.movieId} onValueChange={(v) => set("movieId", v)}>
                  <SelectTrigger id="movie" className="w-full">
                    <SelectValue placeholder="Alege filmul" />
                  </SelectTrigger>
                  <SelectContent>
                    {movies.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="hall">Sala</FieldLabel>
                  <Select value={form.hallId} onValueChange={(v) => set("hallId", v)}>
                    <SelectTrigger id="hall" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {halls.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="date">Data</FieldLabel>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                  />
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
              </div>

              <div className="gap-3 rounded-xl border border-border p-4">
                <ToggleRow
                  id="is3D"
                  label="Proiecție 3D"
                  hint="Apare cu eticheta 3D pe site și la casierie."
                  checked={form.is3D}
                  onChange={(v) => set("is3D", v)}
                />
                <ToggleRow
                  id="isDubbed"
                  label="Dublat în română"
                  hint="Dacă e oprit, filmul apare ca subtitrat."
                  checked={form.isDubbed}
                  onChange={(v) => set("isDubbed", v)}
                />
                <ToggleRow
                  id="reservationsOpen"
                  label="Rezervări deschise"
                  hint="Oprește dacă vrei să blochezi rezervările doar pentru această oră."
                  checked={form.reservationsOpen}
                  onChange={(v) => set("reservationsOpen", v)}
                />
                <ToggleRow
                  id="allowExtraSeats"
                  label="Permite scaunele suplimentare"
                  hint="Cele 20 de scaune mobile se deschid după ocuparea celor 100 fixe."
                  checked={form.allowExtraSeats}
                  onChange={(v) => set("allowExtraSeats", v)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="capacity">Capacitate diferită (opțional)</FieldLabel>
                  <Input
                    id="capacity"
                    inputMode="numeric"
                    placeholder="implicit 100"
                    value={form.capacityOverride}
                    onChange={(e) =>
                      set("capacityOverride", e.target.value.replace(/\D/g, ""))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="note">Notă internă</FieldLabel>
                  <Textarea
                    id="note"
                    rows={2}
                    value={form.note}
                    onChange={(e) => set("note", e.target.value)}
                  />
                </Field>
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

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </Field>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Data și ora se editează în ora României, oricare ar fi fusul serverului. */
function toDateInput(date: Date): string {
  return dayKey(date);
}

function toTimeInput(date: Date): string {
  return formatTime(date);
}
