/**
 * Agentul de trailere — rulează în fundal pe calculatorul lui Teo, din
 * `D:\Cinema\LiveUpdates`, și pornește singur cu Windows-ul.
 *
 * În administrarea site-ului, butonul „Pune trailerele” scrie o cerere în baza
 * de date (tabelul TrailerJob). Agentul verifică la câteva secunde, preia
 * cererea și, pentru fiecare film cu proiecții de azi încolo care are link
 * YouTube dar nu are încă fișierul potrivit:
 *   1. trage clipul cu yt-dlp (H.264, maxim 720p) într-un folder temporar;
 *   2. îl urcă în Vercel Blob (privat; site-ul semnează linkuri temporare);
 *   3. îl leagă de film în baza de date;
 *   4. șterge fișierul de pe calculator.
 * Tot ce face scrie în jurnalul cererii, care se vede live în administrare.
 * Tot la câteva secunde lasă un „semn de viață”, ca administrarea să știe dacă
 * agentul e pornit.
 *
 * De ce pe calculator și nu pe server: YouTube blochează serverele (Vercel,
 * GitHub) și pe Vercel nu se poate rula yt-dlp.
 *
 * Se construiește într-un singur fișier cu `npm run agent:build`; setările
 * (baza de date, Blob, căile spre yt-dlp și ffprobe) stau în `config.env`,
 * lângă agent.
 */
import { spawn } from "node:child_process";
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { hostname } from "node:os";
import path from "node:path";
import { put } from "@vercel/blob";
import pg from "pg";

const VERSION = "1";
const HOME = path.dirname(process.argv[1] ?? ".");
const TEMP = path.join(HOME, "temp");
const LOG_FILE = path.join(HOME, "agent.log");
const POLL_MS = 10_000;
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
const NODE = process.execPath;
if (config.BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = config.BLOB_READ_WRITE_TOKEN;

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
  const [yt, ff] = await Promise.all([run(YTDLP, ["--version"]), run(FFPROBE, ["-version"])]);
  if (yt.code !== 0) return finishJob(jobId, "FAILED", "yt-dlp nu e instalat pe calculator").then(() => say("✗ yt-dlp lipsește"));
  if (ff.code !== 0) return finishJob(jobId, "FAILED", "ffmpeg nu e instalat pe calculator").then(() => say("✗ ffmpeg lipsește"));
  if (!process.env.BLOB_READ_WRITE_TOKEN) return finishJob(jobId, "FAILED", "lipsește tokenul Vercel Blob din config.env").then(() => say("✗ lipsește tokenul Blob"));

  const movies = await currentMovies();
  const todo = movies.filter((m) => youtubeId(m.trailerUrl) && !(m.trailerFileUrl && m.trailerFileSource === m.trailerUrl));
  const need = todo.length === 0 ? "niciunul nu are" : todo.length === 1 ? "unul are" : `${todo.length} au`;
  await say(`▶ ${movies.length === 1 ? "un film" : `${movies.length} filme`} în program, ${need} nevoie de trailer · yt-dlp ${yt.out.trim()}`);
  for (const m of movies) if (!youtubeId(m.trailerUrl)) await say(`· ${m.title}: linkul nu e de YouTube, îl sar`);

  mkdirSync(TEMP, { recursive: true });
  let done = 0;
  const failed: string[] = [];
  for (const m of todo) {
    const id = youtubeId(m.trailerUrl)!;
    const file = path.join(TEMP, `${m.slug}.mp4`);
    try {
      await say(`↓ ${m.title}: trag de pe YouTube…`);
      const height = await download(m.slug, m.trailerUrl, file, say);
      const mb = (statSync(file).size / 1e6).toFixed(1);
      await say(`↑ ${m.title}: ${height}p, ${mb} MB — urc…`);
      const blob = await put(`trailere/${m.slug}-${id}.mp4`, createReadStream(file), {
        access: "private",
        contentType: "video/mp4",
        addRandomSuffix: false,
        allowOverwrite: true,
        multipart: true,
      });
      await pool.query(`UPDATE "Movie" SET "trailerFileUrl" = $1, "trailerFileSource" = $2, "updatedAt" = now() WHERE id = $3`, [blob.url, m.trailerUrl, m.id]);
      done++;
      await say(`✓ ${m.title}: pus pe site`);
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 200);
      failed.push(m.title);
      await say(`✗ ${m.title}: ${msg}`);
    } finally {
      rmSync(file, { force: true });
    }
  }
  rmSync(TEMP, { recursive: true, force: true });

  if (!todo.length) return finishJob(jobId, "DONE", "Toate trailerele erau deja puse.");
  const count = (n: number, one: string, many: string) => (n === 1 ? `un trailer ${one}` : `${n} trailere ${many}`);
  const summary = `${count(done, "pus", "puse")}${failed.length ? `, ${count(failed.length, "eșuat", "eșuate")} (${failed.join(", ")})` : ""}. Televizoarele le iau în cel mult un minut.`;
  if (failed.length) await say("Sfat: dacă erorile spun 403 sau „Sign in”, yt-dlp trebuie actualizat (yt-dlp -U, ca administrator).");
  await finishJob(jobId, failed.length && !done ? "FAILED" : "DONE", summary);
  await say(`■ ${summary}`);
}

/* ------------------------------ bucla ------------------------------ */

let busy = false;

async function tick() {
  if (busy) return;
  busy = true;
  try {
    await heartbeat("liber");
    const jobId = await claimJob();
    if (jobId) {
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
    }
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
  log(`agent pornit (v${VERSION}, ${hostname()})`);
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
