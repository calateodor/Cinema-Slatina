"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, PhoneCall, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
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
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyRow } from "@/components/staff/ui";
import {
  ReservationList,
  type ReservationRow,
} from "@/components/staff/reservation-list";
import { createDeskReservation } from "@/server/actions/reception";
import { Badge3D, TimeBadge } from "@/components/site/showtime-badges";
import { formatLongDate, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type DeskScreening = {
  id: string;
  startsAt: string;
  movieTitle: string;
  posterUrl: string | null;
  ageRating: string | null;
  hallName: string;
  hallColor: string;
  is3D: boolean;
  isDubbed: boolean;
  taken: number;
  base: number;
  extra: number;
  reservationsOpen: boolean;
};

export function CashierDesk({
  screenings,
  reservations,
}: {
  screenings: DeskScreening[];
  reservations: ReservationRow[];
}) {
  const [selected, setSelected] = useState<DeskScreening | null>(null);

  const incomplete = reservations.filter(
    (r) => !r.phone || r.customerName.startsWith("Client - "),
  ).length;

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">
            Apasă pe film ca să faci o rezervare
          </h2>
          <span className="text-sm text-muted-foreground">
            {screenings.length} proiecții azi
          </span>
        </div>

        {screenings.length === 0 ? (
          <EmptyRow>
            Nu există proiecții programate azi. Programul se face din panoul de
            administrare.
          </EmptyRow>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {screenings.map((s) => (
              <ScreeningCard
                key={s.id}
                screening={s}
                onClick={() => setSelected(s)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Rezervările de azi</h2>
          {incomplete > 0 ? (
            <Badge variant="warning">
              {incomplete}{" "}
              {incomplete === 1 ? "de completat" : "de completat"}
            </Badge>
          ) : null}
        </div>
        <ReservationList reservations={reservations} compact />
      </section>

      {selected ? (
        <ReservationDialog
          screening={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

function ScreeningCard({
  screening,
  onClick,
}: {
  screening: DeskScreening;
  onClick: () => void;
}) {
  const full = screening.taken >= screening.base;
  const percent = Math.min(
    100,
    Math.round((Math.min(screening.taken, screening.base) / screening.base) * 100),
  );

  return (
    <article className="group flex flex-col">
      <div className="relative z-10 -mb-3 flex justify-center">
        <TimeBadge startsAt={screening.startsAt} />
      </div>

      <button
        type="button"
        onClick={onClick}
        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-secondary ring-1 ring-border transition-shadow hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
        aria-label={`Rezervă la ${screening.movieTitle}, ora ${formatTime(new Date(screening.startsAt))}`}
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
        {screening.is3D ? <Badge3D /> : null}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-center text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none">
          Rezervă aici
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
          {screening.ageRating ? (
            <Badge variant="outline">{screening.ageRating}</Badge>
          ) : null}
        </div>
        <div>
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>Locuri</span>
            <span className="ticket text-sm tabular-nums text-foreground">
              {Math.min(screening.taken, screening.base)}
              <span className="text-muted-foreground">/{screening.base}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                full
                  ? "bg-destructive"
                  : percent >= 80
                    ? "bg-brand-orange"
                    : "bg-success",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          {screening.taken > screening.base ? (
            <p className="mt-1 text-[0.7rem] text-warning">
              Scaune suplimentare: {screening.taken - screening.base}/{screening.extra}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ReservationDialog({
  screening,
  onClose,
}: {
  screening: DeskScreening;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"rapid" | "complet">("rapid");
  const [seats, setSeats] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [pending, startTransition] = useTransition();

  const start = new Date(screening.startsAt);
  const free = Math.max(0, screening.base + screening.extra - screening.taken);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createDeskReservation({
        screeningId: screening.id,
        seats,
        customerName: mode === "complet" ? name : null,
        phone: mode === "complet" ? phone || null : null,
        age: mode === "complet" ? age || null : null,
      });
      if (!result.ok) {
        toast.error(result.message ?? "Rezervarea nu a putut fi creată.");
        return;
      }
      toast.success(
        mode === "rapid"
          ? `Rezervat: ${result.data?.label} · cod ${result.data?.code}`
          : `Rezervare pentru ${name} · cod ${result.data?.code}`,
      );
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{screening.movieTitle}</DialogTitle>
          <DialogDescription className="first-letter:uppercase">
            {formatLongDate(start)}, ora {formatTime(start)} · {screening.hallName}{" "}
            · {screening.is3D ? "3D" : "2D"} ·{" "}
            {screening.isDubbed ? "dublat" : "subtitrat"}
            {screening.ageRating ? ` · ${screening.ageRating}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel>Număr de locuri</FieldLabel>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSeats((s) => Math.max(1, s - 1))}
                  disabled={seats <= 1}
                  aria-label="Un loc mai puțin"
                >
                  <Minus />
                </Button>
                <span className="ticket min-w-16 text-center text-4xl tabular-nums">
                  {seats}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSeats((s) => Math.min(free, s + 1))}
                  disabled={seats >= free}
                  aria-label="Încă un loc"
                >
                  <Plus />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {free} locuri libere
                </span>
              </div>
            </Field>

            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as "rapid" | "complet")}
              variant="outline"
              className="w-full"
            >
              <ToggleGroupItem value="rapid" className="flex-1">
                <Zap data-icon="inline-start" />
                Rapid
              </ToggleGroupItem>
              <ToggleGroupItem value="complet" className="flex-1">
                <PhoneCall data-icon="inline-start" />
                Cu date complete
              </ToggleGroupItem>
            </ToggleGroup>

            {mode === "rapid" ? (
              <FieldDescription>
                Se salvează pe loc, sub un nume de forma{" "}
                <span className="font-mono">Client - zi/oră/minut/secundă</span>.
                Locurile sunt reținute imediat, iar numele și telefonul le
                completezi mai jos, din lista rezervărilor, când ai timp.
              </FieldDescription>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="cn">Nume client</FieldLabel>
                  <Input
                    id="cn"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nume și prenume"
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="cp">Telefon</FieldLabel>
                    <Input
                      id="cp"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ca">Vârsta</FieldLabel>
                    <Input
                      id="ca"
                      inputMode="numeric"
                      value={age}
                      onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                    />
                  </Field>
                </div>
              </>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={pending}
            >
              Renunță
            </Button>
            <Button type="submit" disabled={pending || free < seats}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Confirmă rezervarea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
