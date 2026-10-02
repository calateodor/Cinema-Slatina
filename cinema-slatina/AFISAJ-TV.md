# Televizoarele din cinematograf (afișajul programului)

Site-ul are o pagină specială pentru televizoare, fără meniu și fără subsol,
care se actualizează singură. Cutia Android de la televizor doar o deschide
pe tot ecranul, la pornire.

## Linkurile

| Televizor                 | Link                                                      |
| ------------------------- | --------------------------------------------------------- |
| Casierie / hol (ambele săli) | `https://cinema-slatina-cdz2.vercel.app/afisaj`         |
| Intrarea Sălii Roșii      | `https://cinema-slatina-cdz2.vercel.app/afisaj/rosie`     |
| Intrarea Sălii Albastre   | `https://cinema-slatina-cdz2.vercel.app/afisaj/albastra`  |

Trailerul de pe televizoarele sălilor merge fără sunet. Pentru sunet, adaugă
`?sunet=1` la link: `.../afisaj/rosie?sunet=1`.

Ce face pagina singură:

- arată programul de azi; după ultimul film trece pe **PROGRAM MÂINE**;
- filmul care rulează se luminează și primește banda galbenă „Rulează acum”;
  filmele terminate se sting (calculat din oră și durata filmului);
- pe sală, trailerul e al filmului care rulează acum în sala respectivă
  (între filme, al celui care urmează), fără titlul sau butoanele YouTube;
- reia programul din site la fiecare minut (ce publică adminul apare singur)
  și se reîncarcă de tot o dată la 12 ore.

## De ce ai nevoie

- cutia Android (cea din poză, cu telecomanda ei) legată la televizor prin HDMI;
- Wi-Fi (sau cablu de rețea în cutie);
- un **mouse USB** – nu e obligatoriu, dar cu telecomanda e chin;
- un stick USB, doar dacă magazinul din cutie nu are aplicația de mai jos.

## Pași pe cutie

1. **Rețea:** Settings → Wi-Fi → alege rețeaua cinematografului.
2. **Instalează „Fully Kiosk Browser”** (aplicația care ține pagina pe tot
   ecranul și o pornește singură):
   - deschide **App Store** de pe cutie și caută `Fully Kiosk Browser`;
   - dacă nu e acolo: de pe telefon sau calculator intră pe
     `fully-kiosk.com` → Download → ia fișierul `.apk`, pune-l pe un stick
     USB, bagă stickul în cutie, deschide **File Manager / Explorer**, apasă
     pe fișier → **Install** (acceptă „Allow from this source”).
3. **Prima pornire a Fully:** îți cere *Start URL* → scrie linkul
   televizorului (din tabelul de sus). Acceptă permisiunile cerute.
4. **Setările Fully** (meniul se deschide trăgând cu mouse-ul de la marginea
   stângă a ecranului spre dreapta, sau cu tasta **MENU** de pe telecomandă):
   - *Web Content Settings* → **Autoplay Videos: ON** (altfel nu merg
     trailerele);
   - *Device Management* → **Launch on Boot: ON** și **Keep Screen On: ON**;
   - opțional: *Kiosk Mode* (plătit, cca 8 € pe cutie, o singură dată) –
     blochează ieșirea din aplicație cu telecomanda. Fără el merge la fel,
     doar că oricine cu telecomanda poate ieși din pagină.
5. **Fully ca ecran principal:** apasă **Home** pe telecomandă → apare
   „Select a Home app” (ca în poza ta) → alege **Fully Kiosk Browser** →
   **ALWAYS**. De acum, la orice repornire, cutia deschide direct programul.
   Dacă întrebarea nu apare: Settings → Apps → Default apps → Home app.
6. **Televizorul:**
   - oprește stingerea automată (LG: Settings → General → Timers →
     *Auto Off* / *Sleep Timer* → Off);
   - dacă marginile paginii ies din ecran: Picture → Aspect Ratio →
     **Just Scan** (sau *Screen Fit*);
   - pe televizoarele sălilor cu sunet, fixează volumul o dată; pe cel de la
     casierie lasă-l pe mut.

Seara poți stinge doar televizorul; cutia rămâne pornită și dimineața
programul e deja pe ecran când pornești televizorul.

## Fără Fully (varianta rapidă)

Deschide browserul cutiei, scrie linkul, apasă pe ecran complet. Merge, dar
la repornire trebuie redeschis manual și rămâne bara de adresă.

## Dacă ceva nu merge

- **Pagina e goală / „Nicio proiecție programată”:** programul săptămânii nu e
  publicat în admin, sau cutia n-are internet.
- **Trailerul nu pornește:** în Fully, *Autoplay Videos* trebuie să fie ON.
  Cutia din poză e slabă (2 GB RAM) – pe sală trailerul poate merge ușor
  sacadat; lista de la casierie n-are această problemă.
- **Ora e greșită pe televizor:** nu contează, pagina folosește ora
  României de pe server.

## Televizoarele sălilor: săgeata și modelele

Fiecare televizor de sală are un indicator mare, în culoarea sălii, cu o
săgeată: Sala Roșie arată spre stânga, Sala Albastră spre dreapta. Se schimbă
din link:

- `?dir=stanga` sau `?dir=dreapta` – direcția săgeții;
- modelul implicit e trailerul pe tot ecranul (`?model=3`); `?model=1` e
  banda sus, `?model=2` coloana laterală;
- `?sunet=1` – trailerul cu sunet;
- `?calitate=360`, `480` (implicit) sau `720` – rezoluția trailerului. Cutiile
  sunt slabe: dacă sacadează, coboară la 360; dacă merge lin, încearcă 720.

Se pot combina: `.../tv/albastra?model=3&dir=dreapta&sunet=1`.

### Cum se poartă trailerul pe cutiile slabe

Cât timp clipul se încarcă, pe ecran stă imaginea mare a filmului; clipul
rulează ascuns dedesubt și apare abia după ce a mers curat 10 secunde și are
destul încărcat în față. Dacă se poticnește la vedere, imaginea îl acoperă și
așteaptă din nou. După trei poticniri (sau dacă în 2,5 minute nu apucă deloc
să ruleze curat) pagina renunță la clip, rămâne imaginea filmului cu o mișcare
lentă și reîncearcă peste 5 minute sau la filmul următor.

Dacă redarea se poticnește des deși clipul e încărcat (cutia nu-l poate
decoda la calitatea aceea), pagina coboară singură o treaptă de calitate
(480 → 360 → 240), reîncarcă clipul și ține minte o zi treapta care merge pe
televizorul respectiv.

Pentru diagnostic, `?debug=1` scrie pe ecran ce face playerul (versiunea
browserului, viteza rețelei, calitatea primită, fiecare poticnire). O poză cu
ecranul după 1–2 minute spune de ce nu merge clipul pe cutia respectivă.

