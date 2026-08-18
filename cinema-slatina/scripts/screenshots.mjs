/**
 * Capturi de ecran pentru toate paginile, pe desktop și pe mobil.
 *
 * Pornește întâi serverul (`npm run dev`), apoi rulează `npm run shots`.
 * Folosește Chrome-ul instalat pe calculator, nu descarcă alt browser.
 */
import { chromium } from "playwright-core";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SHOT_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("screenshots");

const PUBLIC_PAGES = [
  { slug: "acasa", url: "/" },
  { slug: "program", url: "/program" },
  { slug: "filme", url: "/filme" },
  { slug: "film-detaliu", url: "/filme/misiune-imposibila-rafuiala-mortala" },
  { slug: "bar", url: "/bar" },
  { slug: "regulament", url: "/regulament" },
  { slug: "contact", url: "/contact" },
  { slug: "autentificare", url: "/autentificare" },
];

const STAFF_PAGES = [
  { slug: "admin-panou", url: "/admin" },
  { slug: "admin-program", url: "/admin/program" },
  { slug: "admin-filme", url: "/admin/filme" },
  { slug: "admin-rezervari", url: "/admin/rezervari" },
  { slug: "admin-meniu", url: "/admin/meniu" },
  { slug: "admin-anunturi", url: "/admin/anunturi" },
  { slug: "admin-setari", url: "/admin/setari" },
  { slug: "casierie-ghiseu", url: "/casierie" },
  { slug: "casierie-cautare", url: "/casierie/cautare" },
  { slug: "casierie-rezervari", url: "/casierie/rezervari" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobil", width: 390, height: 844, isMobile: true },
];

async function shoot(context, pages, viewportName) {
  const page = await context.newPage();
  for (const target of pages) {
    await page.goto(`${BASE}${target.url}`, { waitUntil: "networkidle" });
    // derulăm toată pagina, ca să se declanșeze aparițiile legate de scroll,
    // apoi revenim sus pentru captura completă
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
    const file = path.join(OUT, `${viewportName}-${target.slug}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("✓", path.relative(process.cwd(), file));
  }
  await page.close();
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome" });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
      isMobile: viewport.isMobile ?? false,
      hasTouch: viewport.isMobile ?? false,
      locale: "ro-RO",
      colorScheme: "dark",
    });

    await shoot(context, PUBLIC_PAGES, viewport.name);

    // autentificare, pentru paginile de personal
    const login = await context.newPage();
    await login.goto(`${BASE}/autentificare`, { waitUntil: "networkidle" });
    await login.fill("#username", process.env.SHOT_USER ?? "admin");
    await login.fill("#password", process.env.SHOT_PASS ?? "admin1234");
    await Promise.all([
      login.waitForURL(/\/admin/, { timeout: 20000 }),
      login.click('button[type="submit"]'),
    ]);
    await login.close();

    await shoot(context, STAFF_PAGES, viewport.name);
    await context.close();
  }

  await browser.close();
  console.log(`\nGata. Capturile sunt în ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
