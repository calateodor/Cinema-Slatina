"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Clapperboard, MonitorCheck, MonitorX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getTrailerStatus, requestTrailers, type TrailerStatus } from "@/server/actions/trailers";

/** Cât de des se reîmprospătează: des cât lucrează agentul, rar în rest. */
const FAST_MS = 3_000;
const SLOW_MS = 20_000;

function ago(iso: string | null) {
  if (!iso) return "niciodată";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `acum ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `acum ${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `acum ${h} h` : `acum ${Math.round(h / 24)} zile`;
}

/**
 * „Pune trailerele”: trimite o cerere agentului de pe calculator, care trage
 * clipurile de pe YouTube și le pune pe televizoarele sălilor. Arată dacă
 * agentul e pornit, ce trailere lipsesc și jurnalul ultimei cereri, live.
 */
export function TrailerPanel({ initial }: { initial: TrailerStatus }) {
  const [status, setStatus] = useState(initial);
  const [pending, startTransition] = useTransition();
  const logRef = useRef<HTMLPreElement>(null);

  const active = status.job?.status === "PENDING" || status.job?.status === "RUNNING";
  const missing = status.movies.filter((m) => m.state === "lipsa").length;

  const refresh = useCallback(async () => {
    try {
      setStatus(await getTrailerStatus());
    } catch {
      // o reîmprospătare ratată nu contează; încercăm iar la următoarea
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(refresh, active ? FAST_MS : SLOW_MS);
    return () => window.clearInterval(id);
  }, [refresh, active]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [status.job?.log.length]);

  function start() {
    startTransition(async () => {
      const result = await requestTrailers();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      await refresh();
    });
  }

  const job = status.job;
  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clapperboard className="size-4" aria-hidden="true" />
            Trailere pentru televizoare
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pentru filmele cu proiecții de azi încolo (inclusiv săptămâna pregătită): clipul se ia de pe
            YouTube, din linkul filmului, și ajunge pe televizoarele sălilor în cel mult un minut.
          </p>
        </div>
        <Button onClick={start} disabled={pending || active} className="shrink-0">
          {pending || active ? <Spinner data-icon="inline-start" /> : null}
          {status.job?.status === "PENDING" ? "Așteaptă calculatorul…" : active ? "Se pun trailerele…" : "Pune trailerele"}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {status.agent.online ? (
          <Badge variant="success">
            <MonitorCheck data-icon="inline-start" />
            Calculatorul de trailere e pornit
          </Badge>
        ) : (
          <Badge variant="warning">
            <MonitorX data-icon="inline-start" />
            Calculatorul de trailere e oprit · văzut {ago(status.agent.lastSeen)}
          </Badge>
        )}
        <Badge variant={missing ? "outline" : "success"}>
          {missing ? `${missing} filme fără trailer pe televizoare` : "Toate filmele au trailer"}
        </Badge>
      </div>

      {!status.agent.online && (active || missing > 0) ? (
        <p className="mt-3 text-sm text-warning">
          Cererea rămâne în așteptare și pornește singură când calculatorul e deschis
          {status.agent.host ? ` (${status.agent.host})` : ""}.
        </p>
      ) : null}

      {status.movies.length ? (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {status.movies.map((m) => (
            <li key={m.title}>
              <Badge variant={m.state === "pus" ? "success" : m.state === "lipsa" ? "outline" : "warning"}>
                {m.state === "pus" ? "✓" : m.state === "lipsa" ? "○" : "!"} {m.title}
                {m.state === "fara-link" ? " · fără link YouTube" : ""}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      {job ? (
        <div className="mt-4">
          <p className="text-sm font-medium">
            Ultima cerere · {ago(job.createdAt)} ·{" "}
            {job.status === "PENDING"
              ? "în așteptare"
              : job.status === "RUNNING"
                ? "în lucru"
                : job.status === "DONE"
                  ? "gata"
                  : "eșuată"}
            {job.summary ? <span className="font-normal text-muted-foreground"> — {job.summary}</span> : null}
          </p>
          {job.log.length ? (
            <pre
              ref={logRef}
              className="mt-2 max-h-56 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
            >
              {job.log.join("\n")}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
