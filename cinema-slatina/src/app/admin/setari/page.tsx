import {
  SettingsPanel,
  type StaffUser,
} from "@/components/admin/settings-panel";
import { PageTitle } from "@/components/staff/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SETTING_KEYS } from "@/lib/constants";
import { getSettings } from "@/server/queries";
import { isTmdbConfigured } from "@/lib/tmdb";

export default async function AdminSettingsPage() {
  const [me, settings, rows] = await Promise.all([
    requireAdmin(),
    getSettings(),
    db.user.findMany({ orderBy: [{ role: "asc" }, { username: "asc" }] }),
  ]);

  const users: StaffUser[] = rows.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Setări"
        description="Rezervări, mesaje publice și conturile personalului."
      />

      <div className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Preluare date de pe IMDb</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isTmdbConfigured()
            ? "Cheia TMDB este configurată. Butonul „Preia datele” din pagina Filme funcționează."
            : "Nu există cheie TMDB. Adaugă TMDB_API_KEY în fișierul .env și repornește serverul ca să poți prelua automat descrierea, posterul și trailerul."}
        </p>
      </div>

      <SettingsPanel
        reservationsEnabled={settings[SETTING_KEYS.RESERVATIONS_ENABLED] !== "false"}
        announcement={settings[SETTING_KEYS.ANNOUNCEMENT] ?? ""}
        rules={settings[SETTING_KEYS.RULES_CONTENT] ?? ""}
        users={users}
        currentUserId={me.id}
      />
    </div>
  );
}
