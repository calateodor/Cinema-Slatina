import { Armchair, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Capacity } from "@/lib/capacity";
import { cn } from "@/lib/utils";

/**
 * Gradul de ocupare al unei proiecții. Locurile nu se aleg individual —
 * se afișează doar câte sunt ocupate din capacitatea sălii.
 */
export function SeatMeter({
  capacity,
  className,
  showExtra = true,
  compact = false,
}: {
  capacity: Capacity;
  className?: string;
  showExtra?: boolean;
  compact?: boolean;
}) {
  const percent = Math.min(
    100,
    Math.round((capacity.takenBase / capacity.base) * 100),
  );
  const tone =
    percent >= 100
      ? "bg-destructive"
      : percent >= 80
        ? "bg-brand-orange"
        : "bg-brand-yellow";

  return (
    <div
      className={cn("flex w-full flex-col gap-1.5", className)}
      role="group"
      aria-label={`${capacity.takenBase} din ${capacity.base} locuri ocupate`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Armchair className="size-3.5" aria-hidden="true" />
          Locuri ocupate
        </span>
        <span
          className={cn(
            "ticket tabular-nums text-foreground",
            compact ? "text-base" : "text-lg",
          )}
        >
          {capacity.takenBase}
          <span className="text-muted-foreground">/{capacity.base}</span>
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={capacity.takenBase}
        aria-valuemin={0}
        aria-valuemax={capacity.base}
        aria-label="Grad de ocupare"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
            tone,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {showExtra && capacity.extra > 0 ? (
        <Badge
          variant={capacity.extraUnlocked ? "brand" : "outline"}
          className={cn(
            "h-auto w-fit py-1",
            !capacity.extraUnlocked && "text-muted-foreground",
          )}
          title={
            capacity.extraUnlocked
              ? "Sala este plină. S-au deschis scaunele mobile suplimentare."
              : "Scaunele mobile se deschid doar după ocuparea celor 100 de locuri."
          }
        >
          {capacity.extraUnlocked ? (
            <Armchair data-icon="inline-start" aria-hidden="true" />
          ) : (
            <Lock data-icon="inline-start" aria-hidden="true" />
          )}
          {capacity.extraUnlocked
            ? `Scaune suplimentare: ${capacity.takenExtra}/${capacity.extra}`
            : `+${capacity.extra} scaune suplimentare (blocate)`}
        </Badge>
      ) : null}
    </div>
  );
}
