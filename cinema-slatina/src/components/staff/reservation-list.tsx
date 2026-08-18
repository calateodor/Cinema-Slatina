"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, LogIn, Pencil, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyRow } from "@/components/staff/ui";
import {
  setReservationAdult,
  setReservationStatus,
  updateReservationDetails,
} from "@/server/actions/reception";
import {
  RESERVATION_SOURCE_LABEL,
  RESERVATION_STATUS_LABEL,
} from "@/lib/constants";
import { formatDateTimeShort, formatTime } from "@/lib/dates";
import { formatPhone } from "@/lib/format";

export type ReservationRow = {
  id: string;
  code: string;
  customerName: string;
  phone: string | null;
  age: number | null;
  isAdult: boolean;
  seats: number;
  extraSeats: number;
  status: string;
  source: string;
  movieTitle: string;
  hallName: string;
  hallColor: string;
  startsAt: string;
  is3D: boolean;
  isDubbed: boolean;
  ageRating: string | null;
};

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: "warning",
  CONFIRMED: "success",
  CHECKED_IN: "default",
  CANCELLED: "destructive",
  NO_SHOW: "secondary",
};

/** O rezervare luată rapid, căreia încă îi lipsesc datele clientului. */
function isPlaceholder(row: ReservationRow): boolean {
  return !row.phone || row.customerName.startsWith("Client - ");
}

export function ReservationList({
  reservations,
  compact = false,
}: {
  reservations: ReservationRow[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ReservationRow | null>(null);

  function update(
    id: string,
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "NO_SHOW",
  ) {
    startTransition(async () => {
      const result = await setReservationStatus(id, status);
      if (!result.ok) {
        toast.error(result.message ?? "Nu am putut schimba starea.");
        return;
      }
      toast.success(`Rezervare: ${RESERVATION_STATUS_LABEL[status]}.`);
      router.refresh();
    });
  }

  function toggleAdult(row: ReservationRow) {
    startTransition(async () => {
      await setReservationAdult(row.id, !row.isAdult);
      toast.success(!row.isAdult ? "Marcat ca adult." : "Marcat ca minor.");
      router.refresh();
    });
  }

  if (reservations.length === 0) {
    return <EmptyRow>Nicio rezervare de afișat.</EmptyRow>;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {reservations.map((row) => {
          const start = new Date(row.startsAt);
          const incomplete = isPlaceholder(row);
          return (
            <li key={row.id}>
              <Card size="sm">
                <CardContent className="flex flex-wrap items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {/* Proiecția, cu aceleași informații ca în program. */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ticket rounded bg-brand-yellow px-1.5 text-lg leading-tight text-brand-ink">
                        {formatTime(start)}
                      </span>
                      <span className="font-medium">{row.movieTitle}</span>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: `color-mix(in oklch, ${row.hallColor} 45%, transparent)`,
                          color: row.hallColor,
                        }}
                      >
                        {row.hallName}
                      </Badge>
                      {row.is3D ? (
                        <Badge variant="warning">3D</Badge>
                      ) : (
                        <Badge variant="secondary">2D</Badge>
                      )}
                      <Badge variant="secondary">
                        {row.isDubbed ? "Dublat" : "Subtitrat"}
                      </Badge>
                      {row.ageRating ? (
                        <Badge variant="outline">{row.ageRating}</Badge>
                      ) : null}
                    </div>

                    {/* Clientul */}
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={
                          incomplete ? "font-medium text-warning" : "font-medium"
                        }
                      >
                        {row.customerName}
                      </p>
                      <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
                        {RESERVATION_STATUS_LABEL[row.status] ?? row.status}
                      </Badge>
                      <Badge variant={row.isAdult ? "secondary" : "warning"}>
                        {row.isAdult ? "Adult" : "Minor"}
                        {row.age != null ? ` · ${row.age} ani` : ""}
                      </Badge>
                      {incomplete ? (
                        <Badge variant="warning">de completat</Badge>
                      ) : null}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {formatPhone(row.phone)} · {row.seats}{" "}
                      {row.seats === 1 ? "loc" : "locuri"}
                      {row.extraSeats > 0
                        ? ` (${row.extraSeats} pe scaune suplimentare)`
                        : ""}{" "}
                      · cod{" "}
                      <span className="font-mono font-medium text-foreground">
                        {row.code}
                      </span>
                      {!compact
                        ? ` · ${formatDateTimeShort(start)} · ${
                            RESERVATION_SOURCE_LABEL[row.source] ?? row.source
                          }`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={incomplete ? "default" : "outline"}
                      disabled={pending}
                      onClick={() => setEditing(row)}
                    >
                      <Pencil data-icon="inline-start" />
                      {incomplete ? "Completează" : "Editează"}
                    </Button>
                    {row.status !== "CHECKED_IN" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => update(row.id, "CHECKED_IN")}
                      >
                        <LogIn data-icon="inline-start" />
                        Intrat
                      </Button>
                    ) : null}
                    {row.status === "PENDING" ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => update(row.id, "CONFIRMED")}
                      >
                        <Check data-icon="inline-start" />
                        Confirmă
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => toggleAdult(row)}
                    >
                      {row.isAdult ? (
                        <UserX data-icon="inline-start" />
                      ) : (
                        <UserCheck data-icon="inline-start" />
                      )}
                      {row.isAdult ? "Minor" : "Adult"}
                    </Button>
                    {row.status !== "CANCELLED" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => update(row.id, "CANCELLED")}
                        className="text-destructive"
                      >
                        <Ban data-icon="inline-start" />
                        Anulează
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {editing ? (
        <DetailsDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function DetailsDialog({
  row,
  onClose,
  onSaved,
}: {
  row: ReservationRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const placeholder = isPlaceholder(row);
  const [name, setName] = useState(placeholder ? "" : row.customerName);
  const [phone, setPhone] = useState(row.phone ?? "");
  const [age, setAge] = useState(row.age ? String(row.age) : "");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateReservationDetails({
        id: row.id,
        customerName: name,
        phone: phone || null,
        age: age || null,
      });
      if (!result.ok) {
        toast.error(result.message ?? "Nu am putut salva datele.");
        return;
      }
      toast.success("Datele clientului au fost salvate.");
      onSaved();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {placeholder ? "Completează clientul" : "Editează rezervarea"}
          </DialogTitle>
          <DialogDescription>
            {row.movieTitle} · {formatTime(new Date(row.startsAt))} ·{" "}
            {row.hallName} · {row.seats} {row.seats === 1 ? "loc" : "locuri"}
            {placeholder
              ? ` · apel la ${row.customerName.replace("Client - ", "")}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="dn">Nume client</FieldLabel>
              <Input
                id="dn"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nume și prenume"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="dp">Telefon</FieldLabel>
                <Input
                  id="dp"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="da">Vârsta</FieldLabel>
                <Input
                  id="da"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            </div>
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
