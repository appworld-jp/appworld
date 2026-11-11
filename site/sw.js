// App World service worker. Template: site/build.py fills in VERSION and PRECACHE and writes dist/sw.js.
// Network first (a new build shows as soon as you are online), cached copy when offline. Same-origin GET only.
// Nothing is sent anywhere; the cache stays in this browser.
"use strict";
const PREFIX = "appworld-";
const CACHE = PREFIX + "__VERSION__";
// [cache key path, URL to fetch]: pages are keyed as the host serves them (/apps, not /apps.html)
const PRECACHE = "__PRECACHE__";
const OFFLINE = "/offline";
const WAIT = 4000; // on a very slow connection, answer from the cache after this many ms

// Pages: Cloudflare Pages serves /apps.html as /apps and /index.html as /, so both spellings share one entry.
function pageKey(url) {
  let p = url.pathname;
  if (p.endsWith("/index.html")) p = p.slice(0, -"index.html".length);
  else if (p.endsWith(".html")) p = p.slice(0, -".html".length);
  return url.origin + p;
}

async function clean(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async ([key, src]) => {
      const res = await fetch(new Request(src, { cache: "reload" }));
      if (!res.ok) throw new Error(src + " " + res.status);
      await c.put(new URL(key, self.location).href, await clean(res));
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
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
  const nav = req.mode === "navigate";
  e.respondWith(networkFirst(e, req, nav ? pageKey(url) : url.href, nav));
});

async function networkFirst(e, req, key, nav) {
  const c = await caches.open(CACHE);
  const net = fetch(req).then(async (res) => {
    if (res.status === 200 && res.type === "basic") await c.put(key, await clean(res.clone()));
    return res;
  });
  e.waitUntil(net.then(() => {}, () => {}));
  const fallback = async () => (await c.match(key)) || (nav ? await c.match(new URL(OFFLINE, self.location).href) : undefined);
  try {
    return await Promise.race([
      net,
      new Promise((ok) => setTimeout(ok, WAIT)).then(async () => (await c.match(key)) || net),
    ]);
  } catch (err) {
    const hit = await fallback();
    if (hit) return hit;
    throw err;
  }
}
