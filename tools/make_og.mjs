// Share images (og:image) for App World: site/og/default.png and site/og/<id>.png, 1200x630.
//
//   node tools/make_og.mjs            # every listing with an icon, plus the default image
//   node tools/make_og.mjs atta gomi  # only these listings (and the default image)
//
// Run it after adding or changing listings, then commit site/og/. The site build (site/build.py)
// only copies these PNGs; it never runs a browser. The cards are rendered with Playwright from
// site/apps/*.json and site/icons/*.svg, in the self-hosted Zen Kaku Gothic New (site/static/fonts),
// served by a small local http server. Nothing outside 127.0.0.1 is loaded.
// The designs are kept flat (solid colour panel, linear background) so the PNGs stay around 100-150KB.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const OUT = path.join(SITE, "og");
const PORT = Number(process.env.OG_PORT || 8814);
const PLAYWRIGHT = process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs";
const W = 1200, H = 630;
// Same labels as site/check_listing.py.
const PLATFORMS = { ios: "iPhone", android: "Android", web: "Web" };
const CATEGORIES = { productivity: "仕事・効率化", lifestyle: "暮らし", learning: "学び", health: "健康・運動",
  creative: "創作", dev: "開発者向け", fun: "遊び" };
const HEADLINE = ["AIで作られたアプリが", "ここに集まる。"];
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function loadListings() {
  const apps = [];
  for (const f of fs.readdirSync(path.join(SITE, "apps")).filter((n) => n.endsWith(".json")).sort()) {
    try {
      const a = JSON.parse(fs.readFileSync(path.join(SITE, "apps", f), "utf8"));
      if (!ID_RE.test(a.id) || a.id !== f.slice(0, -5) || a.sample) continue;
      if (!a.icon || !fs.existsSync(path.join(SITE, "icons", `${a.id}.svg`))) continue;
      apps.push(a);
    } catch (err) {
      console.warn(`skip ${f}: ${err.message}`);
    }
  }
  return apps;
}

const BASE_CSS = `
@import url(/fonts.css);
*{box-sizing:border-box}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
body{font-family:"Zen Kaku Gothic New",sans-serif;color:#262728;font-feature-settings:"palt" 1;-webkit-font-smoothing:antialiased;
  background:linear-gradient(180deg,#E6E6E5 0%,#C6C6C5 55%,#A4A4A4 100%)}
.mark{display:flex;align-items:center;gap:12px;font-size:19px;font-weight:700;letter-spacing:.26em;text-transform:uppercase}
.mark svg{width:34px;height:34px;display:block}
.glass{background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.2));border:1.5px solid rgba(255,255,255,.7);
  box-shadow:0 0 0 1px rgba(38,39,40,.06),0 40px 60px -40px rgba(30,30,30,.55)}
.tile{position:relative;border-radius:30%;overflow:hidden;background:var(--c);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.5),0 30px 34px -22px rgba(30,30,30,.55)}
.tile img{display:block;width:100%;height:100%}
.tile::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.45)}
.pill{display:inline-block;font-size:19px;font-weight:500;border:1.5px solid rgba(38,39,40,.24);border-radius:999px;padding:3px 16px;line-height:1.5}
.pill.op{color:#7C4F0E;border-color:rgba(233,162,59,.85);background:rgba(255,246,230,.5)}
.pill.beta{color:#1F5E57;border-color:rgba(31,94,87,.55)}
`;
const MARK = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#262728"/><circle cx="32" cy="32" r="15" fill="none" stroke="#C0C0BF" stroke-width="3"/><circle cx="32" cy="17" r="5" fill="#E9A23B"/></svg>';

// Shrinks .fit elements to fit in data-lines lines (one line must not overflow either). A one-line
// name that still does not fit at data-min may wrap: it then gets data-wrap-lines lines, down to data-wrap-min.
const FIT_JS = `
const over = (el, lines) => {
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  return Math.round(el.scrollHeight / lh) > lines || el.scrollWidth > el.clientWidth + 1;
};
const shrink = (el, lines, min) => {
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (size > min && over(el, lines)) { size -= 1; el.style.fontSize = size + "px"; }
  return !over(el, lines);
};
for (const el of document.querySelectorAll(".fit")) {
  const start = getComputedStyle(el).fontSize;
  if (shrink(el, +el.dataset.lines, +el.dataset.min) || !el.dataset.wrapLines) continue;
  el.classList.add("wrap"); el.style.fontSize = start;
  shrink(el, +el.dataset.wrapLines, +el.dataset.wrapMin);
}`;

function cardHtml(a) {
  const c = COLOR_RE.test(a.color || "") ? a.color : "#909090";
  const badges = (a.operator ? '<span class="pill op">運営</span>' : "") + (a.beta ? '<span class="pill beta">試作中</span>' : "");
  const spec = [PLATFORMS[a.platform] || a.platform, CATEGORIES[a.category] || a.category].filter(Boolean)
    .map((t) => `<span class="pill">${esc(t)}</span>`).join("");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${BASE_CSS}
body{--c:${c}}
.card{position:absolute;inset:36px;border-radius:40px;display:grid;grid-template-columns:470px minmax(0,1fr);align-items:center}
.vis{position:relative;height:calc(100% - 36px);margin:18px;border-radius:28px;background:var(--c);overflow:hidden;display:grid;place-items:center;
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35)}
.orbit{position:absolute;width:390px;height:390px;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.42)}
.orbit::before{content:"";position:absolute;inset:-26%;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.2)}
.orbit::after{content:"";position:absolute;inset:16%;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.28)}
.orbit i{position:absolute;width:16px;height:16px;border-radius:50%;background:#F4F4F2;box-shadow:0 0 0 5px rgba(255,255,255,.22);
  left:calc(50% + 195px * cos(-40deg) - 8px);top:calc(50% + 195px * sin(-40deg) - 8px)}
.vis .tile{width:228px;height:228px;transform:perspective(900px) rotateX(8deg) rotateY(-12deg);
  box-shadow:0 0 0 1.5px rgba(255,255,255,.55),0 36px 40px -20px rgba(0,0,0,.45)}
.main{display:grid;gap:22px;padding:0 60px 0 24px;align-content:center;height:100%;position:relative}
.main .mark{position:absolute;top:46px;left:24px;color:#262728}
.main .foot{position:absolute;bottom:42px;left:24px;font-size:18px;color:#5E5F61;letter-spacing:.06em}
.name{margin:0;font-size:76px;font-weight:700;line-height:1.22;letter-spacing:.01em;white-space:nowrap;overflow:hidden}
.name.wrap{white-space:normal;text-wrap:balance;word-break:auto-phrase;line-height:1.3}
.tag{margin:0;font-size:33px;line-height:1.5;color:#4E4F51;font-weight:500;text-wrap:balance;word-break:auto-phrase}
.badges{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
</style></head><body>
<div class="card glass">
  <div class="vis"><div class="orbit"><i></i></div><div class="tile"><img src="/icons/${esc(a.id)}.svg" alt=""></div></div>
  <div class="main">
    <div class="mark">${MARK}App World</div>
    <h1 class="name fit" data-lines="1" data-min="50" data-wrap-lines="2" data-wrap-min="34">${esc(a.name)}</h1>
    <p class="tag fit" data-lines="2" data-min="24">${esc(a.tagline)}</p>
    <div class="badges">${badges}${spec}</div>
    <div class="foot">AIで作られたアプリが集まる場所</div>
  </div>
</div></body></html>`;
}

// A sphere of icons (like the home page's hero): points on a Fibonacci sphere, front half only.
const CX = 902, CY = 315;
function sphere(apps) {
  const n = 40, cx = CX, cy = CY, R = 226, tilt = 0.42, out = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), th = i * 2.399963 + 0.6;
    let x = r * Math.cos(th), z = r * Math.sin(th);
    const y2 = y * Math.cos(tilt) - z * Math.sin(tilt); z = y * Math.sin(tilt) + z * Math.cos(tilt);
    if (z < 0.12) continue;
    const a = apps[i % apps.length], depth = z, s = Math.round(38 + 56 * depth);
    out.push({ a, z, s, x: Math.round(cx + x * R - s / 2), y: Math.round(cy - y2 * R - s / 2), o: (0.55 * (1 - depth)).toFixed(2) });
  }
  out.sort((p, q) => p.z - q.z);
  return out.map((p) => {
    const c = COLOR_RE.test(p.a.color || "") ? p.a.color : "#909090";
    return `<div class="tile s" data-c="${c}" data-x="${p.x}" data-y="${p.y}" data-s="${p.s}" data-o="${p.o}"><img src="/icons/${esc(p.a.id)}.svg" alt=""></div>`;
  }).join("");
}

function defaultHtml(apps) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${BASE_CSS}
.ring{position:absolute;left:${CX - 266}px;top:${CY - 266}px;width:532px;height:532px;border-radius:50%;
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.7),0 0 0 1px rgba(38,39,40,.06);
  background:rgba(255,255,255,.14)}
.ring i{position:absolute;width:16px;height:16px;border-radius:50%;background:#E9A23B;box-shadow:0 0 18px 5px rgba(233,162,59,.55);
  left:calc(50% + 266px * cos(-128deg) - 8px);top:calc(50% + 266px * sin(-128deg) - 8px)}
.s{position:absolute;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5),0 14px 16px -12px rgba(30,30,30,.5)}
.s::after{background:rgba(198,198,197,var(--v))}
.copy{position:absolute;left:84px;top:0;bottom:0;width:560px;display:grid;align-content:center;gap:30px}
.copy .mark{position:absolute;top:62px;left:0}
h1{margin:0;font-size:54px;font-weight:500;line-height:1.42;letter-spacing:.01em}
h1 span{display:block;white-space:nowrap}
.sub{margin:0;font-size:25px;color:#4E4F51;line-height:1.7}
.foot{position:absolute;left:84px;bottom:56px;display:flex;gap:10px}
</style></head><body>
<div class="ring"><i></i></div>
${sphere(apps)}
<div class="copy">
  <div class="mark">${MARK}App World</div>
  <h1>${HEADLINE.map((l) => `<span>${esc(l)}</span>`).join("")}</h1>
  <p class="sub">あなたが最初のユーザーに。<br>まだ誰も知らないアプリがここにある。</p>
</div>
<div class="foot"><span class="pill">iPhone</span><span class="pill">Android</span><span class="pill">Web</span><span class="pill op">掲載は無料</span></div>
</body></html>`;
}
// Positions for the sphere tiles (kept out of the markup so the template stays readable).
const SPHERE_JS = `
for (const t of document.querySelectorAll(".s")) {
  Object.assign(t.style, { left: t.dataset.x + "px", top: t.dataset.y + "px", width: t.dataset.s + "px",
    height: t.dataset.s + "px" });
  t.style.setProperty("--v", t.dataset.o);
  t.style.setProperty("--c", t.dataset.c);
}`;

const TYPES = { ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
function serve(pages) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const p = decodeURIComponent(url.pathname);
    if (pages.has(p)) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(pages.get(p));
    }
    let file = null;
    if (p === "/fonts.css") file = path.join(SITE, "static", "fonts.css");
    else if (/^\/fonts\/[\w.-]+\.woff2$/.test(p)) file = path.join(SITE, "static", p);
    else if (/^\/icons\/[a-z0-9-]+\.svg$/.test(p)) file = path.join(SITE, p);
    if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}

async function main() {
  const only = process.argv.slice(2);
  const all = loadListings();
  const apps = only.length ? all.filter((a) => only.includes(a.id)) : all;
  fs.mkdirSync(OUT, { recursive: true });
  const pages = new Map([["/card/__default", defaultHtml(all)], ...apps.map((a) => [`/card/${a.id}`, cardHtml(a)])]);
  const server = serve(pages);
  await new Promise((ok) => server.listen(PORT, "127.0.0.1", ok));
  const { chromium } = await import(PLAYWRIGHT);
  const browser = await chromium.launch();
  const written = [];
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.route("**/*", (route) => (new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort()));
    for (const [route] of pages) {
      const id = route.slice("/card/".length);
      await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: "networkidle" });
      await page.evaluate(SPHERE_JS);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(FIT_JS);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
      const file = path.join(OUT, `${id === "__default" ? "default" : id}.png`);
      await page.screenshot({ path: file, type: "png" });
      written.push(file);
    }
  } finally {
    await browser.close();
    server.close();
  }
  for (const f of written) console.log(`${path.relative(ROOT, f)}  ${(fs.statSync(f).size / 1024).toFixed(0)}KB`);
}

main().catch((err) => { console.error(err); process.exit(1); });
