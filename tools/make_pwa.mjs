#!/usr/bin/env node
// App World Lab: make each app installable (home screen) and usable offline.
//
//   node tools/make_pwa.mjs            # every app listed in lab/index.html that has index.html
//   node tools/make_pwa.mjs dot gym    # only these folders (must have index.html)
//
// Per app folder lab/<slug>/ it writes:
//   manifest.webmanifest, icon-180.png (apple-touch-icon), icon-192.png, icon-512.png,
//   icon-maskable-512.png, sw.js
// and adds to index.html (idempotently): <link rel="manifest">, <link rel="apple-touch-icon">,
// apple-mobile-web-app-* metas and <script src="../pwa.js">. Re-running refreshes the cache hash.
// PNGs are rendered from icon.svg with Playwright/Chromium (PLAYWRIGHT env var or the default path).

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LAB = join(ROOT, "lab");
const PLAYWRIGHT = process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs";
const SW_VERSION = "1"; // bump when the sw.js template below changes
const ICONS = ["icon.svg", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

// ---------- pick apps ----------
const args = process.argv.slice(2);
const listed = new Set([...readFileSync(join(LAB, "index.html"), "utf8").matchAll(/href="([a-z0-9-]+)\/"/g)].map((m) => m[1]));
let slugs;
if (args.length) {
  slugs = args;
  for (const s of slugs) if (!existsSync(join(LAB, s, "index.html"))) { console.error(`lab/${s}/index.html がありません`); process.exit(1); }
} else {
  slugs = readdirSync(LAB).filter((d) => statSync(join(LAB, d)).isDirectory() && existsSync(join(LAB, d, "index.html")) && listed.has(d)).sort();
  const skipped = readdirSync(LAB).filter((d) => statSync(join(LAB, d)).isDirectory() && !slugs.includes(d));
  if (skipped.length) console.log("skip (index.html がない／lab/index.html に未掲載):", skipped.join(" "));
}

// ---------- helpers ----------
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const chars = (s) => [...s].length;

function readApp(slug) {
  const dir = join(LAB, slug);
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "").trim();
  if (!title) throw new Error(`${slug}: <title> がありません`);
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "");
  // first theme-color (the light one when there are media variants)
  const theme = (html.match(/<meta name="theme-color" content="([^"]*)"/) || [])[1] || "#ffffff";
  if (!existsSync(join(dir, "icon.svg"))) throw new Error(`${slug}: icon.svg がありません`);
  return { slug, dir, html, title, desc, theme };
}

// full-bleed variant of the icon: square off the background rect (first rect that covers the viewBox)
function fullBleed(svg) {
  const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1];
  if (!vb) return null;
  const [x, y, w, h] = vb.trim().split(/[\s,]+/).map(Number);
  const m = svg.match(/<rect\b[^>]*>/);
  if (!m) return null;
  const tag = m[0];
  const a = (n) => { const r = tag.match(new RegExp(`\\s${n}="([^"]*)"`)); return r ? Number(r[1]) : 0; };
  if (a("x") !== x || a("y") !== y || a("width") !== w || a("height") !== h) return null;
  return svg.replace(tag, tag.replace(/\s(rx|ry)="[^"]*"/g, ""));
}

// ---------- render PNGs ----------
async function renderAll(apps) {
  const { chromium } = await import(pathToFileURL(PLAYWRIGHT).href);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<!doctype html><title>r</title>");
  for (const app of apps) {
    const svg = readFileSync(join(app.dir, "icon.svg"), "utf8");
    const bleed = fullBleed(svg);
    const out = await page.evaluate(async ({ svg, bleed, bg }) => {
      const load = (s) => new Promise((ok, ng) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => ng(new Error("svg load"));
        i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
      });
      const canvas = (n) => { const c = document.createElement("canvas"); c.width = c.height = n; return c; };
      const png = (c) => c.toDataURL("image/png").split(",")[1];
      const plain = await load(svg);
      const full = bleed ? await load(bleed) : null;
      const res = {};
      // "any" icons: the SVG as drawn (transparent rounded corners)
      for (const n of [192, 512]) { const c = canvas(n); c.getContext("2d").drawImage(plain, 0, 0, n, n); res["icon-" + n + ".png"] = png(c); }
      // square, opaque source of size n
      const square = (n) => {
        const c = canvas(n), g = c.getContext("2d");
        if (full) g.drawImage(full, 0, 0, n, n);
        else { g.fillStyle = bg; g.fillRect(0, 0, n, n); g.drawImage(plain, 0, 0, n, n); }
        return c;
      };
      // apple-touch-icon: opaque square (iOS rounds the corners itself)
      res["icon-180.png"] = png(square(180));
      // maskable: content in the inner 80%, edges extended outward so the background continues
      {
        const N = 512, s = Math.round(N * 0.8), m = (N - s) / 2;
        const src = square(s), c = canvas(N), g = c.getContext("2d");
        g.imageSmoothingEnabled = false;
        if (!full) { g.fillStyle = bg; g.fillRect(0, 0, N, N); }
        else {
          g.drawImage(src, 0, 0, s, 1, m, 0, s, m);          // top
          g.drawImage(src, 0, s - 1, s, 1, m, m + s, s, m);  // bottom
          g.drawImage(src, 0, 0, 1, s, 0, m, m, s);          // left
          g.drawImage(src, s - 1, 0, 1, s, m + s, m, m, s);  // right
          g.drawImage(src, 0, 0, 1, 1, 0, 0, m, m);
          g.drawImage(src, s - 1, 0, 1, 1, m + s, 0, m, m);
          g.drawImage(src, 0, s - 1, 1, 1, 0, m + s, m, m);
          g.drawImage(src, s - 1, s - 1, 1, 1, m + s, m + s, m, m);
        }
        g.imageSmoothingEnabled = true;
        g.drawImage(src, m, m);
        res["icon-maskable-512.png"] = png(c);
      }
      return res;
    }, { svg, bleed, bg: app.theme });
    app.fullBleed = !!bleed;
    for (const [name, b64] of Object.entries(out)) writeIfChanged(join(app.dir, name), Buffer.from(b64, "base64"));
  }
  await browser.close();
}

function writeIfChanged(path, data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (existsSync(path) && readFileSync(path).equals(buf)) return false;
  writeFileSync(path, buf);
  return true;
}

// ---------- manifest ----------
function manifest(app) {
  let short = app.title;
  if (chars(short) > 12) short = [...short].slice(0, 12).join("");
  const m = {
    name: app.title,
    short_name: short,
    description: app.desc,
    lang: "ja",
    dir: "ltr",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: app.theme,
    theme_color: app.theme,
    icons: [
      { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
  app.short = short;
  return JSON.stringify(m, null, 2) + "\n";
}

// ---------- index.html ----------
function patchHtml(app) {
  let h = app.html;
  // remove what an earlier run added
  h = h.replace(/\n?<link rel="manifest"[^>]*>/g, "")
       .replace(/\n?<link rel="apple-touch-icon"[^>]*>/g, "")
       .replace(/\n?<meta name="(?:apple-mobile-web-app-capable|apple-mobile-web-app-title|mobile-web-app-capable)"[^>]*>/g, "")
       .replace(/\n?<script src="\.\.\/pwa\.js"[^>]*><\/script>/g, "");
  const head =
    `\n<link rel="manifest" href="manifest.webmanifest">` +
    `\n<link rel="apple-touch-icon" href="icon-180.png">` +
    `\n<meta name="apple-mobile-web-app-capable" content="yes">` +
    `\n<meta name="mobile-web-app-capable" content="yes">` +
    `\n<meta name="apple-mobile-web-app-title" content="${esc(app.short)}">`;
  const icon = h.match(/<link rel="icon"[^>]*>/);
  if (icon) h = h.replace(icon[0], icon[0] + head);
  else h = h.replace(/<\/head>/, head.slice(1) + "\n</head>");
  // after the last script, or before </body>
  const scripts = [...h.matchAll(/<script src="[^"]*"[^>]*><\/script>/g)];
  if (scripts.length) {
    const last = scripts[scripts.length - 1];
    const at = last.index + last[0].length;
    h = h.slice(0, at) + `\n<script src="../pwa.js"></script>` + h.slice(at);
  } else h = h.replace(/<\/body>/, `<script src="../pwa.js"></script>\n</body>`);
  return h;
}

// files the page needs offline: local scripts/styles referenced by index.html, icons, manifest
function precacheList(app, html) {
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"#?]+)"[^>]*>/g)]
    .map((m) => m[1])
    .filter((u) => !/^[a-z]+:|^\/\//i.test(u) && /\.(js|css|svg|png|webmanifest)$/.test(u) && u !== "../");
  const files = ["./", ...new Set([...refs, ...ICONS, "manifest.webmanifest"])];
  for (const f of files.slice(1)) if (!existsSync(join(app.dir, f))) throw new Error(`${app.slug}: ${f} がありません`);
  const known = new Set(files.map((f) => (f === "./" ? "index.html" : f)));
  const extra = readdirSync(app.dir).filter((f) => !known.has(f) && f !== "sw.js" && statSync(join(app.dir, f)).isFile());
  if (extra.length) console.log(`  ${app.slug}: index.html から参照されないファイル（キャッシュしない）: ${extra.join(" ")}`);
  return files;
}

function swSource(app, files, hash) {
  return `// App World Lab service worker for ${app.slug}/ — generated by tools/make_pwa.mjs. Do not edit by hand.
// Network first (updates arrive as soon as you are online), cached copy when offline. Same-origin only.
"use strict";
const PREFIX = "lab-${app.slug}-";
const CACHE = PREFIX + "${hash}";
const FILES = ${JSON.stringify(files)};
const URLS = new Set(FILES.map((f) => new URL(f, self.location).href));
const INDEX = new URL("./", self.location).href;
const WAIT = 4000;

async function clean(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(FILES.map(async (f) => {
      const res = await fetch(new Request(f, { cache: "reload" }));
      if (!res.ok) throw new Error(f + " " + res.status);
      await c.put(f, await clean(res));
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const nav = req.mode === "navigate";
  const key = nav ? INDEX : url.origin + url.pathname;
  if (!nav && !URLS.has(key)) return;
  e.respondWith(networkFirst(e, req, key));
});

async function networkFirst(e, req, key) {
  const c = await caches.open(CACHE);
  const net = fetch(req).then(async (res) => {
    if (res.ok && res.type === "basic") await c.put(key, await clean(res.clone()));
    return res;
  });
  e.waitUntil(net.then(() => {}, () => {}));
  try {
    return await Promise.race([
      net,
      new Promise((ok) => setTimeout(ok, WAIT)).then(async () => (await c.match(key)) || net),
    ]);
  } catch (err) {
    const hit = await c.match(key);
    if (hit) return hit;
    throw err;
  }
}
`;
}

// ---------- main ----------
const apps = [];
for (const slug of slugs) {
  try { apps.push(readApp(slug)); } catch (e) { console.error(String(e.message || e)); process.exitCode = 1; }
}
await renderAll(apps);
for (const app of apps) {
  writeIfChanged(join(app.dir, "manifest.webmanifest"), manifest(app));
  const html = patchHtml(app);
  writeIfChanged(join(app.dir, "index.html"), html);
  const files = precacheList(app, html);
  const h = createHash("sha256").update("sw" + SW_VERSION + "\0");
  for (const f of files) {
    const p = f === "./" ? join(app.dir, "index.html") : join(app.dir, f);
    h.update(f + "\0").update(readFileSync(p)).update("\0");
  }
  const hash = h.digest("hex").slice(0, 12);
  writeIfChanged(join(app.dir, "sw.js"), swSource(app, files, hash));
  console.log(`${app.slug}: ${app.short} ${hash}${app.fullBleed ? "" : " (アイコンに全面の背景がないため、theme-color の地に描画)"}`);
}
