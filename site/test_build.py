#!/usr/bin/env python3
"""Tests for build.py. Run: cd site && python3 -m unittest"""
import contextlib
import io
import json
import re
import pathlib
import shutil
import tempfile
import unittest
import xml.etree.ElementTree as ET
from datetime import date
from html.parser import HTMLParser
from urllib.parse import urlsplit

import build

HERE = pathlib.Path(__file__).resolve().parent
URLS = dict(site_url="https://appworld-1ug.pages.dev",
            submit_url="https://github.com/appworld-jp/appworld/issues/new?template=listing.yml",
            contact_url="https://github.com/appworld-jp/appworld/issues/new")
KONDATE_TAGLINE = json.loads((HERE / "apps" / "kondate.json").read_text(encoding="utf-8"))["tagline"]
# The operator's own listings that are live on the build date used below.
LAB = sorted(p.stem for p in (HERE / "apps").glob("*.json")
             if json.loads(p.read_text(encoding="utf-8")).get("operator")
             and json.loads(p.read_text(encoding="utf-8"))["launch_date"] <= "2026-11-10")


class Audit(HTMLParser):
    """Collects what the CSP must never need: inline script/style, handlers, outside resources."""

    def __init__(self):
        super().__init__()
        self.problems, self.links, self.in_script = [], [], False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for name, _ in attrs:
            if name.startswith("on"):
                self.problems.append(f"handler {name} on <{tag}>")
            if name == "style":
                self.problems.append(f"style attribute on <{tag}>")
        if tag == "style":
            self.problems.append("<style> block")
        if tag == "script":
            self.in_script = True
            if not a.get("src"):
                self.problems.append("inline <script>")
        loaded = {"script": "src", "img": "src", "iframe": "src", "source": "src", "video": "src", "audio": "src"}
        url = a.get(loaded[tag]) if tag in loaded else None
        if tag == "link" and a.get("rel") in ("stylesheet", "icon", "preload", "modulepreload"):
            url = a.get("href")
        if url and (urlsplit(url).scheme or url.startswith("//")):
            self.problems.append(f"outside resource {url}")
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False

    def handle_data(self, data):
        if self.in_script and data.strip():
            self.problems.append("inline script text")


class Meta(HTMLParser):
    """The page's <meta property/name=... content=...> tags as a dict."""

    def __init__(self, text: str):
        super().__init__()
        self.tags = {}
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and (a.get("property") or a.get("name")):
            self.tags[a.get("property") or a.get("name")] = a.get("content")


def listing(**over) -> dict:
    return {"id": "test-app", "name": "テスト", "tagline": "ためしの一言", "description": "説明です。",
            "platform": "web", "category": "fun", "ai_tools": ["Cursor"], "maker_name": "作り手",
            "url": "https://example.com/app/", "launch_date": "2026-11-01", **over}


class BuildTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = pathlib.Path(self.tmp.name)
        self.out = self.dir / "dist"

    def tearDown(self):
        self.tmp.cleanup()

    def run_build(self, apps=HERE / "apps", icons=HERE / "icons", production=True, today=date(2026, 11, 10), og=HERE / "og"):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return build.build(today, production=production, apps_dir=apps, icons_dir=icons, og_dir=og, out=self.out,
                               **(URLS if production else {}))

    def scratch(self, *listings, icons: dict | None = None):
        apps, icon_dir = self.dir / "apps", self.dir / "icons"
        apps.mkdir(); icon_dir.mkdir()
        for item in listings:
            (apps / f"{item['id']}.json").write_text(json.dumps(item, ensure_ascii=False), encoding="utf-8")
        for name, text in (icons or {}).items():
            (icon_dir / name).write_text(text, encoding="utf-8")
        return apps, icon_dir

    def test_production_build_with_the_lab_listings(self):
        live = self.run_build()
        self.assertEqual(sorted(a["id"] for a in live), sorted(LAB))
        pages = sorted(p.name for p in self.out.glob("*.html"))
        expected = ["404.html", "about.html", "apps.html", "index.html", "offline.html", "submit.html",
                    *[f"app-{s}.html" for s in LAB]]
        self.assertEqual(pages, sorted(expected))
        for name in pages:
            text = (self.out / name).read_text(encoding="utf-8")
            with self.subTest(page=name):
                audit = Audit(); audit.feed(text)
                self.assertEqual(audit.problems, [])
                self.assertNotIn("Shipyard", text)
                self.assertNotIn("noindex", text)
                self.assertNotIn("app.html?id=", text)
                self.assertNotIn("サンプル", text)
                for href in audit.links:  # every internal link points at a page that exists
                    parts = urlsplit(href)
                    if parts.scheme or href.startswith("#"):
                        continue
                    target = parts.path.lstrip("/") or "index.html"
                    self.assertTrue((self.out / target).is_file(), href)
        for s in LAB:
            self.assertTrue((self.out / "icons" / f"{s}.svg").is_file())
        self.assertFalse((self.out / "preview").exists())

    def test_app_page_is_complete_without_script(self):
        self.run_build()
        text = (self.out / "app-kondate.html").read_text(encoding="utf-8")
        for needle in ["<title>こんだて帖 | App World</title>",
                       f'<meta name="description" content="{KONDATE_TAGLINE}">',
                       '<link rel="canonical" href="https://appworld-1ug.pages.dev/app-kondate">',
                       '<meta property="og:title"', '<meta property="og:description"', '<meta property="og:url"',
                       '<meta property="og:type"', '<meta property="og:site_name" content="App World">',
                       'href="https://appworld-lab.pages.dev/kondate/"', "アプリを開く ↗",
                       "App Worldの運営が作ったアプリです。", ">運営<", 'class="d-more"', 'class="d-pager"',
                       "https://x.com/intent/post?", "icons/kondate.svg?v="]:
            self.assertIn(needle, text)

    def test_feed_sitemap_and_robots(self):
        self.run_build()
        rss = ET.parse(self.out / "feed.xml").getroot()
        self.assertEqual(rss.tag, "rss"); self.assertEqual(rss.get("version"), "2.0")
        channel = rss.find("channel")
        for tag in ("title", "link", "description"):
            self.assertTrue(channel.findtext(tag))
        items = channel.findall("item")
        self.assertEqual(len(items), min(30, len(LAB)))
        for it in items:
            self.assertTrue(it.findtext("link").startswith("https://appworld-1ug.pages.dev/app-"))
            self.assertRegex(it.findtext("pubDate"), r"^\w{3}, \d{2} \w{3} \d{4} 00:00:00 \+0900$")
        locs = [u.findtext("{http://www.sitemaps.org/schemas/sitemap/0.9}loc") for u in ET.parse(self.out / "sitemap.xml").getroot()]
        self.assertEqual(len(locs), 4 + len(LAB))
        self.assertTrue(all(u.startswith("https://appworld-1ug.pages.dev/") for u in locs))
        self.assertIn("Sitemap: https://appworld-1ug.pages.dev/sitemap.xml", (self.out / "robots.txt").read_text())

    def test_share_images_are_large_and_absolute(self):
        self.run_build()
        site = URLS["site_url"]
        for name in ("index.html", "apps.html", "submit.html", "about.html", *[f"app-{s}.html" for s in LAB]):
            with self.subTest(page=name):
                tags = Meta((self.out / name).read_text(encoding="utf-8")).tags
                own = name.startswith("app-")
                image = f"og/{name[4:-5]}.png" if own else "og/default.png"  # every operator listing has its own image
                self.assertRegex(tags["og:image"], rf"^{site}/{image}\?v=[0-9a-f]{{10}}$")
                self.assertTrue((self.out / image).is_file())
                self.assertEqual(tags["twitter:card"], "summary_large_image")
                self.assertEqual((tags["og:image:width"], tags["og:image:height"]), ("1200", "630"))
                self.assertTrue(tags["og:image:alt"])
        self.assertEqual((self.out / "og" / "default.png").read_bytes()[:8], b"\x89PNG\r\n\x1a\n")
        self.assertNotIn("og:image", (self.out / "404.html").read_text(encoding="utf-8"))

    def test_listing_without_share_image_uses_the_default(self):
        apps, icons = self.scratch(listing(name="A&B"),
                                   listing(id="later", launch_date="2026-12-01", url="https://example.com/later/"))
        og = self.dir / "og"; og.mkdir()
        shutil.copy(HERE / "og" / "default.png", og / "default.png")
        shutil.copy(HERE / "og" / "default.png", og / "later.png")  # a future listing's image waits for its launch
        self.run_build(apps, icons, og=og)
        tags = Meta((self.out / "app-test-app.html").read_text(encoding="utf-8")).tags
        self.assertRegex(tags["og:image"], r"^https://appworld-1ug\.pages\.dev/og/default\.png\?v=[0-9a-f]{10}$")
        self.assertEqual(tags["og:image:alt"], build.OG_DEFAULT_ALT)
        self.assertEqual(tags["twitter:card"], "summary_large_image")
        self.assertEqual(sorted(p.name for p in (self.out / "og").iterdir()), ["default.png"])

    def test_own_share_image_alt_is_escaped_and_missing_default_still_builds(self):
        apps, icons = self.scratch(listing(name="A&B \"x\""))
        og = self.dir / "og"; og.mkdir()
        shutil.copy(HERE / "og" / "default.png", og / "test-app.png")
        self.run_build(apps, icons, og=og)
        text = (self.out / "app-test-app.html").read_text(encoding="utf-8")
        self.assertIn('content="A&amp;B &quot;x&quot; — ためしの一言"', text)
        self.assertRegex(Meta(text).tags["og:image"], r"^https://appworld-1ug\.pages\.dev/og/test-app\.png\?v=")
        home = Meta((self.out / "index.html").read_text(encoding="utf-8")).tags  # no default image: a plain card
        self.assertNotIn("og:image", home)
        self.assertEqual(home["twitter:card"], "summary")

    def test_headers_have_the_production_csp(self):
        self.run_build()
        headers = (self.out / "_headers").read_text()
        self.assertIn("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; "
                      "img-src 'self' data:; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests", headers)
        self.assertNotIn("/preview", headers)
        sw = headers.split("\n/sw.js\n", 1)[1].split("\n/", 1)[0]  # its own rules: same-origin fetches only, never stale
        self.assertIn("! Content-Security-Policy", sw)
        self.assertIn("Content-Security-Policy: default-src 'none'; connect-src 'self'", sw)
        self.assertIn("! Cache-Control", sw)
        self.assertIn("Cache-Control: no-cache", sw)
        self.assertIn("/manifest.webmanifest\n  Content-Type: application/manifest+json", headers)

    def test_pages_link_the_manifest_and_site_script_and_have_the_phone_tabs(self):
        self.run_build()
        for path in sorted(self.out.glob("*.html")):
            text = path.read_text(encoding="utf-8")
            with self.subTest(page=path.name):
                self.assertIn('<link rel="manifest" href="/manifest.webmanifest">', text)
                self.assertIn('<link rel="apple-touch-icon" href=', text)
                self.assertIn(f'<meta name="theme-color" content="{build.THEME_COLOR}">', text)
                self.assertRegex(text, r'<script src="/?site\.js\?v=[0-9a-f]{10}"></script>\n</body>')
                self.assertEqual(text.count('<nav class="tabs" aria-label="メイン">'), 1)
                self.assertEqual(text.count('<nav class="top" aria-label="メイン">'), 1)
                self.assertIn(">探す</span>", text)
                self.assertNotIn("全て", text)  # app UIs write すべて in hiragana (owner, 2026-11-12)
        home = (self.out / "index.html").read_text(encoding="utf-8")
        self.assertIn('<a class="on" aria-current="page" href="index.html" data-tab="home">', home)
        self.assertIn('<a class="on" aria-current="page" href="apps.html" data-tab="find">',
                      (self.out / "app-kondate.html").read_text(encoding="utf-8"))
        self.assertIn("「ホーム画面に追加」の案内を閉じたこと", (self.out / "about.html").read_text(encoding="utf-8"))
        m = json.loads((self.out / "manifest.webmanifest").read_text(encoding="utf-8"))
        self.assertEqual((m["name"], m["short_name"], m["start_url"], m["scope"], m["display"], m["lang"]),
                         ("App World", "App World", "/", "/", "standalone", "ja"))
        purposes = {(i["sizes"], i["purpose"]) for i in m["icons"]}
        self.assertTrue({("192x192", "any"), ("512x512", "any"), ("512x512", "maskable")} <= purposes)
        for icon in m["icons"]:
            self.assertTrue((self.out / icon["src"].lstrip("/")).is_file(), icon["src"])
        self.assertEqual((self.out / "apple-touch-icon.png").read_bytes()[:8], b"\x89PNG\r\n\x1a\n")

    def test_service_worker_is_versioned_and_precaches_the_shell(self):
        self.run_build()
        sw = (self.out / "sw.js").read_text(encoding="utf-8")
        self.assertNotIn("__VERSION__", sw); self.assertNotIn("__PRECACHE__", sw)
        version = re.search(r'const CACHE = PREFIX \+ "([0-9a-f]{12})";', sw)
        self.assertTrue(version)
        precache = json.loads(re.search(r"const PRECACHE = (\[.*\]);", sw).group(1))
        keys = {k for k, _ in precache}
        for key in ("/", "/apps", "/offline", "/manifest.webmanifest", "/icon-192.png"):
            self.assertIn(key, keys)
        for name in ("fonts.css", "app.css", "apps.css", "colors.css", "home.js", "apps.js", "site.js", "data.js"):
            self.assertTrue(any(k.startswith(f"/{name}?v=") for k in keys), name)
        fonts = [k for k in keys if k.startswith("/fonts/")]
        self.assertTrue(fonts and all(k.endswith("-400-normal.woff2") for k in fonts))
        for _, src in precache:  # every file exists, and links match what the pages ask for
            self.assertTrue((self.out / (src.split("?")[0].lstrip("/") or "index.html")).is_file(), src)
        self.assertIn('href="app.css?v=', (self.out / "index.html").read_text(encoding="utf-8"))
        # a rebuild with the same input keeps the version; a changed page changes it
        self.run_build()
        self.assertIn(version.group(0), (self.out / "sw.js").read_text(encoding="utf-8"))
        self.run_build(today=date(2026, 11, 11))
        self.assertNotIn(version.group(0), (self.out / "sw.js").read_text(encoding="utf-8"))

    def test_font_files_follow_unicode_range_and_weight(self):
        css = ("@font-face{font-weight:400;src:url(fonts/a-400.woff2) format('woff2');unicode-range:U+3042,U+4e00-4e10}"
               "@font-face{font-weight:700;src:url(fonts/a-700.woff2) format('woff2');unicode-range:U+3042}"
               "@font-face{font-weight:400;src:url(fonts/b-400.woff2) format('woff2');unicode-range:U+0041-005a}")
        self.assertEqual(build.font_files(css, "あ"), ["fonts/a-400.woff2"])
        self.assertEqual(build.font_files(css, "一 B"), ["fonts/a-400.woff2", "fonts/b-400.woff2"])
        self.assertEqual(build.font_files(css, "あ", weights=(700,)), ["fonts/a-700.woff2"])

    def test_script_data_escapes_markup(self):
        site = build.Site(self.out, URLS["site_url"], URLS["submit_url"], URLS["contact_url"], self.dir)
        js = build.script_data(site, [{**listing(), "name": "a</script>&b"}])
        self.assertNotIn("<", js.split("*/", 1)[1]); self.assertNotIn("&b", js)
        self.assertIn("\\u003c/script\\u003e\\u0026b", js)

    def test_markup_in_listing_text_blocks_the_build(self):
        apps, icons = self.scratch(listing(tagline="<b>すごい</b>"))
        with self.assertRaises(SystemExit):
            self.run_build(apps, icons)

    def test_bad_or_missing_icon_blocks_the_build(self):
        apps, icons = self.scratch(listing(icon=True), icons={"test-app.svg": '<svg onload="alert(1)"/>'})
        with self.assertRaises(SystemExit):
            self.run_build(apps, icons)
        shutil.rmtree(self.dir / "apps"); shutil.rmtree(self.dir / "icons")
        apps, icons = self.scratch(listing(icon=True))
        with self.assertRaises(SystemExit):
            self.run_build(apps, icons)

    def test_production_refuses_samples_and_plain_http(self):
        apps, icons = self.scratch(listing(sample=True))
        with self.assertRaises(SystemExit):
            self.run_build(apps, icons)
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            build.build(date(2026, 11, 10), "http://example.com", production=True, submit_url=URLS["submit_url"],
                        contact_url=URLS["contact_url"], apps_dir=HERE / "apps", icons_dir=HERE / "icons", out=self.out)

    def test_listing_text_is_escaped_and_tiles_fall_back_to_a_letter(self):
        apps, icons = self.scratch(listing(name="A&B \"quote\"", description="1行目\n2行目 & 'x'", platform="ios",
                                           url="https://apps.apple.com/jp/app/id1"))
        self.run_build(apps, icons)
        text = (self.out / "app-test-app.html").read_text(encoding="utf-8")
        self.assertIn("A&amp;B &quot;quote&quot;", text)
        self.assertIn("2行目 &amp; &#x27;x&#x27;", text)
        self.assertIn("App Storeで開く ↗", text)
        self.assertIn("<b>A</b>", text)            # letter tile, no icon
        self.assertNotIn(build.OPERATOR_NOTE, text)  # not an operator listing
        self.assertNotIn('class="op"', text)
        self.assertIn(".c-test-app{--c:#", (self.out / "colors.css").read_text())

    def test_future_listings_wait_and_empty_site_has_friendly_pages(self):
        apps, icons = self.scratch(listing(launch_date="2026-12-01"))
        live = self.run_build(apps, icons)
        self.assertEqual(live, [])
        self.assertFalse((self.out / "app-test-app.html").exists())
        home = (self.out / "index.html").read_text(encoding="utf-8")
        self.assertIn("まだアプリが掲載されていません", home)
        self.assertIn('href="submit.html"', home)
        ET.parse(self.out / "feed.xml")


if __name__ == "__main__":
    unittest.main()
