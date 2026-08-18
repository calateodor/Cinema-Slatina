"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

/**
 * Ora se alege din două liste, în format de 24 de ore. Nu folosim câmpul
 * nativ `type="time"`, fiindcă pe telefon afișează AM/PM și e ușor să salvezi
 * 03:00 în loc de 15:00.
 */
export function TimePicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const [hour = "19", minute = "00"] = value.split(":");
  const safeMinute = MINUTES.includes(minute) ? minute : "00";

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={(h) => onChange(`${h}:${safeMinute}`)}>
        <SelectTrigger id={id} className="ticket w-24 text-xl" aria-label="Ora">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h} className="ticket text-lg">
                {h}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <span className="ticket text-2xl text-muted-foreground">:</span>

      <Select
        value={safeMinute}
        onValueChange={(m) => onChange(`${hour}:${m}`)}
      >
        <SelectTrigger className="ticket w-24 text-xl" aria-label="Minutul">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m} className="ticket text-lg">
                {m}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
