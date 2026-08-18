"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Glasses, PhoneCall, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { EmptyRow } from "@/components/staff/ui";
import {
  closeCallTicket,
  confirmCallTicket,
  createCallTicket,
  deleteCallTicket,
  updateCallTicket,
} from "@/server/actions/reception";
import { ADULT_AGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type DeskScreening = {
  id: string;
  startsAt: string;
  movieTitle: string;
  hallName: string;
  hallColor: string;
  is3D: boolean;
  isDubbed: boolean;
  ageRating: string | null;
  taken: number;
  base: number;
  extra: number;
};

export type DeskTicket = {
  id: string;
  label: string;
  customerName: string | null;
  phone: string | null;
  age: number | null;
  isAdult: boolean | null;
  seats: number;
  screeningId: string | null;
  note: string | null;
  createdAt: string;
};

function time(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CashierDesk({
  screenings,
  tickets,
  dayLabel,
}: {
  screenings: DeskScreening[];
  tickets: DeskTicket[];
  dayLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(screenings[0]?.id ?? "");

  function addClient() {
    startTransition(async () => {
      const result = await createCallTicket(selected || undefined);
      if (!result.ok) {
        toast.error(result.message ?? "Nu am putut adăuga clientul.");
        return;
      }
      toast.success(`Bon creat: ${result.data?.label}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Proiecțiile zilei</h2>
          <span className="text-xs text-muted-foreground first-letter:uppercase">
            {dayLabel}
          </span>
        </div>

        {screenings.length === 0 ? (
          <EmptyRow>Nu există proiecții programate pentru această zi.</EmptyRow>
        ) : (
          <ul className="flex flex-col gap-2">
            {screenings.map((s) => {
              const active = s.id === selected;
              const full = s.taken >= s.base;
              return (
                <li key={s.id}>
                  <Card
                    size="sm"
                    className={cn(
                      "transition-shadow motion-reduce:transition-none",
                      active ? "bg-primary/5 ring-primary" : "hover:ring-primary/40",
                    )}
                  >
                    <CardContent>
                      <button
                        type="button"
                        onClick={() => setSelected(s.id)}
                        aria-pressed={active}
                        className="w-full text-left"
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-lg font-semibold tabular-nums">
                            {time(s.startsAt)}
                          </span>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: `color-mix(in oklch, ${s.hallColor} 45%, transparent)`,
                              backgroundColor: `color-mix(in oklch, ${s.hallColor} 12%, transparent)`,
                              color: s.hallColor,
                            }}
                          >
                            {s.hallName}
                          </Badge>
                          {s.is3D ? (
                            <Badge variant="warning">
                              <Glasses data-icon="inline-start" />
                              3D
                            </Badge>
                          ) : (
                            <Badge variant="secondary">2D</Badge>
                          )}
                          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                            {s.taken}/{s.base}
                          </span>
                        </div>
                        <p className="mt-1 font-medium">{s.movieTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.isDubbed ? "Dublat" : "Subtitrat"}
                          {s.ageRating ? ` · ${s.ageRating}` : ""}
                          {full
                            ? ` · sala plină, ${Math.max(0, s.taken - s.base)}/${s.extra} scaune suplimentare`
                            : ""}
                        </p>
                      </button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Clienți la telefon</h2>
          <Button onClick={addClient} disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <UserPlus data-icon="inline-start" />
            )}
            Adaugă client
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Butonul creează un bon cu ora exactă a apelului. Completezi numele și
          numărul după ce închizi telefonul, apoi confirmi rezervarea.
        </p>

        {tickets.length === 0 ? (
          <EmptyRow>
            Niciun client în așteptare. Apasă „Adaugă client” când sună
            telefonul.
          </EmptyRow>
        ) : (
          <ul className="flex flex-col gap-3">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                screenings={screenings}
                defaultScreeningId={selected}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TicketCard({
  ticket,
  screenings,
  defaultScreeningId,
}: {
  ticket: DeskTicket;
  screenings: DeskScreening[];
  defaultScreeningId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(ticket.customerName ?? "");
  const [phone, setPhone] = useState(ticket.phone ?? "");
  const [age, setAge] = useState(ticket.age ? String(ticket.age) : "");
  const [seats, setSeats] = useState(String(ticket.seats));
  const [screeningId, setScreeningId] = useState(
    ticket.screeningId ?? defaultScreeningId,
  );

  const isAdult = age ? Number(age) >= ADULT_AGE : null;

  function persist() {
    startTransition(async () => {
      await updateCallTicket({
        id: ticket.id,
        customerName: name,
        phone,
        age: age || null,
        seats,
        screeningId,
      });
    });
  }

  function confirm() {
    startTransition(async () => {
      await updateCallTicket({
        id: ticket.id,
        customerName: name,
        phone,
        age: age || null,
        seats,
        screeningId,
      });
      const result = await confirmCallTicket(ticket.id);
      if (!result.ok) {
        toast.error(result.message ?? "Rezervarea nu a putut fi creată.");
        return;
      }
      toast.success(`Rezervare confirmată · cod ${result.data?.code}`);
      router.refresh();
    });
  }

  function dismiss() {
    startTransition(async () => {
      await closeCallTicket(ticket.id);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteCallTicket(ticket.id);
      router.refresh();
    });
  }

  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <PhoneCall className="size-4 text-primary" aria-hidden="true" />
            <p className="font-semibold">{ticket.label}</p>
            {isAdult !== null ? (
              <Badge
                variant={isAdult ? "success" : "warning"}
                className="ml-auto"
              >
                {isAdult ? "Adult" : "Minor"}
              </Badge>
            ) : null}
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`name-${ticket.id}`}>Nume client</FieldLabel>
              <Input
                id={`name-${ticket.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={persist}
                placeholder="Nume și prenume"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`phone-${ticket.id}`}>Telefon</FieldLabel>
                <Input
                  id={`phone-${ticket.id}`}
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={persist}
                  placeholder="07XX XXX XXX"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor={`age-${ticket.id}`}>Vârsta</FieldLabel>
                  <Input
                    id={`age-${ticket.id}`}
                    inputMode="numeric"
                    value={age}
                    onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                    onBlur={persist}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`seats-${ticket.id}`}>Locuri</FieldLabel>
                  <Input
                    id={`seats-${ticket.id}`}
                    inputMode="numeric"
                    value={seats}
                    onChange={(e) =>
                      setSeats(e.target.value.replace(/\D/g, "") || "1")
                    }
                    onBlur={persist}
                  />
                </Field>
              </div>
            </div>

            <Field>
              <FieldLabel htmlFor={`screening-${ticket.id}`}>
                Proiecția
              </FieldLabel>
              <Select
                value={screeningId}
                onValueChange={(v) => {
                  setScreeningId(v);
                  startTransition(async () => {
                    await updateCallTicket({ id: ticket.id, screeningId: v });
                  });
                }}
              >
                <SelectTrigger
                  id={`screening-${ticket.id}`}
                  className="w-full"
                >
                  <SelectValue placeholder="Alege proiecția" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {screenings.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {time(s.startsAt)} · {s.movieTitle} · {s.hallName}
                        {s.is3D ? " · 3D" : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap gap-2">
            <Button onClick={confirm} disabled={pending}>
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Check data-icon="inline-start" />
              )}
              Confirmă rezervarea
            </Button>
            <Button variant="ghost" onClick={dismiss} disabled={pending}>
              Închide bonul
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={remove}
              disabled={pending}
              aria-label="Șterge bonul"
              className="ml-auto text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
