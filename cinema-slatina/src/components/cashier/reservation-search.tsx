"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyRow } from "@/components/staff/ui";
import {
  searchReservations,
  setReservationAdult,
  setReservationStatus,
} from "@/server/actions/reception";
import { RESERVATION_STATUS_LABEL } from "@/lib/constants";
import { formatDateTimeShort } from "@/lib/dates";
import { formatPhone } from "@/lib/format";

type Row = {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  age: number | null;
  isAdult: boolean;
  seats: number;
  status: string;
  movieTitle: string;
  hallName: string;
  startsAt: string;
};

export function ReservationSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [pending, startTransition] = useTransition();

  function run(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await searchReservations(query);
      setRows(result.data ?? []);
    });
  }

  function mark(id: string, status: "CHECKED_IN" | "NO_SHOW" | "CANCELLED") {
    startTransition(async () => {
      const result = await setReservationStatus(id, status);
      if (!result.ok) {
        toast.error(result.message ?? "Nu am putut actualiza rezervarea.");
        return;
      }
      setRows((prev) =>
        prev ? prev.map((r) => (r.id === id ? { ...r, status } : r)) : prev,
      );
      toast.success(RESERVATION_STATUS_LABEL[status]);
      router.refresh();
    });
  }

  function toggleAdult(row: Row) {
    startTransition(async () => {
      await setReservationAdult(row.id, !row.isAdult);
      setRows((prev) =>
        prev
          ? prev.map((r) => (r.id === row.id ? { ...r, isAdult: !r.isAdult } : r))
          : prev,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={run} className="mt-5 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nume, telefon sau cod rezervare"
          className="max-w-md"
          aria-label="Caută rezervare"
          autoFocus
        />
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Search data-icon="inline-start" />
          )}
          Caută
        </Button>
      </form>

      {rows === null ? (
        <EmptyRow>
          Caută după numele spectatorului, numărul de telefon de la care a sunat
          sau codul rezervării.
        </EmptyRow>
      ) : rows.length === 0 ? (
        <EmptyRow>
          Nicio rezervare găsită. Persoana poate intra dacă mai sunt locuri
          libere.
        </EmptyRow>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Card>
                <CardContent className="flex flex-wrap items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.customerName}</p>
                      <Badge variant="secondary" className="font-mono">
                        {row.code}
                      </Badge>
                      <Badge variant={row.isAdult ? "success" : "warning"}>
                        {row.isAdult ? "Adult" : "Minor"}
                        {row.age != null ? ` · ${row.age} ani` : ""}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatPhone(row.phone)} · {row.seats}{" "}
                      {row.seats === 1 ? "loc" : "locuri"} ·{" "}
                      {RESERVATION_STATUS_LABEL[row.status] ?? row.status}
                    </p>
                    <p className="text-sm">
                      {row.movieTitle} · {row.hallName} ·{" "}
{formatDateTimeShort(new Date(row.startsAt))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={pending || row.status === "CHECKED_IN"}
                      onClick={() => mark(row.id, "CHECKED_IN")}
                    >
                      A intrat
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
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
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => mark(row.id, "NO_SHOW")}
                    >
                      Nu s-a prezentat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
