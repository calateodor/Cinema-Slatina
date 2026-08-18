# Cinema „Eugen Ionescu” Slatina

Site public + panou de administrare + panou de casierie pentru cinematograful
municipal din Slatina. Rezervările sunt gratuite și se confirmă prin cod SMS.

## Pornire rapidă

```bash
npm install
npm run db:reset   # creează baza de date și o populează cu date de test
npm run dev
```

Site: <http://localhost:3000> · Autentificare personal: `/autentificare`

Conturi din datele de test:

| Rol      | Utilizator | Parolă         |
| -------- | ---------- | -------------- |
| Admin    | `admin`    | `admin1234`    |
| Casierie | `casierie` | `casierie1234` |

> Schimbă parolele din **Setări → Conturi personal** înainte de a pune site-ul
> online.

## Configurare (`.env`)

| Variabilă       | Rol                                                                             |
| --------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`  | Baza SQLite locală (`file:./prisma/dev.db`).                                     |
| `AUTH_SECRET`   | Secretul cu care se semnează sesiunile. Minim 32 de caractere.                   |
| `TMDB_API_KEY`  | Cheie gratuită TMDB, pentru preluarea automată după link de IMDb.                |
| `SMS_PROVIDER`  | `console` (codul apare în terminal și pe ecran) sau `smso` (SMS real).           |
| `SMSO_API_KEY`  | Cheia furnizorului de SMS, dacă `SMS_PROVIDER=smso`.                             |

Cheia TMDB se ia gratuit de la <https://www.themoviedb.org/settings/api>. Fără
ea, filmele se completează manual — restul aplicației funcționează normal.

## Ce face aplicația

### Site public

- **Prima pagină** — carusel cu premierele, programul săptămânii pe zile,
  filmele săptămânii, „în curând”, informații de vizitare.
- **Program** — proiecțiile pe zile. Tab-ul „Va urma” arată săptămâna viitoare
  doar dacă a fost publicată din admin; altfel scrie că programul nu e stabilit.
- **Filme** — pagină de detaliu cu trailer, gen, descriere, distribuție și
  orele disponibile.
- **Rezervare** — nume, vârstă, telefon și număr de locuri, apoi cod de 6 cifre
  primit prin SMS. Locurile **nu** se aleg individual: se afișează doar câte
  sunt ocupate din cele 100 ale sălii. Cele 20 de scaune mobile suplimentare
  apar blocate până când sala fixă se umple.
- **Bar** și **Regulament** — pagini editabile din admin.

### Administrare (`/admin`)

- Program pe săptămâni, cu publicare separată pentru fiecare săptămână și
  copiere rapidă din săptămâna precedentă.
- Filme: lipești link-ul de IMDb și butonul „Preia datele” completează titlul,
  descrierea în română, posterul, trailerul, genul, durata și distribuția.
- Rezervări, meniul barului cu prețuri, anunțuri de închidere, setări generale
  (rezervări pornite/oprite, mesaj public, regulament, conturi personal).

### Casierie (`/casierie`)

- **Ghișeu** — proiecțiile zilei cu sala, ora, 3D/2D și gradul de ocupare.
  Butonul „Adaugă client” creează un bon etichetat cu ora exactă a apelului
  (`Client - 14:32:07`), care se completează după apel cu numele și numărul de
  telefon, apoi devine rezervare confirmată.
- **Caută client** — după nume, telefon sau cod; marchează prezența și dacă
  persoana este adult sau minor.
- **Rezervările zilei** — grupate pe proiecție, pentru intrarea în sală.

## Structura codului

```
prisma/schema.prisma        modelele bazei de date
prisma/seed.ts              datele de test
src/app/(public)            site-ul public
src/app/admin               panoul de administrare
src/app/casierie            panoul de casierie
src/components/site         componentele site-ului public
src/components/admin        formularele de administrare
src/components/cashier      ghișeul de casierie
src/components/staff        cadrul comun al panourilor interne
src/lib                     bază de date, autentificare, capacitate, SMS, TMDB
src/server/queries.ts       citirile din bază
src/server/actions          acțiunile de server (mutații)
```

## Comenzi

| Comandă             | Ce face                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Pornește serverul de dezvoltare.                   |
| `npm run build`     | Construiește versiunea de producție.               |
| `npm run db:seed`   | Repopulează baza cu datele de test.                |
| `npm run db:reset`  | Șterge și reconstruiește baza, apoi o populează.   |
| `npm run db:studio` | Deschide Prisma Studio pentru inspectarea datelor. |

## Identitate vizuală

- Galben `#FFDE59` (din siglă), portocaliu `#FF7A1A`, negru `#0A0A0B`, alb.
- Sala Roșie `#E03131`, Sala Albastră `#2F6FD0`.
- Fonturi: **Alfa Slab One** pentru titluri (fontul de afiș din materialele
  tipărite), **Sora** pentru interfață, **Bebas Neue** pentru ore și numere.
- Siglele Primăriei Municipiului Slatina se află în `public/brand/`.

## Skill-urile de design instalate

Cele cinci surse cerute sunt clonate local, în `.claude/` de la rădăcina
proiectului (`D:\Teo\Site Cinema\.claude\`):

| Skill                              | Sursa                                        | Ce impune în cod |
| ---------------------------------- | -------------------------------------------- | ---------------- |
| `frontend-design`                  | anthropics/claude-code                       | Direcție vizuală proprie, tipografie cu personalitate, un singur moment „semnătură”. |
| `shadcn`                           | shadcn-ui/ui                                  | Card/Badge/Alert/Empty/Field în loc de div-uri stilizate, `gap-*` în loc de `space-*`, `data-icon` pe pictogramele din butoane, culori semantice. |
| `gsap-core` … `gsap-utils` (8)     | greensock/gsap-skills                        | `useGSAP` cu scope și cleanup, animație doar pe `transform`/`opacity`, `matchMedia` pentru reduced motion. |
| `ui-ux-pro-max` + 6 skill-uri surori | nextlevelbuilder/ui-ux-pro-max-skill        | Bază de date locală de reguli UX; folosită pentru accesibilitate, ținte de atingere și erori de formular. |
| `bold`                             | bergside/awesome-design-skills               | Tipografie grea, contrast ridicat, stări de interacțiune explicite. |

Registrul complet de 67 de stiluri din `awesome-design-skills` este păstrat în
`.claude/design-registry/`. Ca să schimbi direcția vizuală, copiază alt stil în
`.claude/skills/` (de exemplu `dramatic`, `retro` sau `editorial`) în locul lui
`bold`.

> Notă: skill-ul `bold` vine cu propria paletă (albastru/verde). Am păstrat
> paleta clientului — galben `#FFDE59` din siglă, portocaliu, negru, alb — și am
> aplicat din `bold` doar principiile: tipografie grea, contrast mare, stări de
> interacțiune explicite. Regula din `frontend-design` este că brieful clientului
> are întâietate față de valorile implicite ale unui skill.
