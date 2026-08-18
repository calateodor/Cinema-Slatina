"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyRow } from "@/components/staff/ui";
import { deleteClosure, saveClosure } from "@/server/actions/admin";

export type ClosureRow = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  message: string;
  isActive: boolean;
};

type FormState = {
  id?: string;
  startDate: string;
  endDate: string;
  reason: string;
  message: string;
  isActive: boolean;
};

const TEMPLATE =
  "Ne pare rău, în această perioadă cinematograful este închis. Redeschidem pe {data} și vă așteptăm cu drag la film.";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: FormState = {
  startDate: today(),
  endDate: today(),
  reason: "",
  message: TEMPLATE,
  isActive: true,
};

export function ClosureManager({ closures }: { closures: ClosureRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openNew() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(row: ClosureRow) {
    setForm({
      id: row.id,
      startDate: row.startDate.slice(0, 10),
      endDate: row.endDate.slice(0, 10),
      reason: row.reason,
      message: row.message,
      isActive: row.isActive,
    });
    setOpen(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveClosure(form);
      if (!result.ok) {
        toast.error(result.message ?? "Anunțul nu a putut fi salvat.");
        return;
      }
      toast.success(form.id ? "Anunț actualizat." : "Anunț publicat.");
      setOpen(false);
      router.refresh();
    });
  }

  function remove(row: ClosureRow) {
    if (!confirm("Ștergi acest anunț?")) return;
    startTransition(async () => {
      await deleteClosure(row.id);
      toast.success("Anunț șters.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <Button onClick={openNew} className="gap-2">
          <Plus data-icon="inline-start" />
          Anunț nou
        </Button>
      </div>

      {closures.length === 0 ? (
        <div className="mt-4">
          <EmptyRow>
            Niciun anunț. Adaugă unul când cinematograful este închis într-o
            anumită perioadă.
          </EmptyRow>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {closures.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {row.reason}
                  {!row.isActive ? (
                    <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                      inactiv
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(row.startDate).toLocaleDateString("ro-RO")} –{" "}
                  {new Date(row.endDate).toLocaleDateString("ro-RO")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{row.message}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEdit(row)}
                aria-label="Editează anunțul"
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(row)}
                aria-label="Șterge anunțul"
                className="text-destructive"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editează anunțul" : "Anunț de închidere"}
            </DialogTitle>
            <DialogDescription>
              Mesajul apare în capul site-ului, pe toate paginile publice.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="startDate">Din data</FieldLabel>
                  <Input
                    id="startDate"
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="endDate">Până în data</FieldLabel>
                  <Input
                    id="endDate"
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="reason">Motiv (titlu scurt)</FieldLabel>
                <Input
                  id="reason"
                  required
                  value={form.reason}
                  onChange={(e) => set("reason", e.target.value)}
                  placeholder="Lucrări de mentenanță"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="message">Mesajul pentru public</FieldLabel>
                <Textarea
                  id="message"
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => set("message", TEMPLATE)}
                  className="mt-1.5 text-xs text-primary hover:underline"
                >
                  Folosește mesajul standard
                </button>
              </Field>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
                <Field>
                  <FieldLabel htmlFor="isActive">Anunț activ</FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Dezactivează-l ca să îl păstrezi fără să apară pe site.
                  </p>
                </Field>
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(v) => set("isActive", v)}
                />
              </div>

            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Renunță
              </Button>
              <Button type="submit" disabled={pending} className="gap-2">
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Salvează
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
