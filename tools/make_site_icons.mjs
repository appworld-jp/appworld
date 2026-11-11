#!/usr/bin/env node
// App World: home-screen icons for the site itself, rendered from site/static/favicon.svg.
//
//   node tools/make_site_icons.mjs
//
// Writes into site/static/ (copied to dist/ by site/build.py, which never runs a browser):
//   icon-192.png, icon-512.png       rounded tile as drawn (manifest, purpose "any")
//   icon-maskable-512.png            full-bleed square, the mark inside the inner 80% (purpose "maskable")
//   apple-touch-icon.png             180x180 opaque square (iOS rounds the corners itself)
// Run it after changing favicon.svg, then commit the PNGs. Rendered with Playwright/Chromium
// from a data: URL; nothing outside this machine is loaded.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATIC = join(ROOT, "site", "static");
const PLAYWRIGHT = process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs";

const svg = readFileSync(join(STATIC, "favicon.svg"), "utf8");
// the background tile without its rounded corners, for the opaque and maskable icons
const square = svg.replace(/(<rect\b[^>]*?)\s+rx="[^"]*"/, "$1");
if (square === svg) throw new Error("favicon.svg: the background <rect rx> was not found");
const bg = (svg.match(/<rect\b[^>]*\sfill="(#[0-9A-Fa-f]{6})"/) || [])[1];
if (!bg) throw new Error("favicon.svg: the background colour was not found");

const { chromium } = await import(pathToFileURL(PLAYWRIGHT).href);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><title>icons</title>");
const out = await page.evaluate(async ({ svg, square, bg }) => {
  const load = (s) => new Promise((ok, ng) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ng(new Error("svg load"));
    i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  });
  const canvas = (n) => { const c = document.createElement("canvas"); c.width = c.height = n; return c; };
  const png = (c) => c.toDataURL("image/png").split(",")[1];
  const plain = await load(svg), full = await load(square);
  const res = {};
  for (const n of [192, 512]) { const c = canvas(n); c.getContext("2d").drawImage(plain, 0, 0, n, n); res[`icon-${n}.png`] = png(c); }
  { const c = canvas(180); c.getContext("2d").drawImage(full, 0, 0, 180, 180); res["apple-touch-icon.png"] = png(c); }
  {
    // maskable: the square tile fills the canvas; the mark is scaled into the inner 80% (safe zone)
    const N = 512, s = Math.round(N * 0.8), m = (N - s) / 2, c = canvas(N), g = c.getContext("2d");
    g.fillStyle = bg; g.fillRect(0, 0, N, N);
    g.drawImage(full, m, m, s, s);
    res["icon-maskable-512.png"] = png(c);
  }
  return res;
}, { svg, square, bg });
await browser.close();

for (const [name, b64] of Object.entries(out)) {
  const path = join(STATIC, name), buf = Buffer.from(b64, "base64");
  if (existsSync(path) && readFileSync(path).equals(buf)) continue;
  writeFileSync(path, buf);
  console.log("wrote", `site/static/${name}`, buf.length, "bytes");
}
