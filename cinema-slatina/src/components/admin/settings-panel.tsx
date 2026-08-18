"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteUser, saveUser, setSetting } from "@/server/actions/admin";
import { SETTING_KEYS } from "@/lib/constants";

export type StaffUser = {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

type UserForm = {
  id?: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "CASHIER";
  password: string;
  isActive: boolean;
};

const EMPTY_USER: UserForm = {
  username: "",
  fullName: "",
  role: "CASHIER",
  password: "",
  isActive: true,
};

export function SettingsPanel({
  reservationsEnabled,
  announcement,
  rules,
  users,
  currentUserId,
}: {
  reservationsEnabled: boolean;
  announcement: string;
  rules: string;
  users: StaffUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [reservations, setReservations] = useState(reservationsEnabled);
  const [announcementText, setAnnouncementText] = useState(announcement);
  const [rulesText, setRulesText] = useState(rules);

  const [userOpen, setUserOpen] = useState(false);
  const [userForm, setUserForm] = useState<UserForm>(EMPTY_USER);

  function toggleReservations(value: boolean) {
    setReservations(value);
    startTransition(async () => {
      await setSetting(SETTING_KEYS.RESERVATIONS_ENABLED, String(value));
      toast.success(
        value ? "Rezervările online sunt pornite." : "Rezervările online sunt oprite.",
      );
      router.refresh();
    });
  }

  function saveText(key: string, value: string, label: string) {
    startTransition(async () => {
      const result = await setSetting(key, value);
      if (!result.ok) {
        toast.error(result.message ?? "Nu am putut salva.");
        return;
      }
      toast.success(`${label} salvat.`);
      router.refresh();
    });
  }

  function submitUser(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveUser(userForm);
      if (!result.ok) {
        toast.error(result.message ?? "Utilizatorul nu a putut fi salvat.");
        return;
      }
      toast.success(userForm.id ? "Cont actualizat." : "Cont creat.");
      setUserOpen(false);
      router.refresh();
    });
  }

  function removeUser(user: StaffUser) {
    if (!confirm(`Ștergi contul „${user.username}”?`)) return;
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (!result.ok) {
        toast.error(result.message ?? "Contul nu a putut fi șters.");
        return;
      }
      toast.success("Cont șters.");
      router.refresh();
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Rezervări online</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Când sunt oprite, butoanele „Rezervă” de pe site devin inactive și
              rezervările se pot face doar telefonic.
            </p>
          </div>
          <Switch
            checked={reservations}
            onCheckedChange={toggleReservations}
            disabled={pending}
            aria-label="Rezervări online"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Mesaj general pe site</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Text scurt afișat vizitatorilor. Lasă gol dacă nu ai nimic de anunțat.
        </p>
        <Textarea
          rows={3}
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          className="mt-3"
          placeholder="Ex. Sâmbătă avem proiecție specială pentru copii."
        />
        <Button
          className="mt-3 gap-2"
          disabled={pending}
          onClick={() =>
            saveText(SETTING_KEYS.ANNOUNCEMENT, announcementText, "Mesajul")
          }
        >
          {pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          Salvează mesajul
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Regulament</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dacă scrii aici un text, el înlocuiește regulamentul standard de pe
          pagina publică. Lasă gol pentru varianta implicită.
        </p>
        <Textarea
          rows={8}
          value={rulesText}
          onChange={(e) => setRulesText(e.target.value)}
          className="mt-3"
        />
        <Button
          className="mt-3 gap-2"
          disabled={pending}
          onClick={() => saveText(SETTING_KEYS.RULES_CONTENT, rulesText, "Regulamentul")}
        >
          {pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          Salvează regulamentul
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Conturi personal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Administratorii pot modifica programul; casierii au acces doar la
              panoul de rezervări.
            </p>
          </div>
          <Button
            onClick={() => {
              setUserForm(EMPTY_USER);
              setUserOpen(true);
            }}
            className="gap-2"
          >
            <Plus data-icon="inline-start" />
            Cont nou
          </Button>
        </div>

        <ul className="mt-4 divide-y divide-border">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {user.fullName}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({user.username})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.role === "ADMIN" ? "Administrator" : "Casierie"}
                  {!user.isActive ? " · dezactivat" : ""}
                  {user.lastLoginAt
                    ? ` · ultima autentificare ${new Date(
                        user.lastLoginAt,
                      ).toLocaleDateString("ro-RO")}`
                    : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setUserForm({
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    role: user.role as "ADMIN" | "CASHIER",
                    password: "",
                    isActive: user.isActive,
                  });
                  setUserOpen(true);
                }}
                aria-label={`Editează ${user.username}`}
              >
                <Pencil data-icon="inline-start" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={user.id === currentUserId}
                onClick={() => removeUser(user)}
                aria-label={`Șterge ${user.username}`}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={userOpen} onOpenChange={setUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userForm.id ? "Editează contul" : "Cont nou"}</DialogTitle>
            <DialogDescription>
              {userForm.id
                ? "Lasă parola goală dacă nu vrei să o schimbi."
                : "Parola trebuie să aibă minim 8 caractere."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitUser} className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullName">Nume complet</FieldLabel>
                <Input
                  id="fullName"
                  required
                  value={userForm.fullName}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, fullName: e.target.value }))
                  }
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="username">Utilizator</FieldLabel>
                  <Input
                    id="username"
                    required
                    autoCapitalize="none"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, username: e.target.value }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="role">Rol</FieldLabel>
                  <Select
                    value={userForm.role}
                    onValueChange={(v) =>
                      setUserForm((p) => ({ ...p, role: v as "ADMIN" | "CASHIER" }))
                    }
                  >
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASHIER">Casierie</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="password">Parolă</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((p) => ({ ...p, password: e.target.value }))
                  }
                />
              </Field>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
                <FieldLabel htmlFor="isActive">Cont activ</FieldLabel>
                <Switch
                  id="isActive"
                  checked={userForm.isActive}
                  onCheckedChange={(v) =>
                    setUserForm((p) => ({ ...p, isActive: v }))
                  }
                />
              </div>

            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUserOpen(false)}
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
    </div>
  );
}
