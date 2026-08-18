import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDayMonth } from "@/lib/dates";

export type Closure = {
  startDate: Date;
  endDate: Date;
  reason: string;
  message: string;
};

/** Anunțul afișat când cinematograful este închis într-un anumit interval. */
export function ClosureBanner({ closure }: { closure: Closure }) {
  const start = new Date(closure.startDate);
  const end = new Date(closure.endDate);
  const sameDay = start.toDateString() === end.toDateString();

  return (
    <div className="border-b border-brand-yellow/25 bg-brand-yellow/5">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6">
        <Alert variant="brand" className="border-0 bg-transparent p-0">
          <Info />
          <AlertTitle>
            {closure.reason} ·{" "}
            {sameDay
              ? formatDayMonth(start)
              : `${formatDayMonth(start)} – ${formatDayMonth(end)}`}
          </AlertTitle>
          <AlertDescription>{closure.message}</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
