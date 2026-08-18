/**
 * Golește programul: șterge toate proiecțiile, săptămânile, rezervările,
 * bonurile de casierie și codurile SMS neconsumate.
 *
 * Rămân neatinse: catalogul de filme, sălile, conturile personalului,
 * meniul barului și setările.
 *
 *   npm run db:reset-program
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const before = {
    proiecții: await db.screening.count(),
    săptămâni: await db.weekSchedule.count(),
    rezervări: await db.reservation.count(),
    bonuri: await db.callTicket.count(),
    coduri: await db.otpCode.count(),
    filme: await db.movie.count(),
  };
  console.log("înainte:", before);

  await db.callTicket.deleteMany();
  await db.reservation.deleteMany();
  await db.otpCode.deleteMany();
  await db.screening.deleteMany();
  await db.weekSchedule.deleteMany();

  // Fără premiere anunțate, ca prima pagină să fie complet goală.
  await db.movie.updateMany({
    data: { comingSoon: false, comingSoonFrom: null },
  });

  const after = {
    proiecții: await db.screening.count(),
    săptămâni: await db.weekSchedule.count(),
    rezervări: await db.reservation.count(),
    bonuri: await db.callTicket.count(),
    coduri: await db.otpCode.count(),
    filme: await db.movie.count(),
    săli: await db.hall.count(),
    conturi: await db.user.count(),
  };
  console.log("după:   ", after);

  await db.$disconnect();
}

main();
