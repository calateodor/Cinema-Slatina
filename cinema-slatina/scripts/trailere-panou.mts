/**
 * Panoul de trailere — rulează pe computerul lui Teo, nu pe site.
 *
 *   npm run trailere        (sau dublu-click pe Trailere.bat)
 *
 * Două butoane, în ordine:
 *   1. „Ia trailere”     – doar pentru filmele în curs (cu proiecții de azi
 *                          încolo, în săptămâni publicate) care au link YouTube în
 *                          panoul de administrare: trage clipul cu yt-dlp
 *                          (H.264, max 720p) în `../trailere/` și îl urcă în
 *                          Vercel Blob. Nimic nu se schimbă încă pe site.
 *   2. „Updatează site”  – verifică fișierele urcate și le trece în baza de
 *                          date; televizoarele trec pe ele în cel mult un minut
 *                          (pagina de afișaj se reîmprospătează singură).
 *
 * De ce local: YouTube blochează serverele (Vercel), iar yt-dlp stă aici.
 * Panoul ascultă doar pe 127.0.0.1, deci nu e vizibil în rețea.
 *
 * Un fișier se potrivește unui film doar cât link-ul YouTube din bază e cel
 * din care a fost tras; dacă adminul schimbă link-ul, fișierul vechi nu se mai
 * folosește și „Ia trailere” îl trage din nou.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { put } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const PORT = Number(process.env.TRAILERE_PORT ?? 4310);
const ROOT = path.resolve(import.meta.dirname, "..");
const FOLDER = path.resolve(ROOT, "..", "trailere");
const MANIFEST = path.join(FOLDER, "manifest.json");
/** Încercăm clienții YouTube în ordine; primul care dă măcar 480p câștigă. */
const CLIENTS: (string | null)[] = [null, "web_embedded", "mweb", "tv"];
const FORMAT = "bv*[vcodec^=avc1][height<=720]+ba[acodec^=mp4a]/b[vcodec^=avc1][height<=720]/b[ext=mp4][height<=720]";
const MIN_GOOD_HEIGHT = 480;

mkdirSync(FOLDER, { recursive: true });

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

/* ------------------------------ stare ------------------------------ */

type Entry = {
  source: string;
  file: string;
  height?: number;
  bytes?: number;
  blobUrl?: string;
  uploadedAt?: string;
};
type Manifest = Record<string, Entry>;

function readManifest(): Manifest {
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;
  } catch {
    return {};
  }
}
function writeManifest(m: Manifest) {
  const tmp = `${MANIFEST}.tmp`;
  writeFileSync(tmp, JSON.stringify(m, null, 2));
  renameSync(tmp, MANIFEST);
}

const lastError = new Map<string, string>();
const logLines: string[] = [];
let running: "ia" | "update" | null = null;

function log(text: string) {
  const line = `${new Date().toLocaleTimeString("ro-RO")}  ${text}`;
  logLines.push(line);
  if (logLines.length > 400) logLines.shift();
  console.log(line);
}

const youtubeId = (url: string | null) =>
  url?.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] ?? null;

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
  const r = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=height", "-of", "csv=p=0", file]);
  return Number(r.out.trim()) || 0;
}

async function tools() {
  const [yt, ff] = await Promise.all([run("yt-dlp", ["--version"]), run("ffprobe", ["-version"])]);
  return {
    ytdlp: yt.code === 0 ? yt.out.trim() : null,
    ffmpeg: ff.code === 0,
    blobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  };
}

/** Trage clipul în `file`; întoarce înălțimea obținută sau aruncă eroare. */
async function download(slug: string, url: string, file: string): Promise<number> {
  const tmpDir = path.join(FOLDER, "_tmp");
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  let best: { height: number; file: string } | null = null;
  let lastErr = "";
  for (const client of CLIENTS) {
    const out = path.join(tmpDir, `${slug}-${client ?? "implicit"}.%(ext)s`);
    const args = ["--no-playlist", "--no-progress", "-q", "--no-warnings", "--js-runtimes", "node", "-f", FORMAT, "--merge-output-format", "mp4", "-o", out];
    if (client) args.push("--extractor-args", `youtube:player_client=${client}`);
    args.push(url);
    log(`  ${slug}: încerc ${client ?? "clientul implicit"}…`);
    const r = await run("yt-dlp", args);
    const got = path.join(tmpDir, `${slug}-${client ?? "implicit"}.mp4`);
    if (r.code !== 0 || !existsSync(got)) {
      lastErr = (r.err.trim().split("\n").pop() ?? "").replace(/^ERROR:\s*/, "").slice(0, 160) || `cod ${r.code}`;
      continue;
    }
    const height = await probeHeight(got);
    if (!best || height > best.height) best = { height, file: got };
    if (height >= MIN_GOOD_HEIGHT) break;
  }
  if (!best) {
    rmSync(tmpDir, { recursive: true, force: true });
    throw new Error(lastErr || "yt-dlp nu a reușit");
  }
  renameSync(best.file, file);
  rmSync(tmpDir, { recursive: true, force: true });
  return best.height;
}

/* ------------------------------ filme ------------------------------ */

async function movies() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await db.movie.findMany({
    where: { isArchived: false, trailerUrl: { not: null } },
    select: {
      slug: true,
      title: true,
      trailerUrl: true,
      trailerFileUrl: true,
      trailerFileSource: true,
      // „în curs”: are proiecții de azi încolo, într-o săptămână publicată
      screenings: {
        where: { startsAt: { gte: today }, isCancelled: false, week: { isPublished: true } },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { title: "asc" },
  });
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    source: r.trailerUrl as string,
    videoId: youtubeId(r.trailerUrl),
    inProgram: r.screenings.length > 0,
    dbFile: r.trailerFileUrl,
    dbSource: r.trailerFileSource,
  }));
}

type Row = Awaited<ReturnType<typeof movies>>[number];
type Stage = "publicat" | "gata" | "local" | "de-tras" | "in-afara" | "fara-link" | "eroare";

function stageOf(m: Row, manifest: Manifest): { stage: Stage; text: string } {
  const e = manifest[m.slug];
  const fresh = e && e.source === m.source && existsSync(path.join(FOLDER, e.file));
  const err = lastError.get(m.slug);
  if (!m.videoId) return { stage: "fara-link", text: "linkul nu e de YouTube" };
  if (m.dbFile && m.dbSource === m.source) return { stage: "publicat", text: "publicat pe site" };
  // doar filmele din curs: altfel nici nu se trag, nici nu se urcă
  if (!m.inProgram) return { stage: "in-afara", text: "nu e în program, nu se urcă" };
  if (fresh && e.blobUrl) return { stage: "gata", text: "urcat, gata de publicat → apasă „Updatează site”" };
  if (fresh) return { stage: "local", text: "tras pe calculator, încă neurcat" };
  if (err) return { stage: "eroare", text: `eșuat: ${err}` };
  return { stage: "de-tras", text: "de tras" };
}

/* ------------------------------ acțiuni ------------------------------ */

async function actionIa() {
  const t = await tools();
  if (!t.ytdlp) return log("✗ yt-dlp nu e instalat sau nu e în PATH.");
  if (!t.ffmpeg) return log("✗ ffmpeg/ffprobe lipsește din PATH (e nevoie ca să lipim video și sunet).");
  const manifest = readManifest();
  const list = await movies();
  let pulled = 0;
  let uploaded = 0;
  let failed = 0;
  log(`▶ Ia trailere · ${list.length} filme cu link, yt-dlp ${t.ytdlp}`);

  for (const m of list) {
    const s = stageOf(m, manifest);
    if (s.stage === "publicat" || s.stage === "in-afara" || s.stage === "fara-link") {
      if (s.stage !== "in-afara") log(`= ${m.title}: ${s.text}`);
      continue;
    }
    lastError.delete(m.slug);
    const file = `${m.slug}.mp4`;
    const full = path.join(FOLDER, file);
    let entry = manifest[m.slug];
    try {
      if (!entry || entry.source !== m.source || !existsSync(full)) {
        log(`↓ ${m.title}: trag de pe YouTube…`);
        const height = await download(m.slug, m.source, full);
        entry = { source: m.source, file, height, bytes: statSync(full).size };
        manifest[m.slug] = entry;
        writeManifest(manifest);
        pulled++;
        log(`✓ ${m.title}: ${height}p, ${(entry.bytes! / 1e6).toFixed(1)} MB`);
      }
      if (!entry.blobUrl) {
        if (!t.blobToken) {
          log(`• ${m.title}: rămâne pe calculator (lipsește BLOB_READ_WRITE_TOKEN în .env.local)`);
          continue;
        }
        log(`↑ ${m.title}: urc în Vercel Blob…`);
        const result = await put(`trailere/${m.slug}-${m.videoId}.mp4`, createReadStream(full), {
          access: "public",
          contentType: "video/mp4",
          addRandomSuffix: false,
          allowOverwrite: true,
          multipart: true,
        });
        entry.blobUrl = result.url;
        entry.uploadedAt = new Date().toISOString();
        writeManifest(manifest);
        uploaded++;
        log(`✓ ${m.title}: urcat`);
      }
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      lastError.set(m.slug, msg.slice(0, 160));
      log(`✗ ${m.title}: ${msg.slice(0, 200)}`);
    }
  }
  log(`■ Gata: ${pulled} trase, ${uploaded} urcate, ${failed} eșuate.${uploaded || pulled ? " Urmează „Updatează site”." : ""}`);
}

async function actionUpdate(dry = false) {
  const manifest = readManifest();
  const list = await movies();
  let set = 0;
  let cleared = 0;
  log(`▶ Updatează site${dry ? " (probă, nu scrie nimic)" : ""}`);

  for (const m of list) {
    const e = manifest[m.slug];
    const fresh = m.inProgram && e && e.source === m.source && e.blobUrl;
    if (fresh && !(m.dbFile === e.blobUrl && m.dbSource === m.source)) {
      if (!dry) {
        // nu publicăm un link care nu răspunde: televizorul ar rămâne fără clip
        const head = await fetch(e.blobUrl!, { method: "HEAD" }).catch(() => null);
        const type = head?.headers.get("content-type") ?? "";
        if (!head?.ok || !type.startsWith("video/")) {
          log(`✗ ${m.title}: fișierul urcat nu răspunde (${head?.status ?? "fără rețea"}), nu îl public`);
          continue;
        }
      }
      if (!dry) await db.movie.update({ where: { slug: m.slug }, data: { trailerFileUrl: e.blobUrl, trailerFileSource: m.source } });
      set++;
      log(`✓ ${m.title}: acum se folosește fișierul`);
    } else if (m.dbFile && m.dbSource !== m.source) {
      // link-ul YouTube s-a schimbat: fișierul vechi nu mai corespunde
      if (!dry) await db.movie.update({ where: { slug: m.slug }, data: { trailerFileUrl: null, trailerFileSource: null } });
      cleared++;
      log(`– ${m.title}: link nou, fișierul vechi e scos (se trage din nou)`);
    }
  }
  log(set || cleared ? `■ Gata: ${set} publicate, ${cleared} scoase. Televizoarele se schimbă în cel mult un minut.` : "■ Nimic de publicat: totul e la zi.");
}

async function job(kind: "ia" | "update", fn: () => Promise<void>) {
  if (running) return false;
  running = kind;
  fn()
    .catch((e) => log(`✗ Eroare: ${e instanceof Error ? e.message : e}`))
    .finally(() => {
      running = null;
    });
  return true;
}

/* ------------------------------ pagina ------------------------------ */

const PAGE = `<!doctype html><html lang="ro"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trailere — Cinema Slatina</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0a0a0b;color:#f4f1e8;font:16px/1.45 system-ui,Segoe UI,sans-serif;padding:28px;max-width:1100px;margin-inline:auto}
h1{margin:0 0 4px;font-size:28px}
.sub{color:#9a968a;margin:0 0 20px}
.bar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:0 0 16px}
button{font:inherit;font-weight:700;border:0;border-radius:12px;padding:14px 22px;cursor:pointer;color:#14110a;background:#ffde59;box-shadow:0 8px 24px -10px #ffde59}
button.sec{background:#ff7a1a;box-shadow:0 8px 24px -10px #ff7a1a}
button:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.pill{font-size:13px;padding:4px 10px;border-radius:99px;background:#1c1c20;border:1px solid #2a2a30}
.ok{color:#7dffa0}.bad{color:#ff6b5e}
table{width:100%;border-collapse:collapse;margin:8px 0 18px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #222}
th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9a968a}
.s-publicat{color:#7dffa0}.s-gata{color:#ffde59}.s-local{color:#ff9d4d}.s-eroare{color:#ff6b5e}.s-de-tras{color:#f4f1e8}.s-in-afara,.s-fara-link{color:#6d6a60}
pre{background:#000;border:1px solid #222;border-radius:12px;padding:14px;height:300px;overflow:auto;margin:0;font:13px/1.5 ui-monospace,Consolas,monospace;color:#cfe9d4;white-space:pre-wrap}
.hint{background:#241b0a;border:1px solid #5a4410;border-radius:12px;padding:12px 14px;margin:0 0 16px;color:#ffe9a3}
</style>
<h1>Trailere</h1>
<p class="sub">Pas 1: trage clipurile și le urcă. Pas 2: le pune pe site. Panoul merge doar pe acest calculator.</p>
<div id="hint"></div>
<div class="bar">
  <button id="ia">Ia trailere</button>
  <button id="update" class="sec">Updatează site</button>
  <span id="tools"></span>
</div>
<table><thead><tr><th>Film</th><th>Stare</th><th>Fișier</th></tr></thead><tbody id="rows"></tbody></table>
<pre id="log">Se încarcă…</pre>
<script>
const $=id=>document.getElementById(id);
let busy=false;
async function post(path){const r=await fetch(path,{method:"POST"});return r.json()}
$("ia").onclick=()=>post("/api/ia");
$("update").onclick=()=>post("/api/update");
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
async function tick(){
  try{
    const s=await (await fetch("/api/state")).json();
    busy=!!s.running;
    $("ia").disabled=busy;$("update").disabled=busy;
    $("ia").textContent=s.running==="ia"?"Se trage…":"Ia trailere";
    $("update").textContent=s.running==="update"?"Se publică…":"Updatează site";
    const t=s.tools;
    $("tools").innerHTML=[
      ["yt-dlp",!!t.ytdlp],["ffmpeg",t.ffmpeg],["Vercel Blob",t.blobToken]
    ].map(([n,v])=>'<span class="pill '+(v?"ok":"bad")+'">'+(v?"✓":"✗")+" "+n+"</span>").join(" ");
    $("hint").innerHTML=t.blobToken?"":'<p class="hint"><b>Lipsește Vercel Blob.</b> Clipurile se trag pe calculator, dar nu se pot urca. Creează un Blob store în Vercel (Storage → Create → Blob), copiază valoarea <code>BLOB_READ_WRITE_TOKEN</code> într-o linie nouă în <code>cinema-slatina/.env.local</code> și repornește panoul.</p>';
    $("rows").innerHTML=s.rows.map(r=>"<tr><td>"+esc(r.title)+'</td><td class="s-'+r.stage+'">'+esc(r.text)+"</td><td>"+(r.size?esc(r.size):"")+"</td></tr>").join("");
    const el=$("log"),atEnd=el.scrollTop+el.clientHeight>=el.scrollHeight-30;
    el.textContent=s.log.join("\\n")||"Nicio acțiune încă.";
    if(atEnd)el.scrollTop=el.scrollHeight;
  }catch(e){$("log").textContent="Panoul s-a oprit. Pornește-l din nou (Trailere.bat)."}
}
tick();setInterval(tick,1500);
</script></html>`;

/* ------------------------------ server ------------------------------ */

const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

createServer(async (req, res) => {
  const send = (code: number, body: unknown, type = "application/json") => {
    res.writeHead(code, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  };
  // doar din browserul acestui calculator (împotriva DNS rebinding / CSRF)
  if (!ALLOWED_HOSTS.has(req.headers.host ?? "")) return send(403, { error: "host" });
  const origin = req.headers.origin;
  if (req.method === "POST" && origin && !ALLOWED_HOSTS.has(new URL(origin).host)) return send(403, { error: "origin" });

  try {
    if (req.method === "GET" && req.url === "/") return send(200, PAGE, "text/html");
    if (req.method === "GET" && req.url === "/api/state") {
      const [list, t] = await Promise.all([movies(), tools()]);
      const manifest = readManifest();
      const rows = list.map((m) => {
        const s = stageOf(m, manifest);
        const e = manifest[m.slug];
        const size = e?.bytes ? `${e.height ?? "?"}p · ${(e.bytes / 1e6).toFixed(1)} MB` : "";
        return { title: m.title, stage: s.stage, text: s.text, size };
      });
      return send(200, { running, tools: t, rows, log: logLines });
    }
    if (req.method === "POST" && req.url === "/api/ia") return send(200, { started: await job("ia", actionIa) });
    if (req.method === "POST" && req.url === "/api/update") return send(200, { started: await job("update", () => actionUpdate()) });
    if (req.method === "POST" && req.url === "/api/update-proba") return send(200, { started: await job("update", () => actionUpdate(true)) });
    return send(404, { error: "nu există" });
  } catch (e) {
    return send(500, { error: e instanceof Error ? e.message : String(e) });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`\nPanou trailere: http://127.0.0.1:${PORT}\nÎnchide fereastra ca să-l oprești.\n`);
});
