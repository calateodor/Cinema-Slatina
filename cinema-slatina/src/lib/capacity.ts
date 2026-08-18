import { db } from "@/lib/db";

export type Capacity = {
  base: number;
  extra: number;
  taken: number;
  takenBase: number;
  takenExtra: number;
  freeBase: number;
  freeExtra: number;
  /** Scaunele mobile devin disponibile doar dupa ce se umplu cele 100 fixe. */
  extraUnlocked: boolean;
  soldOut: boolean;
  total: number;
};

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN"];

export function buildCapacity(
  base: number,
  extra: number,
  takenSeats: number,
): Capacity {
  const takenBase = Math.min(takenSeats, base);
  const takenExtra = Math.max(0, takenSeats - base);
  const extraUnlocked = takenBase >= base && extra > 0;
  return {
    base,
    extra,
    taken: takenSeats,
    takenBase,
    takenExtra,
    freeBase: Math.max(0, base - takenBase),
    freeExtra: Math.max(0, extra - takenExtra),
    extraUnlocked,
    soldOut: takenSeats >= base + extra,
    total: base + extra,
  };
}

/** Locurile ocupate pentru mai multe proiectii, intr-o singura interogare. */
export async function seatsTakenByScreening(
  screeningIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (screeningIds.length === 0) return map;

  const rows = await db.reservation.groupBy({
    by: ["screeningId"],
    where: {
      screeningId: { in: screeningIds },
      status: { in: ACTIVE_STATUSES },
    },
    _sum: { seats: true },
  });

  for (const row of rows) {
    map.set(row.screeningId, row._sum.seats ?? 0);
  }
  return map;
}

export async function capacityForScreening(
  screeningId: string,
): Promise<Capacity | null> {
  const screening = await db.screening.findUnique({
    where: { id: screeningId },
    select: {
      capacityOverride: true,
      allowExtraSeats: true,
      hall: { select: { baseCapacity: true, extraCapacity: true } },
    },
  });
  if (!screening) return null;

  const taken = (await seatsTakenByScreening([screeningId])).get(screeningId) ?? 0;
  const base = screening.capacityOverride ?? screening.hall.baseCapacity;
  const extra = screening.allowExtraSeats ? screening.hall.extraCapacity : 0;
  return buildCapacity(base, extra, taken);
}
