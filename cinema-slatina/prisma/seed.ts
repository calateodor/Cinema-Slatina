import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
});

function weekStartOf(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // luni = 0
  d.setDate(d.getDate() - day);
  return d;
}

function at(weekStart: Date, dayOffset: number, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

let codeCounter = 0;
function reservationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  codeCounter += 1;
  return `SLT-${out}${codeCounter}`;
}

const MOVIES = [
  {
    slug: "cenusareasa",
    title: "Cenușăreasa",
    originalTitle: "Cinderella",
    genres: "Animație, Familie",
    runtimeMin: 74,
    releaseYear: 1950,
    ageRating: "AG",
    imdbId: "tt0042332",
    imdbUrl: "https://www.imdb.com/title/tt0042332/",
    imdbRating: 7.3,
    synopsis:
      "Cenușăreasa trăiește alături de mama vitregă și de surorile ei, care o pun la treburile casei. Cu ajutorul unei zâne bune și al prietenilor ei, șoriceii, ajunge la balul regal, unde îl cunoaște pe prinț — dar magia ține doar până la miezul nopții.",
    trailerUrl: "https://www.youtube.com/watch?v=2A2fBUZo5xw",
  },
  {
    slug: "pinocchio",
    title: "Pinocchio",
    originalTitle: "Pinocchio",
    genres: "Animație, Aventură",
    runtimeMin: 88,
    releaseYear: 1940,
    ageRating: "AG",
    imdbId: "tt0032910",
    imdbUrl: "https://www.imdb.com/title/tt0032910/",
    imdbRating: 7.4,
    synopsis:
      "Un bătrân meșter sculptează o păpușă de lemn care prinde viață. Ca să devină un băiat adevărat, Pinocchio trebuie să dovedească faptul că este curajos, sincer și generos — o lecție pe care o învață pe drumul cel mai lung cu putință.",
    trailerUrl: "https://www.youtube.com/watch?v=YjJlSQ3nJUE",
  },
  {
    slug: "trolls-descopera-lumea",
    title: "Trolls: Descoperă Lumea",
    originalTitle: "Trolls World Tour",
    genres: "Animație, Muzical",
    runtimeMin: 91,
    releaseYear: 2020,
    ageRating: "AG",
    imdbId: "tt6587640",
    imdbUrl: "https://www.imdb.com/title/tt6587640/",
    imdbRating: 6.0,
    synopsis:
      "Poppy și Branch descoperă că lumea trolilor este mult mai mare decât credeau: există șase triburi, fiecare cu genul lui muzical. Când unul dintre ele vrea să le unifice cu forța, cei doi pornesc într-o călătorie ca să salveze diversitatea muzicii.",
    trailerUrl: "https://www.youtube.com/watch?v=Xtoedh1FYZE",
  },
  {
    slug: "exit-8",
    title: "Exit 8",
    originalTitle: "The Exit 8",
    genres: "Thriller, Mister",
    runtimeMin: 95,
    releaseYear: 2025,
    ageRating: "N-15",
    imdbId: "tt33098618",
    imdbUrl: "https://www.imdb.com/title/tt33098618/",
    imdbRating: 6.6,
    synopsis:
      "Un bărbat rămâne prins într-un coridor de metrou care se repetă la nesfârșit. Ca să iasă, trebuie să observe fiecare anomalie din jurul lui — și să se întoarcă din drum atunci când ceva nu este la locul lui.",
    trailerUrl: "https://www.youtube.com/watch?v=1AI5PJVJ8Ok",
  },
  {
    slug: "diavolul-se-imbraca-de-la-prada-2",
    title: "Diavolul se îmbracă de la Prada 2",
    originalTitle: "The Devil Wears Prada 2",
    genres: "Comedie, Dramă",
    runtimeMin: 118,
    releaseYear: 2026,
    ageRating: "AP-12",
    imdbId: "tt36457884",
    imdbUrl: "https://www.imdb.com/title/tt36457884/",
    imdbRating: 7.1,
    synopsis:
      "Miranda Priestly se confruntă cu declinul presei tipărite și cu o fostă asistentă devenită între timp una dintre cele mai puternice voci din industrie. Vechea relație dintre ele se rescrie într-o lume în care regulile modei s-au schimbat complet.",
    trailerUrl: "https://www.youtube.com/watch?v=6ZfuNTqbHE8",
  },
  {
    slug: "mortal-kombat-ii",
    title: "Mortal Kombat II",
    originalTitle: "Mortal Kombat II",
    genres: "Acțiune, Fantastic",
    runtimeMin: 110,
    releaseYear: 2025,
    ageRating: "N-15",
    imdbId: "tt13314558",
    imdbUrl: "https://www.imdb.com/title/tt13314558/",
    imdbRating: 6.8,
    synopsis:
      "Luptătorii Pământului se pregătesc pentru un nou turneu, în timp ce Outworld își adună cei mai periculoși campioni. Miza nu mai este doar victoria, ci supraviețuirea propriei lumi.",
    trailerUrl: "https://www.youtube.com/watch?v=P2Iabc5xoyU",
  },
  {
    slug: "obsesia",
    title: "Obsesia",
    originalTitle: "Obsession",
    genres: "Thriller",
    runtimeMin: 104,
    releaseYear: 2025,
    ageRating: "IM-18",
    imdbId: "tt31716142",
    imdbUrl: "https://www.imdb.com/title/tt31716142/",
    imdbRating: 6.2,
    synopsis:
      "O relație care începe ca o poveste de dragoste se transformă treptat într-un joc de control și manipulare, în care fiecare gest aparent inofensiv ascunde o intenție.",
    trailerUrl: "https://www.youtube.com/watch?v=Hh5tJ9uMDYE",
  },
  {
    slug: "misiune-imposibila-rafuiala-mortala",
    title: "Misiune: Imposibilă – Răfuială mortală partea întâi",
    originalTitle: "Mission: Impossible – Dead Reckoning Part One",
    genres: "Thriller, Acțiune",
    runtimeMin: 163,
    releaseYear: 2023,
    ageRating: "AP-12",
    imdbId: "tt9603212",
    imdbUrl: "https://www.imdb.com/title/tt9603212/",
    imdbRating: 7.7,
    synopsis:
      "Ethan Hunt (Tom Cruise) și echipa sa de la IMF pornesc în cea mai periculoasă misiune de până acum: să dea de urma unei noi arme terifiante care amenință întreaga omenire, înainte ca aceasta să cadă în mâinile greșite. Cu controlul asupra viitorului și a lumii în joc, cursa contra cronometru începe.",
    trailerUrl: "https://www.youtube.com/watch?v=avz06PDqDbM",
  },
];

const NAMES = [
  "Andrei Popescu",
  "Maria Ionescu",
  "Elena Dumitrescu",
  "Vlad Marin",
  "Ioana Stan",
  "Cristian Radu",
  "Alexandra Neagu",
  "Mihai Barbu",
  "Raluca Preda",
  "George Șerban",
];

async function main() {
  console.log("→ Curăț datele existente…");
  await db.auditLog.deleteMany();
  await db.callTicket.deleteMany();
  await db.reservation.deleteMany();
  await db.otpCode.deleteMany();
  await db.screening.deleteMany();
  await db.weekSchedule.deleteMany();
  await db.movie.deleteMany();
  await db.hall.deleteMany();
  await db.menuItem.deleteMany();
  await db.closureNotice.deleteMany();
  await db.setting.deleteMany();
  await db.user.deleteMany();

  console.log("→ Utilizatori…");
  await db.user.create({
    data: {
      username: "admin",
      passwordHash: await bcrypt.hash("admin1234", 12),
      fullName: "Administrator Cinema",
      role: "ADMIN",
    },
  });
  const cashier = await db.user.create({
    data: {
      username: "casierie",
      passwordHash: await bcrypt.hash("casierie1234", 12),
      fullName: "Casierie Cinema",
      role: "CASHIER",
    },
  });

  console.log("→ Săli…");
  const rosie = await db.hall.create({
    data: {
      slug: "rosie",
      name: "Sala Roșie",
      colorHex: "#e03131",
      baseCapacity: 100,
      extraCapacity: 20,
      sortOrder: 1,
    },
  });
  const albastra = await db.hall.create({
    data: {
      slug: "albastra",
      name: "Sala Albastră",
      colorHex: "#2f6fd0",
      baseCapacity: 100,
      extraCapacity: 20,
      sortOrder: 2,
    },
  });

  console.log("→ Filme…");
  const movies = new Map<string, string>();
  const thisWeekStart = weekStartOf();
  for (const m of MOVIES) {
    const isComingSoon = m.slug === "misiune-imposibila-rafuiala-mortala";
    const created = await db.movie.create({
      data: {
        ...m,
        comingSoon: isComingSoon,
        comingSoonFrom: isComingSoon ? at(thisWeekStart, 7, "15:00") : null,
      },
    });
    movies.set(m.slug, created.id);
  }

  console.log("→ Program…");
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const thisWeek = await db.weekSchedule.create({
    data: {
      weekStart: thisWeekStart,
      isPublished: true,
      publishedAt: new Date(),
    },
  });
  const nextWeek = await db.weekSchedule.create({
    data: { weekStart: nextWeekStart, isPublished: false },
  });

  // Șablonul zilnic: proiecții alternate între cele două săli.
  const template = [
    { time: "15:00", slug: "cenusareasa", hall: rosie.id, is3D: true, dubbed: true },
    { time: "15:30", slug: "pinocchio", hall: albastra.id, is3D: true, dubbed: true },
    { time: "17:00", slug: "trolls-descopera-lumea", hall: rosie.id, is3D: true, dubbed: true },
    { time: "17:30", slug: "exit-8", hall: albastra.id, is3D: false, dubbed: false },
    { time: "19:00", slug: "diavolul-se-imbraca-de-la-prada-2", hall: rosie.id, is3D: false, dubbed: false },
    { time: "19:30", slug: "mortal-kombat-ii", hall: albastra.id, is3D: true, dubbed: false },
    { time: "21:00", slug: "obsesia", hall: rosie.id, is3D: false, dubbed: false },
  ];

  const createdIds: string[] = [];
  for (let day = 0; day < 7; day++) {
    for (const row of template) {
      const screening = await db.screening.create({
        data: {
          movieId: movies.get(row.slug)!,
          hallId: row.hall,
          weekId: thisWeek.id,
          startsAt: at(thisWeekStart, day, row.time),
          is3D: row.is3D,
          isDubbed: row.dubbed,
        },
      });
      createdIds.push(screening.id);
    }
  }

  // Săptămâna viitoare există în sistem, dar nu este publicată încă.
  for (let day = 0; day < 7; day++) {
    for (const row of template.slice(0, 4)) {
      const slug =
        row.slug === "cenusareasa"
          ? "misiune-imposibila-rafuiala-mortala"
          : row.slug;
      await db.screening.create({
        data: {
          movieId: movies.get(slug)!,
          hallId: row.hall,
          weekId: nextWeek.id,
          startsAt: at(nextWeekStart, day, row.time),
          is3D: row.is3D,
          isDubbed: row.dubbed,
        },
      });
    }
  }

  console.log("→ Rezervări de test…");
  let phoneSeed = 700100200;
  let reservations = 0;
  for (const id of createdIds.slice(0, 24)) {
    const count = Math.floor(Math.random() * 6) + 1;
    for (let i = 0; i < count; i++) {
      const age = 8 + Math.floor(Math.random() * 50);
      await db.reservation.create({
        data: {
          code: reservationCode(),
          screeningId: id,
          customerName: NAMES[Math.floor(Math.random() * NAMES.length)],
          phone: `0${phoneSeed++}`,
          age,
          isAdult: age >= 18,
          seats: Math.floor(Math.random() * 3) + 1,
          phoneVerified: true,
          status: Math.random() > 0.3 ? "CONFIRMED" : "PENDING",
          source: Math.random() > 0.5 ? "ONLINE" : "PHONE",
          createdById: Math.random() > 0.5 ? cashier.id : null,
        },
      });
      reservations += 1;
    }
  }

  console.log("→ Meniu bar…");
  const menu = [
    { category: "Ochelari 3D", name: "Ochelari 3D reutilizabili", priceBani: 500, description: "Se returnează la ieșirea din sală.", sortOrder: 1 },
    { category: "Ochelari 3D", name: "Ochelari 3D pentru copii", priceBani: 500, description: "Model mai mic, pentru copii sub 12 ani.", sortOrder: 2 },
    { category: "Popcorn", name: "Popcorn mic", priceBani: 800, sortOrder: 10 },
    { category: "Popcorn", name: "Popcorn mare", priceBani: 1200, sortOrder: 11 },
    { category: "Popcorn", name: "Popcorn caramel", priceBani: 1400, sortOrder: 12 },
    { category: "Băuturi", name: "Apă plată 0,5 l", priceBani: 500, sortOrder: 20 },
    { category: "Băuturi", name: "Suc carbogazos 0,5 l", priceBani: 700, sortOrder: 21 },
    { category: "Băuturi", name: "Limonadă", priceBani: 1000, sortOrder: 22 },
    { category: "Snacks", name: "Nachos cu sos", priceBani: 1500, sortOrder: 30 },
    { category: "Snacks", name: "Baton de ciocolată", priceBani: 600, sortOrder: 31 },
  ];
  for (const item of menu) await db.menuItem.create({ data: item });

  console.log("→ Setări…");
  await db.setting.createMany({
    data: [
      { key: "reservations_enabled", value: "true" },
      { key: "announcement", value: "" },
    ],
  });

  console.log(
    [
      "",
      "✓ Baza de date a fost populată.",
      "  Admin:    admin / admin1234",
      "  Casierie: casierie / casierie1234",
      `  Filme: ${MOVIES.length} · Proiecții săptămâna curentă: ${createdIds.length} · Rezervări: ${reservations}`,
      `  Săli: ${rosie.name}, ${albastra.name}`,
      "",
    ].join("\n"),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
