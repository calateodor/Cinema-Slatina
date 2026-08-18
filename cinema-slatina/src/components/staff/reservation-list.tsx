"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, LogIn, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyRow } from "@/components/staff/ui";
import {
  setReservationAdult,
  setReservationStatus,
} from "@/server/actions/reception";
import {
  RESERVATION_SOURCE_LABEL,
  RESERVATION_STATUS_LABEL,
} from "@/lib/constants";
import { formatPhone } from "@/lib/format";

export type ReservationRow = {
  id: string;
  code: string;
  customerName: string;
  phone: string;
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
};

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: "warning",
  CONFIRMED: "success",
  CHECKED_IN: "default",
  CANCELLED: "destructive",
  NO_SHOW: "secondary",
};

export function ReservationList({
  reservations,
  compact = false,
}: {
  reservations: ReservationRow[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
    <ul className="flex flex-col gap-2">
      {reservations.map((row) => {
        const start = new Date(row.startsAt);
        return (
          <li key={row.id}>
            <Card size="sm">
              <CardContent className="flex flex-wrap items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{row.customerName}</p>
                    <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
                      {RESERVATION_STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                    <Badge variant={row.isAdult ? "secondary" : "warning"}>
                      {row.isAdult ? "Adult" : "Minor"}
                      {row.age != null ? ` · ${row.age} ani` : ""}
                    </Badge>
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
                  </p>

                  {!compact ? (
                    <p className="text-sm">
                      <span className="font-medium">{row.movieTitle}</span>
                      {" · "}
                      <span style={{ color: row.hallColor }}>{row.hallName}</span>
                      {" · "}
                      {start.toLocaleString("ro-RO", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {RESERVATION_SOURCE_LABEL[row.source] ?? row.source}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
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
  );
}
