/**
 * Agentul de trailere — rulează în fundal pe calculatorul lui Teo, din
 * `D:\Cinema\LiveUpdates`, și pornește singur cu Windows-ul.
 *
 * În administrarea site-ului, butonul „Pune trailerele” scrie o cerere în baza
 * de date (tabelul TrailerJob). Agentul întreabă la 30 de secunde ruta
 * /api/trailere a site-ului — NU baza: ruta răspunde dintr-o copie păstrată de
 * Vercel, așa că baza gratuită (Neon) poate sta oprită. Când apare o cerere, o
 * preia și, pentru fiecare film cu proiecții de azi încolo care are link
 * YouTube dar nu are încă fișierul potrivit:
 *   1. trage clipul cu yt-dlp (H.264, maxim 720p) și îl comprimă cu ffmpeg
 *      (cel mult ~1,5 Mbps: cât îi trebuie unui televizor de la intrarea sălii);
 *   2. îl pune în copia lui de GitHub a site-ului, în public/trailere, șterge
 *      trailerele filmelor care nu mai sunt în program și urcă schimbarea;
 *      Vercel republică site-ul, iar fișierele vin de pe CDN-ul lui (nu din
 *      Vercel Blob, al cărui trafic gratuit de 10 GB nu ajunge);
 *   3. așteaptă să apară fișierele pe site, apoi le leagă de filme în bază și
 *      golește copia programului televizoarelor.
 * Tot ce face scrie în jurnalul cererii, care se vede live în administrare.
 * Semnul de viață îl lasă în bază doar la pornire, cât lucrează și o dată la
 * 3 ore.
 *
 * De ce pe calculator și nu pe server: YouTube blochează serverele (Vercel,
 * GitHub) și pe Vercel nu se poate rula yt-dlp.
 *
 * Se construiește într-un singur fișier cu `npm run agent:build`; setările
 * (baza de date, Blob, căile spre yt-dlp și ffprobe) stau în `config.env`,
 * lângă agent.
 */
import { spawn } from "node:child_process";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { hostname } from "node:os";
import path from "node:path";
import pg from "pg";

const VERSION = "2";
const HOME = path.dirname(process.argv[1] ?? ".");
const TEMP = path.join(HOME, "temp");
const LOG_FILE = path.join(HOME, "agent.log");
/** Cât de des întreabă site-ul (nu baza) dacă e vreo cerere. */
const POLL_MS = 30_000;
/** Semnul de viață din bază: rar, ca baza gratuită să poată dormi. */
const HEARTBEAT_MS = 3 * 3600_000;
/** Cât așteptăm republicarea site-ului cu trailerele noi. */
const DEPLOY_WAIT_MS = 15 * 60_000;
/** Portul ține locul unui „lacăt”: o singură copie a agentului rulează. */
const LOCK_PORT = 4311;
const HEARTBEAT_KEY = "trailer_agent";
/** Încercăm clienții YouTube în ordine; primul care dă măcar 480p câștigă. */
const CLIENTS: (string | null)[] = [null, "web_embedded", "mweb", "tv"];
const FORMAT = "bv*[vcodec^=avc1][height<=720]+ba[acodec^=mp4a]/b[vcodec^=avc1][height<=720]/b[ext=mp4][height<=720]";
const MIN_GOOD_HEIGHT = 480;

/* ------------------------------ setări ------------------------------ */

function loadConfig(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
  return out;
}

const config = loadConfig(path.join(HOME, "config.env"));
const YTDLP = config.YTDLP || "yt-dlp";
const FFPROBE = config.FFPROBE || "ffprobe";
const FFMPEG = config.FFMPEG_DIR ? path.join(config.FFMPEG_DIR, "ffmpeg") : "ffmpeg";
const NODE = process.execPath;
// git nu are voie să ceară parola într-o fereastră (agentul rulează ascuns)
process.env.GIT_TERMINAL_PROMPT = "0";
const SITE = (config.SITE_URL || "https://cinema-slatina-cdz2.vercel.app").replace(/\/$/, "");
/** Copia de lucru a depozitului site-ului, doar a agentului. */
const REPO = config.REPO_DIR || path.join(HOME, "site");
const REPO_URL = config.REPO_URL || "https://github.com/calateodor/Cinema-Slatina.git";
const TRAILER_DIR = path.join(REPO, "cinema-slatina", "public", "trailere");

function log(text: string) {
  const line = `${new Date().toISOString()}  ${text}\n`;
  try {
    // jurnalul local nu crește la nesfârșit
    if (existsSync(LOG_FILE) && statSync(LOG_FILE).size > 2_000_000) renameSync(LOG_FILE, `${LOG_FILE}.vechi`);
    appendFileSync(LOG_FILE, line);
  } catch {
    // fără jurnal local nu se oprește nimic
  }
}

/* ------------------------------ unelte ------------------------------ */

function run(cmd: string, args: string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    let out = "";
    let err = "";
    let child;
    try {
      child = spawn(cmd, args, { windowsHide: true });
    } catch (e) {
      resolve({ code: -1, out: "", err: String(e) });
      return;
    }
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => resolve({ code: -1, out, err: err + String(e) }));
    child.on("close", (code) => resolve({ code: code ?? -1, out, err }));
  });
}

async function probeHeight(file: string): Promise<number> {
  const r = await run(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=height", "-of", "csv=p=0", file]);
  return Number(r.out.trim()) || 0;
}

const youtubeId = (url: string | null) => url?.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? null;

/** Trage clipul în `file`; întoarce înălțimea obținută sau aruncă eroare. */
async function download(slug: string, url: string, file: string, say: (t: string) => Promise<void>): Promise<number> {
  const dir = path.join(TEMP, "_lucru");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let best: { height: number; file: string } | null = null;
  let lastErr = "";
  for (const client of CLIENTS) {
    const name = `${slug}-${client ?? "implicit"}`;
    // yt-dlp are nevoie de un runtime JavaScript pentru semnăturile YouTube
    const args = ["--no-playlist", "--no-progress", "-q", "--no-warnings", "--js-runtimes", `node:${NODE}`, "-f", FORMAT, "--merge-output-format", "mp4", "-o", path.join(dir, `${name}.%(ext)s`)];
    if (config.FFMPEG_DIR) args.push("--ffmpeg-location", config.FFMPEG_DIR);
    if (client) args.push("--extractor-args", `youtube:player_client=${client}`);
    args.push(url);
    const r = await run(YTDLP, args);
    const got = path.join(dir, `${name}.mp4`);
    if (r.code !== 0 || !existsSync(got)) {
      lastErr = (r.err.trim().split("\n").pop() ?? "").replace(/^ERROR:\s*/, "").slice(0, 160) || `cod ${r.code}`;
      continue;
    }
    const height = await probeHeight(got);
    if (!best || height > best.height) best = { height, file: got };
    if (height >= MIN_GOOD_HEIGHT) break;
    await say(`  ${height}p prin ${client ?? "clientul implicit"}, încerc o calitate mai bună…`);
  }
  if (!best) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(lastErr || "yt-dlp nu a reușit");
  }
  renameSync(best.file, file);
  rmSync(dir, { recursive: true, force: true });
  return best.height;
}

/** Comprimă clipul pentru televizor: H.264, cel mult 720p și ~1,5 Mbps. */
async function compress(src: string, dest: string) {
  const r = await run(FFMPEG, [
    "-y", "-v", "error", "-i", src,
    "-vf", "scale=-2:'min(720,ih)'",
    "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-maxrate", "1500k", "-bufsize", "3000k",
    "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-ac", "2",
    "-movflags", "+faststart", dest,
  ]);
  if (r.code !== 0 || !existsSync(dest)) throw new Error(`ffmpeg: ${r.err.trim().split("\n").pop() ?? r.code}`);
}

async function git(args: string[], cwd = REPO) {
  const r = await run("git", ["-C", cwd, ...args]);
  if (r.code !== 0) throw new Error(`git ${args[0]}: ${(r.err || r.out).trim().split("\n").pop()}`);
  return r.out.trim();
}

/** Aduce copia agentului la zi cu GitHub (o creează la prima rulare). */
async function syncRepo() {
  if (!existsSync(path.join(REPO, ".git"))) {
    const r = await run("git", ["clone", "--depth", "1", REPO_URL, REPO]);
    if (r.code !== 0) throw new Error(`git clone: ${r.err.trim().split("\n").pop()}`);
    await git(["config", "credential.username", "calateodor"]);
    await git(["config", "user.name", "Agent trailere"]);
    await git(["config", "user.email", "agent-trailere@cinema-slatina.local"]);
  }
  await git(["fetch", "--depth", "1", "origin", "main"]);
  await git(["reset", "--hard", "origin/main"]);
  mkdirSync(TRAILER_DIR, { recursive: true });
}

/** Așteaptă până când fișierul se servește de pe site (după republicare). */
async function waitOnline(file: string, until: number): Promise<boolean> {
  while (Date.now() < until) {
    try {
      const res = await fetch(`${SITE}/trailere/${file}`, { method: "HEAD", cache: "no-store" });
      if (res.ok) return true;
    } catch {
      // rețea căzută: încercăm din nou
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
  return false;
}

/* ------------------------------ baza de date ------------------------------ */

const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 2, idleTimeoutMillis: 30_000 });
pool.on("error", (e) => log(`baza de date: ${e.message}`));

async function heartbeat(state: string) {
  const value = JSON.stringify({ host: hostname(), version: VERSION, state, seenAt: new Date().toISOString() });
  await pool.query(
    `INSERT INTO "Setting" (key, value, "updatedAt") VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now()`,
    [HEARTBEAT_KEY, value],
  );
}

async function claimJob(): Promise<string | null> {
  const r = await pool.query<{ id: string }>(
    `UPDATE "TrailerJob" SET status = 'RUNNING', "startedAt" = now()
     WHERE id = (SELECT id FROM "TrailerJob" WHERE status = 'PENDING' ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING id`,
  );
  return r.rows[0]?.id ?? null;
}

async function appendLog(jobId: string, text: string) {
  const time = new Date().toLocaleTimeString("ro-RO", { timeZone: "Europe/Bucharest" });
  await pool.query(`UPDATE "TrailerJob" SET log = log || $1 WHERE id = $2`, [`${time}  ${text}\n`, jobId]);
  log(text);
}

async function finishJob(jobId: string, status: "DONE" | "FAILED", summary: string) {
  await pool.query(`UPDATE "TrailerJob" SET status = $1, summary = $2, "finishedAt" = now() WHERE id = $3`, [status, summary, jobId]);
}

type MovieRow = { id: string; slug: string; title: string; trailerUrl: string; trailerFileUrl: string | null; trailerFileSource: string | null };

/** Filmele cu proiecții de azi încolo (inclusiv săptămâna pregătită, încă nepublicată). */
async function currentMovies(): Promise<MovieRow[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const r = await pool.query<MovieRow>(
    `SELECT m.id, m.slug, m.title, m."trailerUrl", m."trailerFileUrl", m."trailerFileSource"
     FROM "Movie" m
     WHERE m."isArchived" = false AND m."trailerUrl" IS NOT NULL
       AND EXISTS (SELECT 1 FROM "Screening" s WHERE s."movieId" = m.id AND s."isCancelled" = false AND s."startsAt" >= $1)
     ORDER BY m.title`,
    [today],
  );
  return r.rows;
}

/* ------------------------------ lucrul ------------------------------ */

async function processJob(jobId: string) {
  const say = (t: string) => appendLog(jobId, t);
  const [yt, ff] = await Promise.all([run(YTDLP, ["--version"]), run(FFMPEG, ["-version"])]);
  if (yt.code !== 0) return finishJob(jobId, "FAILED", "yt-dlp nu e instalat pe calculator").then(() => say("✗ yt-dlp lipsește"));
  if (ff.code !== 0) return finishJob(jobId, "FAILED", "ffmpeg nu e instalat pe calculator").then(() => say("✗ ffmpeg lipsește"));

  const movies = await currentMovies();
  const fileOf = (m: MovieRow) => `${m.slug}-${youtubeId(m.trailerUrl)}.mp4`;
  const hasFile = (m: MovieRow) => m.trailerFileUrl === `/trailere/${fileOf(m)}` && m.trailerFileSource === m.trailerUrl;
  const todo = movies.filter((m) => youtubeId(m.trailerUrl) && !hasFile(m));
  const need = todo.length === 0 ? "niciunul nu are" : todo.length === 1 ? "unul are" : `${todo.length} au`;
  await say(`▶ ${movies.length === 1 ? "un film" : `${movies.length} filme`} în program, ${need} nevoie de trailer · yt-dlp ${yt.out.trim()}`);
  for (const m of movies) if (!youtubeId(m.trailerUrl)) await say(`· ${m.title}: linkul nu e de YouTube, îl sar`);

  await say("· aduc site-ul de pe GitHub…");
  await syncRepo();

  // 1. tragem și comprimăm ce lipsește (ce e deja în depozit doar legăm)
  mkdirSync(TEMP, { recursive: true });
  const ready: MovieRow[] = [];
  const failed: string[] = [];
  for (const m of todo) {
    const dest = path.join(TRAILER_DIR, fileOf(m));
    if (existsSync(dest)) {
      ready.push(m);
      continue;
    }
    const raw = path.join(TEMP, `${m.slug}.mp4`);
    try {
      await say(`↓ ${m.title}: trag de pe YouTube…`);
      const height = await download(m.slug, m.trailerUrl, raw, say);
      await say(`⚙ ${m.title}: ${height}p, ${(statSync(raw).size / 1e6).toFixed(1)} MB — comprim pentru televizor…`);
      const small = path.join(TEMP, `${m.slug}-mic.mp4`);
      await compress(raw, small);
      copyFileSync(small, dest);
      await say(`✓ ${m.title}: ${(statSync(dest).size / 1e6).toFixed(1)} MB`);
      ready.push(m);
    } catch (e) {
      failed.push(m.title);
      await say(`✗ ${m.title}: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
    }
  }
  rmSync(TEMP, { recursive: true, force: true });

  // 2. scoatem trailerele filmelor care nu mai sunt în program
  const keep = new Set(movies.filter((m) => youtubeId(m.trailerUrl)).map(fileOf));
  const removed = readdirSync(TRAILER_DIR).filter((f) => f.endsWith(".mp4") && !keep.has(f));
  for (const f of removed) rmSync(path.join(TRAILER_DIR, f));
  if (removed.length) await say(`· scot ${removed.length === 1 ? "un trailer vechi" : `${removed.length} trailere vechi`}`);

  // 3. urcăm pe GitHub; Vercel republică site-ul
  await git(["add", "-A", "cinema-slatina/public/trailere"]);
  const changed = (await git(["status", "--porcelain", "cinema-slatina/public/trailere"])).length > 0;
  if (changed) {
    await say("↑ urc pe GitHub; site-ul se republică (câteva minute)…");
    await git(["commit", "-q", "-m", `Trailere pentru televizoare: ${ready.map((m) => m.title).join(", ") || "curățenie"}`]);
    await git(["push", "-q", "origin", "HEAD:main"]);
  }

  // 4. legăm fișierele de filme abia după ce le servește site-ul
  let done = 0;
  const until = Date.now() + DEPLOY_WAIT_MS;
  for (const m of ready) {
    if (!(await waitOnline(fileOf(m), until))) {
      failed.push(m.title);
      await say(`✗ ${m.title}: site-ul nu l-a publicat în ${DEPLOY_WAIT_MS / 60_000} minute — apasă din nou mai târziu`);
      continue;
    }
    await pool.query(`UPDATE "Movie" SET "trailerFileUrl" = $1, "trailerFileSource" = $2, "updatedAt" = now() WHERE id = $3`, [`/trailere/${fileOf(m)}`, m.trailerUrl, m.id]);
    done++;
    await say(`✓ ${m.title}: pus pe site`);
  }
  // televizoarele iau programul nou pe loc (altfel, în cel mult o jumătate de
  // oră), iar copia cu cererile nu mai arată cererea asta
  await fetch(`${SITE}/api/trailere`, { method: "POST" }).catch(() => {});

  if (!todo.length) return finishJob(jobId, "DONE", "Toate trailerele erau deja puse.");
  const count = (n: number, one: string, many: string) => (n === 1 ? `un trailer ${one}` : `${n} trailere ${many}`);
  const summary = `${count(done, "pus", "puse")}${failed.length ? `, ${count(failed.length, "eșuat", "eșuate")} (${failed.join(", ")})` : ""}. Televizoarele le iau în cel mult un minut.`;
  if (failed.length) await say("Sfat: dacă erorile spun 403 sau „Sign in”, yt-dlp trebuie actualizat (yt-dlp -U, ca administrator).");
  await finishJob(jobId, failed.length && !done ? "FAILED" : "DONE", summary);
  await say(`■ ${summary}`);
}

/* ------------------------------ bucla ------------------------------ */

let busy = false;
/** Cererile deja tratate: copia de pe site le mai poate arăta o vreme. */
const handled = new Set<string>();
let lastBeat = 0;

/** Întreabă site-ul (nu baza) ce cereri așteaptă. */
async function pendingFromSite(): Promise<string[]> {
  const res = await fetch(`${SITE}/api/trailere`, { cache: "no-store" });
  if (!res.ok) throw new Error(`site: HTTP ${res.status}`);
  const data = (await res.json()) as { pending?: string[] };
  return (data.pending ?? []).filter((id) => !handled.has(id));
}

async function tick() {
  if (busy) return;
  busy = true;
  try {
    if (Date.now() - lastBeat > HEARTBEAT_MS) {
      await heartbeat("liber");
      lastBeat = Date.now();
    }
    const pending = await pendingFromSite();
    if (!pending.length) return;
    pending.forEach((id) => handled.add(id));
    // abia acum vorbim cu baza: preluăm cererea
    const jobId = await claimJob();
    if (!jobId) return;
    log(`cerere preluată ${jobId}`);
    await heartbeat("lucrează");
    try {
      await processJob(jobId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await appendLog(jobId, `✗ Eroare: ${msg}`).catch(() => {});
      await finishJob(jobId, "FAILED", `Eroare: ${msg.slice(0, 200)}`).catch(() => {});
    }
    await heartbeat("liber");
    lastBeat = Date.now();
  } catch (e) {
    log(`buclă: ${e instanceof Error ? e.message : e}`);
  } finally {
    busy = false;
  }
}

async function main() {
  if (!config.DATABASE_URL) {
    log("lipsește DATABASE_URL în config.env — agentul se oprește");
    process.exit(1);
  }
  // cererile rămase „în lucru” de la o oprire bruscă a calculatorului
  await pool
    .query(`UPDATE "TrailerJob" SET status = 'FAILED', summary = 'Calculatorul s-a oprit în timpul lucrului. Apasă din nou.', "finishedAt" = now() WHERE status = 'RUNNING'`)
    .catch((e) => log(`curățenie: ${e.message}`));
  log(`agent pornit (v${VERSION}, ${hostname()}, întreabă ${SITE} la ${POLL_MS / 1000} s)`);
  await tick();
  setInterval(tick, POLL_MS);
}

// o singură copie: a doua se oprește singură
const lock = createServer();
lock.once("error", () => {
  log("agentul rulează deja, copia asta se oprește");
  process.exit(0);
});
lock.listen(LOCK_PORT, "127.0.0.1", () => {
  main().catch((e) => {
    log(`pornire eșuată: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
});
