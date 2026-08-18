# Punerea site-ului online (Vercel)

Aplicația rulează cod pe server: rezervări, autentificare, panoul de
administrare și cel de casierie. De aceea are nevoie de o găzduire care
execută Node, nu de GitHub Pages. Vercel se leagă direct la depozitul de pe
GitHub și redeployează singur la fiecare `git push`.

Timp estimat: 10–15 minute.

---

## 1. Creează baza de date

Aplicația folosește PostgreSQL. Cel mai simplu, direct din Vercel:

1. Intră pe <https://vercel.com> și autentifică-te **cu contul de GitHub**
   (`calateodor`).
2. În panoul Vercel: **Storage → Create Database → Prisma Postgres**
   (sau **Neon**, merge la fel de bine). Alege regiunea **Frankfurt (eu-central)**.
3. Vercel adaugă automat variabila `DATABASE_URL` în proiect.

Dacă preferi altă bază Postgres, e suficient să pui tu `DATABASE_URL` la pasul 3.

## 2. Importă proiectul

1. **Add New → Project → Import Git Repository → `calateodor/Cinema-Slatina`**.
2. La **Root Directory** apasă *Edit* și alege folderul **`cinema-slatina`**.
   Acesta este pasul cel mai ușor de ratat — aplicația nu stă în rădăcina
   depozitului.
3. Framework Preset se detectează singur: **Next.js**. Nu schimba nimic la
   Build Command; îl ia din `vercel.json`.

## 3. Pune variabilele de mediu

În **Settings → Environment Variables** adaugă, pentru toate mediile
(Production, Preview, Development):

| Variabilă      | Valoare                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL` | Completată automat la pasul 1, dacă ai folosit Storage din Vercel.       |
| `AUTH_SECRET`  | Un șir lung și aleatoriu. Generează-l cu comanda de mai jos.             |
| `TMDB_API_KEY` | Cheia gratuită de la <https://www.themoviedb.org/settings/api>.          |
| `SMS_PROVIDER` | `console` la început; `smso` când ai contract SMS.                       |
| `SMSO_API_KEY` | Doar dacă `SMS_PROVIDER=smso`.                                           |
| `SMSO_SENDER`  | Numele afișat ca expeditor, ex. `CinemaSLT`.                             |

Pentru `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> `AUTH_SECRET` semnează sesiunile personalului. Dacă îl schimbi, toată lumea
> este delogată. Nu îl pune niciodată în depozit.

## 4. Deploy

Apasă **Deploy**. Build-ul rulează, în ordine, `prisma generate`,
`prisma migrate deploy` (creează tabelele în baza goală) și `next build`.

## 5. Creează primul cont de administrator

Baza este goală după primul deploy: nu există niciun utilizator, deci nu te poți
autentifica. Populeaz-o o singură dată, de pe calculatorul tău, cu aceeași
`DATABASE_URL` ca în producție:

```bash
cd cinema-slatina && DATABASE_URL="<url-ul din Vercel>" npm run db:seed
```

Asta creează sălile, meniul barului, conturile `admin` / `casierie` și un
program de test. **Intră imediat în Setări → Conturi personal și schimbă
ambele parole.**

Dacă vrei baza complet goală, fără filmele de test, spune-mi și îți dau un
script care creează doar sălile și contul de administrator.

---

## După ce e online

- Fiecare `git push` pe ramura `main` declanșează un deploy nou.
- Migrările noi de bază de date se aplică automat la deploy
  (`prisma migrate deploy`).
- Domeniu propriu: **Settings → Domains**. Dacă primăria are deja un domeniu,
  se poate lega un subdomeniu de tipul `cinema.slatina.ro`.

## Ce trebuie știut despre costuri

Planul gratuit Vercel (Hobby) acoperă fără probleme traficul unui cinematograf
municipal. Atenție însă: planul Hobby este pentru proiecte necomerciale. Dacă
site-ul devine oficial al primăriei, verifică termenii sau treci pe un plan
plătit.
