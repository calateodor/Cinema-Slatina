"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { capacityForScreening } from "@/lib/capacity";
import { normalizePhone } from "@/lib/format";
import {
  ADULT_AGE,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MINUTES,
  SETTING_KEYS,
} from "@/lib/constants";

const requestSchema = z.object({
  screeningId: z.string().min(1),
  customerName: z
    .string()
    .trim()
    .min(3, "Scrie numele complet.")
    .max(80, "Numele este prea lung."),
  age: z.coerce
    .number()
    .int("Vârsta trebuie să fie un număr întreg.")
    .min(1, "Introdu o vârstă validă.")
    .max(120, "Introdu o vârstă validă."),
  phone: z.string().trim().min(6, "Introdu numărul de telefon."),
  seats: z.coerce.number().int().min(1).max(6),
});

export type RequestState = {
  ok: boolean;
  message?: string;
  otpId?: string;
  maskedPhone?: string;
  /** Codul este returnat doar când SMS-urile rulează în modul de test. */
  devCode?: string;
};

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function reservationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SLT-${out}`;
}

async function reservationsEnabled(): Promise<boolean> {
  const setting = await db.setting.findUnique({
    where: { key: SETTING_KEYS.RESERVATIONS_ENABLED },
  });
  return setting?.value !== "false";
}

/** Pasul 1: verifică datele, trimite codul SMS și reține rezervarea în așteptare. */
export async function requestReservationCode(
  input: z.input<typeof requestSchema>,
): Promise<RequestState> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." };
  }
  const data = parsed.data;

  if (!(await reservationsEnabled())) {
    return {
      ok: false,
      message: "Rezervările online sunt oprite momentan. Sună la casierie.",
    };
  }

  const phone = normalizePhone(data.phone);
  if (!phone) {
    return {
      ok: false,
      message: "Numărul de telefon nu pare valid. Folosește formatul 07XXXXXXXX.",
    };
  }

  const screening = await db.screening.findUnique({
    where: { id: data.screeningId },
    include: { movie: { select: { title: true } }, hall: { select: { name: true } } },
  });
  if (!screening || screening.isCancelled) {
    return { ok: false, message: "Proiecția nu mai este disponibilă." };
  }
  if (!screening.reservationsOpen) {
    return { ok: false, message: "Rezervările pentru această proiecție sunt închise." };
  }
  if (screening.startsAt.getTime() < Date.now()) {
    return { ok: false, message: "Proiecția a început deja." };
  }

  const capacity = await capacityForScreening(data.screeningId);
  if (!capacity) return { ok: false, message: "Proiecția nu a fost găsită." };

  const free = capacity.freeBase + capacity.freeExtra;
  if (free < data.seats) {
    return {
      ok: false,
      message:
        free === 0
          ? "Sala este plină, inclusiv scaunele suplimentare."
          : `Au mai rămas doar ${free} locuri libere.`,
    };
  }

  // Un singur cod activ per număr și proiecție.
  await db.otpCode.deleteMany({
    where: { phone, purpose: `RESERVATION:${data.screeningId}`, consumedAt: null },
  });

  const code = generateCode();
  const otp = await db.otpCode.create({
    data: {
      phone,
      codeHash: await bcrypt.hash(code, 10),
      purpose: `RESERVATION:${data.screeningId}`,
      payload: JSON.stringify({
        screeningId: data.screeningId,
        customerName: data.customerName,
        age: data.age,
        seats: data.seats,
      }),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  const sms = await sendSms(
    phone,
    `Cod rezervare Cinema Slatina: ${code}. Valabil ${OTP_TTL_MINUTES} minute. ${screening.movie.title}, ${screening.hall.name}.`,
  );

  return {
    ok: true,
    otpId: otp.id,
    maskedPhone: phone,
    devCode: sms.provider === "console" ? code : undefined,
  };
}

const confirmSchema = z.object({
  otpId: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Codul are 6 cifre."),
});

export type ConfirmState = {
  ok: boolean;
  message?: string;
  reservationCode?: string;
  usedExtraSeat?: boolean;
};

/** Pasul 2: validează codul primit prin SMS și creează rezervarea. */
export async function confirmReservation(
  input: z.input<typeof confirmSchema>,
): Promise<ConfirmState> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Cod invalid." };
  }

  const otp = await db.otpCode.findUnique({ where: { id: parsed.data.otpId } });
  if (!otp || otp.consumedAt) {
    return { ok: false, message: "Codul nu mai este valabil. Cere unul nou." };
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "Codul a expirat. Cere unul nou." };
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, message: "Prea multe încercări. Cere un cod nou." };
  }

  const matches = await bcrypt.compare(parsed.data.code, otp.codeHash);
  if (!matches) {
    await db.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, message: "Codul nu este corect. Mai încearcă o dată." };
  }

  const payload = JSON.parse(otp.payload ?? "{}") as {
    screeningId: string;
    customerName: string;
    age: number;
    seats: number;
  };

  const capacity = await capacityForScreening(payload.screeningId);
  if (!capacity) return { ok: false, message: "Proiecția nu mai există." };

  const free = capacity.freeBase + capacity.freeExtra;
  if (free < payload.seats) {
    return {
      ok: false,
      message: "Între timp locurile s-au ocupat. Alege o altă oră din program.",
    };
  }

  // Locurile fixe se ocupă primele; restul intră pe scaunele mobile.
  const onBase = Math.min(payload.seats, capacity.freeBase);
  const onExtra = payload.seats - onBase;

  const created = await db.reservation.create({
    data: {
      code: reservationCode(),
      screeningId: payload.screeningId,
      customerName: payload.customerName,
      phone: otp.phone,
      age: payload.age,
      isAdult: payload.age >= ADULT_AGE,
      seats: payload.seats,
      extraSeats: onExtra,
      phoneVerified: true,
      status: "CONFIRMED",
      source: "ONLINE",
    },
  });

  await db.otpCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  await sendSms(
    otp.phone,
    `Rezervare confirmată la Cinema Slatina. Cod: ${created.code}. Te așteptăm!`,
  );

  revalidatePath("/");
  revalidatePath("/program");

  return { ok: true, reservationCode: created.code, usedExtraSeat: onExtra > 0 };
}
