"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { fetchMovieByImdb, isTmdbConfigured } from "@/lib/tmdb";
import { extractImdbId, slugify } from "@/lib/format";
import { weekStartOf } from "@/lib/dates";
import { SETTING_KEYS } from "@/lib/constants";

export type ActionResult<T = undefined> = {
  ok: boolean;
  message?: string;
  data?: T;
};

function revalidatePublic() {
  revalidatePath("/", "layout");
}

async function audit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
) {
  await db.auditLog.create({
    data: { userId, action, entity, entityId, details },
  });
}

/* ------------------------------------------------------------------ filme */

/** Preia datele filmului de la TMDB folosind link-ul de IMDb. */
export async function fetchImdbMetadata(
  imdbInput: string,
): Promise<ActionResult<Awaited<ReturnType<typeof fetchMovieByImdb>>>> {
  await requireAdmin();

  if (!isTmdbConfigured()) {
    return {
      ok: false,
      message:
        "Preluarea automată necesită o cheie TMDB. Adaug-o în fișierul .env (TMDB_API_KEY) și repornește serverul.",
    };
  }
  if (!extractImdbId(imdbInput)) {
    return {
      ok: false,
      message: "Lipsește ID-ul IMDb (ex. https://www.imdb.com/title/tt9603212/).",
    };
  }

  try {
    const data = await fetchMovieByImdb(imdbInput);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

const movieSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Titlul este obligatoriu."),
  originalTitle: z.string().trim().optional().nullable(),
  imdbUrl: z.string().trim().optional().nullable(),
  synopsis: z.string().trim().optional().nullable(),
  posterUrl: z.string().trim().optional().nullable(),
  backdropUrl: z.string().trim().optional().nullable(),
  trailerUrl: z.string().trim().optional().nullable(),
  genres: z.string().trim().optional().nullable(),
  runtimeMin: z.coerce.number().int().min(0).max(600).optional().nullable(),
  releaseYear: z.coerce.number().int().min(1890).max(2100).optional().nullable(),
  ageRating: z.string().trim().optional().nullable(),
  imdbRating: z.coerce.number().min(0).max(10).optional().nullable(),
  director: z.string().trim().optional().nullable(),
  cast: z.string().trim().optional().nullable(),
  comingSoon: z.boolean().default(false),
  comingSoonFrom: z.string().trim().optional().nullable(),
});

export async function saveMovie(
  input: z.input<typeof movieSchema>,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requireAdmin();
  const parsed = movieSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const d = parsed.data;
  const imdbId = d.imdbUrl ? extractImdbId(d.imdbUrl) : null;

  const data = {
    title: d.title,
    originalTitle: d.originalTitle || null,
    imdbId,
    imdbUrl: d.imdbUrl || null,
    synopsis: d.synopsis || null,
    posterUrl: d.posterUrl || null,
    backdropUrl: d.backdropUrl || null,
    trailerUrl: d.trailerUrl || null,
    genres: d.genres || null,
    runtimeMin: d.runtimeMin ?? null,
    releaseYear: d.releaseYear ?? null,
    ageRating: d.ageRating || "AG",
    imdbRating: d.imdbRating ?? null,
    director: d.director || null,
    cast: d.cast || null,
    comingSoon: d.comingSoon,
    comingSoonFrom: d.comingSoonFrom ? new Date(d.comingSoonFrom) : null,
    metadataSyncedAt: new Date(),
  };

  try {
    if (d.id) {
      const movie = await db.movie.update({ where: { id: d.id }, data });
      await audit(user.id, "update", "movie", movie.id, movie.title);
      revalidatePublic();
      return { ok: true, data: { id: movie.id, slug: movie.slug } };
    }

    // Slug unic, chiar dacă există deja un film cu titlu identic.
    const base = slugify(d.title) || "film";
    let slug = base;
    let n = 1;
    while (await db.movie.findUnique({ where: { slug } })) {
      slug = `${base}-${++n}`;
    }

    const movie = await db.movie.create({ data: { ...data, slug } });
    await audit(user.id, "create", "movie", movie.id, movie.title);
    revalidatePublic();
    return { ok: true, data: { id: movie.id, slug: movie.slug } };
  } catch (error) {
    const message = String(error);
    if (message.includes("Unique constraint") && message.includes("imdbId")) {
      return { ok: false, message: "Există deja un film cu acest ID de IMDb." };
    }
    return { ok: false, message: "Filmul nu a putut fi salvat." };
  }
}

export async function setMovieArchived(
  id: string,
  isArchived: boolean,
): Promise<ActionResult> {
  const user = await requireAdmin();
  await db.movie.update({ where: { id }, data: { isArchived } });
  await audit(user.id, isArchived ? "archive" : "restore", "movie", id);
  revalidatePublic();
  return { ok: true };
}

export async function deleteMovie(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  const count = await db.screening.count({ where: { movieId: id } });
  if (count > 0) {
    return {
      ok: false,
      message: `Filmul are ${count} proiecții în program. Șterge-le întâi sau arhivează filmul.`,
    };
  }
  await db.movie.delete({ where: { id } });
  await audit(user.id, "delete", "movie", id);
  revalidatePublic();
  return { ok: true };
}

/* -------------------------------------------------------------- program */

const screeningSchema = z.object({
  id: z.string().optional(),
  movieId: z.string().min(1, "Alege filmul."),
  hallId: z.string().min(1, "Alege sala."),
  /** Data locală, format yyyy-MM-dd. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Alege data."),
  /** Ora locală, format HH:mm. */
  time: z.string().regex(/^\d{2}:\d{2}$/, "Alege ora."),
  is3D: z.boolean().default(false),
  isDubbed: z.boolean().default(false),
  reservationsOpen: z.boolean().default(true),
  allowExtraSeats: z.boolean().default(true),
  capacityOverride: z.coerce.number().int().min(1).max(1000).optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

async function weekIdFor(date: Date): Promise<string> {
  const weekStart = weekStartOf(date);
  const week = await db.weekSchedule.upsert({
    where: { weekStart },
    update: {},
    create: { weekStart, isPublished: false },
  });
  return week.id;
}

export async function saveScreening(
  input: z.input<typeof screeningSchema>,
): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = screeningSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const d = parsed.data;
  const startsAt = new Date(`${d.date}T${d.time}:00`);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, message: "Data sau ora nu este validă." };
  }

  const data = {
    movieId: d.movieId,
    hallId: d.hallId,
    weekId: await weekIdFor(startsAt),
    startsAt,
    is3D: d.is3D,
    isDubbed: d.isDubbed,
    reservationsOpen: d.reservationsOpen,
    allowExtraSeats: d.allowExtraSeats,
    capacityOverride: d.capacityOverride ?? null,
    note: d.note || null,
  };

  if (d.id) {
    await db.screening.update({ where: { id: d.id }, data });
    await audit(user.id, "update", "screening", d.id);
  } else {
    const created = await db.screening.create({ data });
    await audit(user.id, "create", "screening", created.id);
  }

  revalidatePublic();
  return { ok: true };
}

export async function deleteScreening(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  const reservations = await db.reservation.count({
    where: { screeningId: id, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] } },
  });
  if (reservations > 0) {
    return {
      ok: false,
      message: `Proiecția are ${reservations} rezervări active. Anuleaz-o în loc să o ștergi.`,
    };
  }
  await db.screening.delete({ where: { id } });
  await audit(user.id, "delete", "screening", id);
  revalidatePublic();
  return { ok: true };
}

export async function setScreeningCancelled(
  id: string,
  isCancelled: boolean,
): Promise<ActionResult> {
  const user = await requireAdmin();
  await db.screening.update({ where: { id }, data: { isCancelled } });
  await audit(user.id, isCancelled ? "cancel" : "restore", "screening", id);
  revalidatePublic();
  return { ok: true };
}

export async function publishWeek(
  weekStartIso: string,
  isPublished: boolean,
): Promise<ActionResult> {
  const user = await requireAdmin();
  const weekStart = weekStartOf(new Date(weekStartIso));
  await db.weekSchedule.upsert({
    where: { weekStart },
    update: { isPublished, publishedAt: isPublished ? new Date() : null },
    create: {
      weekStart,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
  });
  await audit(user.id, isPublished ? "publish" : "unpublish", "week", weekStart.toISOString());
  revalidatePublic();
  return { ok: true };
}

/** Copiază toate proiecțiile dintr-o săptămână în alta (util pentru programul viitor). */
export async function copyWeek(
  fromIso: string,
  toIso: string,
): Promise<ActionResult<{ copied: number }>> {
  const user = await requireAdmin();
  const from = weekStartOf(new Date(fromIso));
  const to = weekStartOf(new Date(toIso));
  if (from.getTime() === to.getTime()) {
    return { ok: false, message: "Alege două săptămâni diferite." };
  }

  const source = await db.weekSchedule.findUnique({
    where: { weekStart: from },
    include: { screenings: true },
  });
  if (!source || source.screenings.length === 0) {
    return { ok: false, message: "Săptămâna sursă nu are proiecții." };
  }

  const target = await db.weekSchedule.upsert({
    where: { weekStart: to },
    update: {},
    create: { weekStart: to, isPublished: false },
  });

  const offsetMs = to.getTime() - from.getTime();
  await db.screening.createMany({
    data: source.screenings.map((s) => ({
      movieId: s.movieId,
      hallId: s.hallId,
      weekId: target.id,
      startsAt: new Date(s.startsAt.getTime() + offsetMs),
      is3D: s.is3D,
      isDubbed: s.isDubbed,
      reservationsOpen: s.reservationsOpen,
      allowExtraSeats: s.allowExtraSeats,
      capacityOverride: s.capacityOverride,
      note: s.note,
    })),
  });

  await audit(user.id, "copy", "week", target.id, `${from.toISOString()} → ${to.toISOString()}`);
  revalidatePublic();
  return { ok: true, data: { copied: source.screenings.length } };
}

/* ---------------------------------------------------------------- meniu */

const menuSchema = z.object({
  id: z.string().optional(),
  category: z.string().trim().min(1, "Alege categoria."),
  name: z.string().trim().min(1, "Scrie denumirea."),
  description: z.string().trim().optional().nullable(),
  /** Preț în lei, ex. „12,50”. */
  price: z.string().trim().min(1, "Scrie prețul."),
  isAvailable: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export async function saveMenuItem(
  input: z.input<typeof menuSchema>,
): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = menuSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const d = parsed.data;
  const priceBani = Math.round(Number(d.price.replace(",", ".")) * 100);
  if (!Number.isFinite(priceBani) || priceBani < 0) {
    return { ok: false, message: "Prețul nu este valid." };
  }

  const data = {
    category: d.category,
    name: d.name,
    description: d.description || null,
    priceBani,
    isAvailable: d.isAvailable,
    sortOrder: d.sortOrder,
  };

  if (d.id) {
    await db.menuItem.update({ where: { id: d.id }, data });
    await audit(user.id, "update", "menuItem", d.id);
  } else {
    const created = await db.menuItem.create({ data });
    await audit(user.id, "create", "menuItem", created.id);
  }
  revalidatePublic();
  return { ok: true };
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  await db.menuItem.delete({ where: { id } });
  await audit(user.id, "delete", "menuItem", id);
  revalidatePublic();
  return { ok: true };
}

/* ------------------------------------------------------------- anunțuri */

const closureSchema = z.object({
  id: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Alege data de început."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Alege data de final."),
  reason: z.string().trim().min(3, "Scrie motivul."),
  message: z.string().trim().min(10, "Scrie mesajul pentru public."),
  isActive: z.boolean().default(true),
});

export async function saveClosure(
  input: z.input<typeof closureSchema>,
): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = closureSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const d = parsed.data;
  const start = new Date(`${d.startDate}T00:00:00`);
  const end = new Date(`${d.endDate}T23:59:59`);
  if (end < start) {
    return { ok: false, message: "Data de final este înaintea celei de început." };
  }

  const data = {
    startDate: start,
    endDate: end,
    reason: d.reason,
    message: d.message,
    isActive: d.isActive,
  };

  if (d.id) {
    await db.closureNotice.update({ where: { id: d.id }, data });
    await audit(user.id, "update", "closure", d.id);
  } else {
    const created = await db.closureNotice.create({ data });
    await audit(user.id, "create", "closure", created.id);
  }
  revalidatePublic();
  return { ok: true };
}

export async function deleteClosure(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  await db.closureNotice.delete({ where: { id } });
  await audit(user.id, "delete", "closure", id);
  revalidatePublic();
  return { ok: true };
}

/* --------------------------------------------------------------- setări */

export async function setSetting(
  key: string,
  value: string,
): Promise<ActionResult> {
  const user = await requireAdmin();
  const allowed: string[] = Object.values(SETTING_KEYS);
  if (!allowed.includes(key)) {
    return { ok: false, message: "Setare necunoscută." };
  }
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  await audit(user.id, "update", "setting", key, value.slice(0, 120));
  revalidatePublic();
  return { ok: true };
}

const userSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .trim()
    .min(3, "Numele de utilizator are minim 3 caractere.")
    .regex(/^[a-z0-9._-]+$/i, "Folosește doar litere, cifre, punct sau liniuță."),
  fullName: z.string().trim().min(3, "Scrie numele complet."),
  role: z.enum(["ADMIN", "CASHIER"]),
  password: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function saveUser(
  input: z.input<typeof userSchema>,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const d = parsed.data;

  if (!d.id && (!d.password || d.password.length < 8)) {
    return { ok: false, message: "Parola trebuie să aibă minim 8 caractere." };
  }
  if (d.password && d.password.length > 0 && d.password.length < 8) {
    return { ok: false, message: "Parola trebuie să aibă minim 8 caractere." };
  }

  try {
    if (d.id) {
      await db.user.update({
        where: { id: d.id },
        data: {
          username: d.username.toLowerCase(),
          fullName: d.fullName,
          role: d.role,
          isActive: d.isActive,
          ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}),
        },
      });
      await audit(admin.id, "update", "user", d.id, d.username);
    } else {
      const created = await db.user.create({
        data: {
          username: d.username.toLowerCase(),
          fullName: d.fullName,
          role: d.role,
          isActive: d.isActive,
          passwordHash: await hashPassword(d.password!),
        },
      });
      await audit(admin.id, "create", "user", created.id, d.username);
    }
    revalidatePath("/admin/setari");
    return { ok: true };
  } catch (error) {
    if (String(error).includes("Unique constraint")) {
      return { ok: false, message: "Numele de utilizator este deja folosit." };
    }
    return { ok: false, message: "Utilizatorul nu a putut fi salvat." };
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.id === id) {
    return { ok: false, message: "Nu îți poți șterge propriul cont." };
  }
  const admins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
  const target = await db.user.findUnique({ where: { id } });
  if (target?.role === "ADMIN" && admins <= 1) {
    return { ok: false, message: "Trebuie să rămână cel puțin un administrator." };
  }
  await db.user.delete({ where: { id } });
  await audit(admin.id, "delete", "user", id);
  revalidatePath("/admin/setari");
  return { ok: true };
}
