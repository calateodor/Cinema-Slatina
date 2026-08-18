"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { capacityForScreening } from "@/lib/capacity";
import { normalizePhone } from "@/lib/format";
import { ADULT_AGE, ROLES } from "@/lib/constants";

export type Result<T = undefined> = { ok: boolean; message?: string; data?: T };

const STAFF = [ROLES.ADMIN, ROLES.CASHIER];

function code(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SLT-${out}`;
}

function refresh() {
  revalidatePath("/casierie");
  revalidatePath("/admin/rezervari");
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------ bonuri de apel */

/**
 * „Adaugă client” — creează un bon cu ora exactă a apăsării butonului,
 * ca să poată fi asociat ulterior cu apelul telefonic primit la casierie.
 */
export async function createCallTicket(
  screeningId?: string,
): Promise<Result<{ id: string; label: string }>> {
  const user = await requireUser(STAFF);
  const now = new Date();
  const label = `Client - ${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  const ticket = await db.callTicket.create({
    data: {
      label,
      screeningId: screeningId || null,
      createdById: user.id,
    },
  });

  revalidatePath("/casierie");
  return { ok: true, data: { id: ticket.id, label: ticket.label } };
}

const ticketSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  age: z.coerce.number().int().min(1).max(120).optional().nullable(),
  isAdult: z.boolean().optional().nullable(),
  seats: z.coerce.number().int().min(1).max(20).optional(),
  screeningId: z.string().optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function updateCallTicket(
  input: z.input<typeof ticketSchema>,
): Promise<Result> {
  await requireUser(STAFF);
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const d = parsed.data;

  await db.callTicket.update({
    where: { id: d.id },
    data: {
      customerName: d.customerName ?? undefined,
      phone: d.phone ?? undefined,
      age: d.age ?? undefined,
      isAdult:
        d.isAdult ?? (d.age != null ? d.age >= ADULT_AGE : undefined),
      seats: d.seats ?? undefined,
      screeningId: d.screeningId ?? undefined,
      note: d.note ?? undefined,
    },
  });

  revalidatePath("/casierie");
  return { ok: true };
}

export async function closeCallTicket(id: string): Promise<Result> {
  await requireUser(STAFF);
  await db.callTicket.update({ where: { id }, data: { status: "CLOSED" } });
  revalidatePath("/casierie");
  return { ok: true };
}

export async function deleteCallTicket(id: string): Promise<Result> {
  await requireUser(STAFF);
  await db.callTicket.delete({ where: { id } });
  revalidatePath("/casierie");
  return { ok: true };
}

/** Transformă bonul de apel într-o rezervare confirmată. */
export async function confirmCallTicket(id: string): Promise<Result<{ code: string }>> {
  const user = await requireUser(STAFF);
  const ticket = await db.callTicket.findUnique({ where: { id } });
  if (!ticket) return { ok: false, message: "Bonul nu mai există." };
  if (!ticket.screeningId) {
    return { ok: false, message: "Alege întâi proiecția pentru acest client." };
  }
  if (!ticket.customerName || ticket.customerName.trim().length < 3) {
    return { ok: false, message: "Completează numele clientului." };
  }
  const phone = ticket.phone ? normalizePhone(ticket.phone) : null;
  if (!phone) {
    return { ok: false, message: "Completează un număr de telefon valid (07XXXXXXXX)." };
  }

  const capacity = await capacityForScreening(ticket.screeningId);
  if (!capacity) return { ok: false, message: "Proiecția nu mai există." };
  const free = capacity.freeBase + capacity.freeExtra;
  if (free < ticket.seats) {
    return {
      ok: false,
      message:
        free === 0
          ? "Sala este plină, inclusiv scaunele suplimentare."
          : `Mai sunt doar ${free} locuri libere.`,
    };
  }

  const onBase = Math.min(ticket.seats, capacity.freeBase);
  const reservation = await db.reservation.create({
    data: {
      code: code(),
      screeningId: ticket.screeningId,
      customerName: ticket.customerName.trim(),
      phone,
      age: ticket.age,
      isAdult: ticket.isAdult ?? (ticket.age != null ? ticket.age >= ADULT_AGE : true),
      seats: ticket.seats,
      extraSeats: ticket.seats - onBase,
      phoneVerified: false,
      status: "CONFIRMED",
      source: "PHONE",
      note: ticket.note,
      createdById: user.id,
    },
  });

  await db.callTicket.update({
    where: { id },
    data: { status: "LINKED", reservationId: reservation.id },
  });

  refresh();
  return { ok: true, data: { code: reservation.code } };
}

/* -------------------------------------------------------- rezervări */

const manualSchema = z.object({
  screeningId: z.string().min(1, "Alege proiecția."),
  customerName: z.string().trim().min(3, "Scrie numele clientului."),
  phone: z.string().trim().min(6, "Scrie numărul de telefon."),
  age: z.coerce.number().int().min(1).max(120).optional().nullable(),
  seats: z.coerce.number().int().min(1).max(20).default(1),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function createManualReservation(
  input: z.input<typeof manualSchema>,
): Promise<Result<{ code: string }>> {
  const user = await requireUser(STAFF);
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const d = parsed.data;

  const phone = normalizePhone(d.phone);
  if (!phone) {
    return { ok: false, message: "Numărul de telefon trebuie să fie de forma 07XXXXXXXX." };
  }

  const capacity = await capacityForScreening(d.screeningId);
  if (!capacity) return { ok: false, message: "Proiecția nu există." };
  const free = capacity.freeBase + capacity.freeExtra;
  if (free < d.seats) {
    return {
      ok: false,
      message:
        free === 0
          ? "Sala este plină, inclusiv scaunele suplimentare."
          : `Mai sunt doar ${free} locuri libere.`,
    };
  }

  const onBase = Math.min(d.seats, capacity.freeBase);
  const reservation = await db.reservation.create({
    data: {
      code: code(),
      screeningId: d.screeningId,
      customerName: d.customerName,
      phone,
      age: d.age ?? null,
      isAdult: d.age != null ? d.age >= ADULT_AGE : true,
      seats: d.seats,
      extraSeats: d.seats - onBase,
      phoneVerified: false,
      status: "CONFIRMED",
      source: "DESK",
      note: d.note || null,
      createdById: user.id,
    },
  });

  refresh();
  return { ok: true, data: { code: reservation.code } };
}

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "CHECKED_IN",
  "NO_SHOW",
] as const;

export async function setReservationStatus(
  id: string,
  status: (typeof STATUSES)[number],
): Promise<Result> {
  await requireUser(STAFF);
  if (!STATUSES.includes(status)) {
    return { ok: false, message: "Stare necunoscută." };
  }

  await db.reservation.update({
    where: { id },
    data: {
      status,
      checkedInAt: status === "CHECKED_IN" ? new Date() : undefined,
      cancelledAt: status === "CANCELLED" ? new Date() : undefined,
    },
  });

  refresh();
  return { ok: true };
}

export async function setReservationAdult(
  id: string,
  isAdult: boolean,
): Promise<Result> {
  await requireUser(STAFF);
  await db.reservation.update({ where: { id }, data: { isAdult } });
  refresh();
  return { ok: true };
}

/** Caută rezervări după nume, telefon sau cod — folosit la intrarea în sală. */
export async function searchReservations(query: string): Promise<
  Result<
    {
      id: string;
      code: string;
      customerName: string;
      phone: string;
      age: number | null;
      isAdult: boolean;
      seats: number;
      status: string;
      movieTitle: string;
      hallName: string;
      startsAt: string;
    }[]
  >
> {
  await requireUser(STAFF);
  const q = query.trim();
  if (q.length < 2) return { ok: true, data: [] };

  const digits = q.replace(/\D/g, "");
  const rows = await db.reservation.findMany({
    where: {
      OR: [
        { customerName: { contains: q } },
        { code: { contains: q.toUpperCase() } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
      ],
    },
    include: {
      screening: {
        include: {
          movie: { select: { title: true } },
          hall: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      code: r.code,
      customerName: r.customerName,
      phone: r.phone,
      age: r.age,
      isAdult: r.isAdult,
      seats: r.seats,
      status: r.status,
      movieTitle: r.screening.movie.title,
      hallName: r.screening.hall.name,
      startsAt: r.screening.startsAt.toISOString(),
    })),
  };
}
