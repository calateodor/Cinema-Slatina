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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyRow } from "@/components/staff/ui";
import { deleteMenuItem, saveMenuItem } from "@/server/actions/admin";
import { formatPrice } from "@/lib/format";

export type MenuRow = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  priceBani: number;
  isAvailable: boolean;
  sortOrder: number;
};

type FormState = {
  id?: string;
  category: string;
  name: string;
  description: string;
  price: string;
  isAvailable: boolean;
  sortOrder: string;
};

const EMPTY: FormState = {
  category: "",
  name: "",
  description: "",
  price: "",
  isAvailable: true,
  sortOrder: "0",
};

export function MenuManager({ items }: { items: MenuRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, startTransition] = useTransition();

  const categories = [...new Set(items.map((i) => i.category))];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openNew() {
    setForm({ ...EMPTY, category: categories[0] ?? "" });
    setOpen(true);
  }

  function openEdit(item: MenuRow) {
    setForm({
      id: item.id,
      category: item.category,
      name: item.name,
      description: item.description ?? "",
      price: (item.priceBani / 100).toFixed(2).replace(".", ","),
      isAvailable: item.isAvailable,
      sortOrder: String(item.sortOrder),
    });
    setOpen(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveMenuItem(form);
      if (!result.ok) {
        toast.error(result.message ?? "Produsul nu a putut fi salvat.");
        return;
      }
      toast.success(form.id ? "Produs actualizat." : "Produs adăugat.");
      setOpen(false);
      router.refresh();
    });
  }

  function remove(item: MenuRow) {
    if (!confirm(`Ștergi „${item.name}” din meniu?`)) return;
    startTransition(async () => {
      await deleteMenuItem(item.id);
      toast.success("Produs șters.");
      router.refresh();
    });
  }

  const grouped = categories.map((category) => ({
    category,
    rows: items.filter((i) => i.category === category),
  }));

  return (
    <>
      <div className="mt-6 flex justify-end">
        <Button onClick={openNew} className="gap-2">
          <Plus data-icon="inline-start" />
          Adaugă produs
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyRow>Meniul barului este gol.</EmptyRow>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {grouped.map((group) => (
            <section
              key={group.category}
              className="rounded-xl border border-border bg-card"
            >
              <h2 className="border-b border-border px-4 py-2.5 text-sm font-semibold">
                {group.category}
              </h2>
              <ul className="divide-y divide-border">
                {group.rows.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {item.name}
                        {!item.isAvailable ? (
                          <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                            indisponibil
                          </span>
                        ) : null}
                      </p>
                      {item.description ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatPrice(item.priceBani)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(item)}
                      aria-label={`Editează ${item.name}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(item)}
                      aria-label={`Șterge ${item.name}`}
                      className="text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editează produsul" : "Produs nou"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="category">Categorie</FieldLabel>
                  <Input
                    id="category"
                    required
                    list="menu-categories"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    placeholder="Ochelari 3D"
                  />
                  <datalist id="menu-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field>
                  <FieldLabel htmlFor="price">Preț (lei)</FieldLabel>
                  <Input
                    id="price"
                    required
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="12,50"
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="name">Denumire</FieldLabel>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Descriere (opțional)</FieldLabel>
                <Textarea
                  id="description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="sortOrder">Ordine afișare</FieldLabel>
                  <Input
                    id="sortOrder"
                    inputMode="numeric"
                    value={form.sortOrder}
                    onChange={(e) =>
                      set("sortOrder", e.target.value.replace(/[^\d-]/g, ""))
                    }
                  />
                </Field>
                <div className="flex items-end justify-between gap-4 rounded-xl border border-border p-3">
                  <FieldLabel htmlFor="isAvailable">Disponibil</FieldLabel>
                  <Switch
                    id="isAvailable"
                    checked={form.isAvailable}
                    onCheckedChange={(v) => set("isAvailable", v)}
                  />
                </div>
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
