import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Ora proiecției, în forma de pe afișul tipărit: etichetă galbenă, ușor
 * înclinată, așezată peste marginea de sus a posterului.
 */
export function TimeBadge({
  startsAt,
  size = "md",
  className,
}: {
  startsAt: Date | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ticket tilt inline-block rounded-lg bg-brand-yellow px-3 py-0.5 leading-tight text-brand-ink shadow-[0_6px_16px_-6px_rgba(0,0,0,0.75)]",
        size === "sm" && "px-2 text-lg",
        size === "md" && "text-2xl sm:text-3xl",
        size === "lg" && "text-3xl sm:text-4xl",
        className,
      )}
    >
      {formatTime(new Date(startsAt))}
    </span>
  );
}

/** Marcajul 3D din colțul de jos al afișului, înclinat în sens invers. */
export function Badge3D({ className }: { className?: string }) {
  return (
    <Badge
      variant="brand"
      className={cn(
        "ticket tilt-strong absolute bottom-2 right-2 h-auto px-2.5 py-0.5 text-xl leading-none shadow-[0_4px_14px_-4px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      3D
    </Badge>
  );
}
