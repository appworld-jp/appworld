#!/usr/bin/env python3
"""Build App World from site/apps/*.json into site/dist/.

A static site: no server, no database, no login. The pages are fully
pre-rendered; three small first-party scripts add the icon sphere, the
search on the all-apps page and a detail-page animation (CSP script-src 'self').

    python3 site/build.py                     # local preview, today = today in Japan
    python3 site/build.py --today 2026-11-10  # fixed date (reproducible)
    python3 site/build.py --production --site-url https://... --submit-url https://... --contact-url https://...

Every piece of listing text goes through html.escape; data for the scripts is
JSON with <, > and & escaped. The generated HTML has no inline script, no
inline style and no event-handler attributes.
"""
import argparse
import hashlib
import html
import json
import pathlib
import shutil
import sys
from datetime import date, datetime, time, timedelta, timezone
from email.utils import format_datetime
from urllib.parse import quote, urlencode, urlsplit

from check_listing import CATEGORIES, COLOR_RE, PLATFORMS, check_icon, load_all

HERE = pathlib.Path(__file__).resolve().parent
SITE_NAME = "App World"
TAGLINE = "AIで作られたアプリが集まる場所"
JST = timezone(timedelta(hours=9))
RAIL_SIZE = 12        # listings in the home page's 新着 rail
FEED_SIZE = 30
# Used only by local builds; --production requires the real values.
DEV_SITE_URL = "http://localhost:8000"
DEV_SUBMIT_URL = "https://github.com/appworld-jp/appworld/issues/new?template=listing.yml"
DEV_CONTACT_URL = "https://github.com/appworld-jp/appworld/issues/new"
# Tile colour for a listing without "color" (picked by its id, so it never changes).
FALLBACK_COLORS = ["#D9775A", "#3E8C84", "#4C6FD1", "#B9567E", "#8A64C8", "#C9A13A",
                   "#4E9A6B", "#5A7FA0", "#C46B4E", "#3F8FB5", "#6C5BB0", "#8E6B9E"]
OPERATOR_NOTE = "App Worldの運営が作ったアプリです。"
# Share images (og:image), made by tools/make_og.mjs: og/<id>.png per listing, og/default.png for the rest.
OG_SIZE = (1200, 630)
OG_DEFAULT = "og/default.png"
OG_DEFAULT_ALT = f"{SITE_NAME} — AIで作られたアプリがここに集まる。"

e = html.escape


# ---------- small helpers ----------

def dotted(iso: str) -> str:
    return iso.replace("-", ".")


def jdate(iso: str) -> str:
    d = date.fromisoformat(iso)
    return f"{d.year}年{d.month}月{d.day}日"


def color(app: dict) -> str:
    c = app.get("color")
    if isinstance(c, str) and COLOR_RE.match(c):
        return c.upper()
    return FALLBACK_COLORS[int(hashlib.sha256(app["id"].encode()).hexdigest()[:6], 16) % len(FALLBACK_COLORS)]


def genre(app: dict) -> str:
    return CATEGORIES[app["category"]]


def platform(app: dict) -> str:
    return PLATFORMS[app["platform"]]


def stage(app: dict) -> str:
    return "試作中" if app.get("beta") else "公開中"


def open_label(app: dict) -> str:
    if app["platform"] == "ios":
        return "TestFlightで開く ↗" if app.get("beta") else "App Storeで開く ↗"
    if app["platform"] == "android":
        return "Google Playで開く ↗"
    return "アプリを開く ↗"


def script_json(value) -> str:
    """JSON that is safe inside a .js file served to the page."""
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":"))
            .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026"))


class Site:
    """Everything a page needs to know: URLs, asset versions, the listings."""

    def __init__(self, out: pathlib.Path, site_url: str, submit_url: str, contact_url: str, icons: pathlib.Path):
        self.out, self.site_url, self.submit_url, self.contact_url, self.icons = out, site_url.rstrip("/"), submit_url, contact_url, icons
        self.versions: dict[str, str] = {}

    def abs_url(self, page: str) -> str:
        """Absolute URL as the host serves it (Cloudflare Pages drops .html; index.html is /)."""
        if page in ("", "index.html"):
            return self.site_url + "/"
        return self.site_url + "/" + quote(page.removesuffix(".html"))

    def asset(self, name: str) -> str:
        """A same-origin asset with a content hash, so it can be cached for a long time."""
        if name not in self.versions:
            self.versions[name] = hashlib.sha256((self.out / name).read_bytes()).hexdigest()[:10]
        return f"{name}?v={self.versions[name]}"

    def og_image(self, app: dict | None = None) -> tuple[str, str]:
        """Absolute URL and alt text of a page's share image: the app's own when it has one, else the default."""
        if app and (self.out / "og" / f"{app['id']}.png").is_file():
            name, alt = f"og/{app['id']}.png", f"{app['name']} — {app['tagline']}"
        elif (self.out / OG_DEFAULT).is_file():
            name, alt = OG_DEFAULT, OG_DEFAULT_ALT
        else:
            return "", ""
        return f"{self.site_url}/{self.asset(name)}", alt

    def icon_src(self, app: dict) -> str:
        return self.asset(f"icons/{app['id']}.svg") if app.get("icon") else ""


# ---------- shared page parts ----------

NAV = [("index.html", "ホーム", ""), ("index.html#shelf", "新着", ""), ("apps.html", "すべてのアプリ", ""),
       ("submit.html", "アプリを掲載する", "keep")]


def header(current: str, root: str, over: bool = False) -> str:
    links = ""
    for href, label, cls in NAV:
        classes = " ".join(c for c in (cls, "on" if href == current else "") if c)
        attrs = (f' class="{classes}"' if classes else "") + (' aria-current="page"' if href == current else "")
        links += f'<a{attrs} href="{root}{href}">{label}</a>'
    return (f'<header class="nav g{" over" if over else ""}"><div class="in">'
            f'<a class="logo" href="{root}index.html">{SITE_NAME}</a>'
            f'<nav aria-label="メイン">{links}</nav></div></header>')


def footer(root: str) -> str:
    return (f'<footer class="g"><div class="in"><span>{SITE_NAME}　{TAGLINE}</span>'
            '<nav aria-label="サイトの情報">'
            f'<a href="{root}about.html">このサイトについて</a><a href="{root}about.html#terms">掲載規約</a>'
            f'<a href="{root}about.html#privacy">プライバシーポリシー</a><a href="{root}feed.xml">RSS</a>'
            "</nav></div></footer>")


def page(site: Site, *, path: str, title: str, desc: str, body: str, css: tuple = (), js: tuple = (),
         current: str = "", over: bool = False, og_type: str = "website", root: str = "", app: dict | None = None) -> str:
    """One complete HTML page. `root` is "/" for 404.html, which is served at any path.
    `app` picks the share image for an app page (falls back to the site's default image)."""
    meta = ""
    if path:
        url = site.abs_url(path)
        image, alt = site.og_image(app)
        image_meta = (f'<meta property="og:image" content="{e(image)}">\n'
                      '<meta property="og:image:type" content="image/png">\n'
                      f'<meta property="og:image:width" content="{OG_SIZE[0]}">\n'
                      f'<meta property="og:image:height" content="{OG_SIZE[1]}">\n'
                      f'<meta property="og:image:alt" content="{e(alt)}">\n'
                      f'<meta name="twitter:image:alt" content="{e(alt)}">\n') if image else ""
        meta = (f'<link rel="canonical" href="{e(url)}">\n'
                f'<meta property="og:title" content="{e(title)}">\n'
                f'<meta property="og:description" content="{e(desc)}">\n'
                f'<meta property="og:url" content="{e(url)}">\n'
                f'<meta property="og:type" content="{og_type}">\n'
                f'<meta property="og:site_name" content="{SITE_NAME}">\n'
                '<meta property="og:locale" content="ja_JP">\n'
                + image_meta
                + f'<meta name="twitter:card" content="{"summary_large_image" if image else "summary"}">\n')
    styles = "".join(f'<link rel="stylesheet" href="{root}{site.asset(n)}">\n'
                     for n in ("fonts.css", "app.css", *css, "colors.css"))
    scripts = "".join(f'<script src="{root}{site.asset(n)}"></script>\n' for n in js)
    return (
        '<!doctype html>\n<html lang="ja"><head><meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        f"<title>{e(title)}</title>\n"
        f'<meta name="description" content="{e(desc)}">\n'
        + meta
        + f'<link rel="icon" href="{root}{site.asset("favicon.svg")}" type="image/svg+xml">\n'
        f'<link rel="alternate" type="application/rss+xml" title="{SITE_NAME}の新着" href="{root}feed.xml">\n'
        + styles
        + "</head><body>\n"
        + header(current, root, over) + "\n" + body + "\n" + footer(root) + "\n"
        + scripts
        + "</body></html>\n"
    )


def tile(site: Site, app: dict, cls: str, lazy: bool = True) -> str:
    """The app's icon: its SVG when it has one, otherwise a colour tile with the first letter."""
    if app.get("icon"):
        loading = ' loading="lazy"' if lazy else ""
        return (f'<span class="{cls} pic" aria-hidden="true"><img src="{site.icon_src(app)}" alt="" width="64" height="64"'
                f'{loading} decoding="async"></span>')
    return f'<span class="{cls}" aria-hidden="true"><b>{e(app["name"][0])}</b></span>'


def badges(app: dict) -> str:
    out = '<span class="op" title="App Worldの運営が作ったアプリ">運営</span>' if app.get("operator") else ""
    return out + ('<span class="beta">試作中</span>' if app.get("beta") else "")


def item(site: Site, app: dict, *, heading: str = "h2", data: bool = False, tools: bool = True) -> str:
    """A card in the all-apps grid and the related list."""
    attrs = ""
    if data:  # read by apps.js for search, filters and sort
        fields = {"n": app["name"], "t": app["tagline"], "m": app["maker_name"], "p": platform(app),
                  "g": genre(app), "a": "|".join(app["ai_tools"]), "s": stage(app), "d": app["launch_date"]}
        attrs = "".join(f' data-{k}="{e(v)}"' for k, v in fields.items())
    meta = [platform(app), genre(app), *(app["ai_tools"] if tools else [])]
    return (
        f'<li{attrs}><a class="item glass c-{app["id"]}" href="app-{app["id"]}.html">{tile(site, app, "mini")}'
        f'<span class="it"><time class="date" datetime="{app["launch_date"]}">{dotted(app["launch_date"])}</time>'
        f'<{heading}><span class="nm">{e(app["name"])}</span>{badges(app)}</{heading}>'
        f'<p>{e(app["tagline"])}</p>'
        f'<span class="meta">{"".join(f"<span>{e(m)}</span>" for m in meta)}</span></span></a></li>'
    )


def empty_state(text: str) -> str:
    return (f'<div class="none glass"><p>{e(text)}</p>'
            '<a class="link" href="submit.html">アプリを掲載する</a></div>')


# ---------- pages ----------

def home(site: Site, live: list[dict]) -> str:
    latest = live[0]["launch_date"] if live else ""
    if live:
        panels = "".join(
            f'<a class="panel glass c-{a["id"]}" href="app-{a["id"]}.html">'
            f'<div class="p-top"><span class="cap">{i:02d}</span>'
            f'<time class="p-date" datetime="{a["launch_date"]}">{dotted(a["launch_date"])}</time>'
            f'<h3 class="p-name">{e(a["name"])}</h3>'
            + (f'<span class="p-badges">{badges(a)}</span>' if badges(a) else "")
            + f'</div><div class="p-vis">{tile(site, a, "icon")}</div>'
            f'<div><p class="p-line">{e(a["tagline"])}</p>'
            f'<div class="p-spec"><span>{e(platform(a))}</span><span>{e(genre(a))}</span></div></div></a>'
            for i, a in enumerate(live[:RAIL_SIZE], 1)
        )
        shelf_body = (
            f'<div class="rail" id="rail" tabindex="0" aria-label="新着のアプリ（横にスクロールできます）">{panels}</div>'
            '<div class="g"><div class="in"><div class="progress" aria-hidden="true"><i id="prog"></i></div>'
            f'<div class="more"><a class="link" href="apps.html">すべてのアプリを見る（{len(live)}件）</a></div></div></div>'
        )
        shelf_cap = f'<p class="cap">最新の掲載　{dotted(latest)}</p>'
        stats = (f'<span>掲載 <b>{len(live)}</b>件</span>'
                 f'<span>最新の掲載 <b class="glow">{dotted(latest)}</b></span><span>掲載料 <b>無料</b></span>')
    else:
        shelf_body = ('<div class="g"><div class="in">'
                      + empty_state("まだアプリが掲載されていません。最初のアプリを掲載してみませんか。")
                      + "</div></div>")
        shelf_cap = ""
        stats = '<span>掲載料 <b>無料</b></span>'

    body = f"""<section class="hero" aria-label="トップ">
  <canvas id="net" aria-hidden="true"></canvas>
  <div class="hero-in g">
    <div class="in"></div>
    <div class="in"><div class="copy">
      <h1><span>AIで作られたアプリが</span><span>ここに集まる。</span></h1>
      <p>あなたが最初のユーザーに。<br>まだ誰も知らないアプリがここにある。</p>
      <div class="acts"><a class="btn" href="submit.html">アプリを掲載する<i>無料</i></a><a class="link" href="#shelf">新着を見る</a></div>
    </div></div>
    <div class="in foot cap">{stats}</div>
  </div>
</section>

<section class="can g" aria-label="できること">
  <div class="in">
    <article class="cell glass"><p class="cap">作った人へ</p><h2>作ったアプリを知ってもらう</h2><p>申請フォームに5分ほど記入するだけ。公開日にトップページで紹介され、アプリごとの紹介ページはずっと残ります。</p></article>
    <article class="cell glass"><p class="cap">使う人へ</p><h2>新しいアプリに出会う</h2><p>iPhone・Android・Webの新しいアプリが並びます。登録やログインは不要です。</p></article>
    <article class="cell glass"><p class="cap">安全</p><h2>安心して試せる</h2><p>紹介するアプリのリンク先は、App Store・Google Play・公式サイトだけ。怪しいファイルを直接ダウンロードさせることはありません。</p></article>
  </div>
</section>

<section class="shelf" id="shelf" aria-labelledby="shelf-h">
  <div class="g"><div class="in head">{shelf_cap}<h2 id="shelf-h">新着</h2></div></div>
  {shelf_body}
</section>

<section class="flow g" id="flow" aria-labelledby="flow-h">
  <div class="in">
    <div class="head"><p class="cap">掲載は無料</p><h2 id="flow-h">掲載までの3ステップ</h2></div>
    <ol class="steps">
      <li class="glass"><span class="cap">01</span><b>申請フォームに記入</b><span>アプリ名、一言説明、リンク、使ったAIを入力します（5分ほど）</span></li>
      <li class="glass"><span class="cap">02</span><b>チェックと確認</b><span>リンクの安全を自動でチェックし、運営が内容を確認します（1〜2日）</span></li>
      <li class="glass"><span class="cap">03</span><b>公開</b><span>公開日に、トップページの「新着」に並びます</span></li>
    </ol>
  </div>
</section>"""
    return page(site, path="index.html", title=f"{SITE_NAME} | {TAGLINE}",
                desc="AIを使って作られたアプリやWebサービスが集まるサイトです。まだ誰も知らない新しいアプリを試せます。掲載は無料です。",
                body=body, js=("three.min.js", "data.js", "home.js"), current="index.html", over=True)


def apps_page(site: Site, live: list[dict]) -> str:
    if live:
        listing = (
            '<form class="finder glass" id="finder" role="search" aria-label="アプリを探す" hidden>'
            '<label class="search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>'
            '<path d="M13 13l5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'
            '<span class="vh">キーワード</span><input id="q" type="search" placeholder="アプリ名や説明で探す" autocomplete="off"></label>'
            '<div class="filters">'
            '<fieldset><legend class="cap">対応</legend><div class="chips" id="f-p"></div></fieldset>'
            '<fieldset><legend class="cap">ジャンル</legend><div class="chips" id="f-g"></div></fieldset>'
            '<fieldset><legend class="cap">使ったAI</legend><div class="chips" id="f-a"></div></fieldset>'
            '<fieldset><legend class="cap">開発の段階</legend><div class="chips" id="f-s"></div></fieldset>'
            "</div></form>"
            f'<div class="bar"><p class="count" id="count" aria-live="polite">全 <b>{len(live)}</b>件</p>'
            '<div class="bar-r" id="bar-r" hidden><button type="button" class="clear" id="clear" hidden>条件をクリア</button>'
            '<label class="sort"><span class="vh">並び順</span><select id="sort"><option value="new">新しい順</option>'
            '<option value="old">古い順</option><option value="name">名前順</option></select></label></div></div>'
            f'<ol class="grid" id="grid">{"".join(item(site, a, data=True) for a in live)}</ol>'
            '<div class="none glass" id="none" hidden><p>条件に合うアプリは見つかりませんでした。</p>'
            '<button type="button" class="link" id="clear2">条件をクリアする</button></div>'
        )
    else:
        listing = empty_state("まだアプリが掲載されていません。最初のアプリを掲載してみませんか。")
    body = f'<main class="g"><div class="in list"><div class="list-head"><h1>すべてのアプリ</h1></div>{listing}</div></main>'
    return page(site, path="apps.html", title=f"すべてのアプリ | {SITE_NAME}",
                desc=f"{SITE_NAME}に掲載されているアプリの一覧です。キーワード、対応、ジャンル、使ったAIで探せます。",
                body=body, css=("apps.css",), js=("apps.js",), current="apps.html")


def related_apps(app: dict, live: list[dict]) -> list[dict]:
    """Same genre first (newest first), padded with the newest from other genres."""
    others = [a for a in live if a is not app]
    return ([a for a in others if a["category"] == app["category"]]
            + [a for a in others if a["category"] != app["category"]])[:3]


def detail(site: Site, app: dict, live: list[dict]) -> str:
    aid = app["id"]
    g = genre(app)
    g_link = "apps.html?" + urlencode({"g": g})
    host = urlsplit(app["url"]).hostname or ""
    share = "https://x.com/intent/post?" + urlencode({"text": f"{app['name']} — {app['tagline']}",
                                                      "url": site.abs_url(f"app-{aid}.html")})
    tools = "、".join(f'<a href="apps.html?{e(urlencode({"q": t}))}">{e(t)}</a>' for t in app["ai_tools"])
    if app.get("operator"):
        share_text = "<b>気に入ったら、シェアしてください</b>紹介ページをXで広められます。"
    else:
        share_text = "<b>このアプリの開発者の方へ</b>紹介ページをシェアして、最初のユーザーに届けましょう。"

    rel = related_apps(app, live)
    more = ""
    if rel:
        same = all(a["category"] == app["category"] for a in rel)
        more = ('<section class="d-more" aria-labelledby="more-h"><div class="head">'
                + (f'<p class="cap">{e(g)}</p><h2 id="more-h">同じジャンルのアプリ</h2>' if same else '<h2 id="more-h">ほかのアプリ</h2>')
                + f'</div><ol class="grid">{"".join(item(site, a, heading="h3", tools=False) for a in rel)}</ol></section>')
    i = live.index(app)
    prev_a, next_a = (live[i - 1] if i > 0 else None), (live[i + 1] if i + 1 < len(live) else None)
    prev_l = f'<a class="link" href="app-{prev_a["id"]}.html">← {e(prev_a["name"])}</a>' if prev_a else "<span></span>"
    next_l = f'<a class="link" href="app-{next_a["id"]}.html">{e(next_a["name"])} →</a>' if next_a else "<span></span>"

    body = f"""<main class="g">
  <div class="in detail c-{aid}">
    <nav class="crumb cap" aria-label="現在地"><a href="apps.html">すべてのアプリ</a><span aria-hidden="true">/</span><a href="{e(g_link)}">{e(g)}</a></nav>

    <section class="d-hero glass" aria-labelledby="d-name">
      <div class="d-vis" aria-hidden="true"><div class="orbit"></div>{tile(site, app, "icon big", lazy=False)}</div>
      <div class="d-main">
        <p class="cap"><time datetime="{app["launch_date"]}">{dotted(app["launch_date"])}</time> に公開</p>
        <h1 id="d-name">{e(app["name"])}{badges(app)}</h1>
        <p class="d-tag">{e(app["tagline"])}</p>
        {f'<p class="d-op">{OPERATOR_NOTE}</p>' if app.get("operator") else ""}
        <div class="d-acts">
          <a class="btn" href="{e(app["url"])}" rel="noopener noreferrer nofollow ugc" target="_blank">{open_label(app)}</a>
          <span class="d-note">別のサイト（{e(host)}）が新しいタブで開きます。</span>
        </div>
      </div>
    </section>

    <div class="d-cols">
      <section class="d-about" aria-labelledby="about-h">
        <h2 id="about-h" class="cap">アプリについて</h2>
        <p>{e(app["description"])}</p>
        <div class="d-share glass">
          <p>{share_text}</p>
          <a class="link" href="{e(share)}" target="_blank" rel="noopener noreferrer">Xでシェア</a>
        </div>
      </section>
      <aside class="d-spec glass" aria-labelledby="spec-h">
        <h2 id="spec-h" class="cap">詳しい情報</h2>
        <dl>
          <div><dt>対応</dt><dd>{e(platform(app))}</dd></div>
          <div><dt>ジャンル</dt><dd><a href="{e(g_link)}">{e(g)}</a></dd></div>
          <div><dt>開発者</dt><dd>{e(app["maker_name"])}</dd></div>
          <div><dt>使ったAI</dt><dd>{tools}</dd></div>
          <div><dt>開発の段階</dt><dd>{"試作中（ベータ）" if app.get("beta") else "公開中"}</dd></div>
          <div><dt>公開日</dt><dd>{jdate(app["launch_date"])}</dd></div>
          <div><dt>掲載</dt><dd>{"運営のアプリ" if app.get("operator") else "無料掲載"}</dd></div>
        </dl>
        <p class="d-safe">リンク先は公式ストア（試作中はTestFlight）か公式サイトだけです。ファイルを直接ダウンロードさせるリンクは載せていません。</p>
      </aside>
    </div>

    {more}

    <nav class="d-pager" aria-label="前後のアプリ">{prev_l}{next_l}</nav>
    <p class="d-report">問題のある掲載を見つけたら、<a href="about.html#report">通報・お問い合わせ</a>からお知らせください。</p>
  </div>
</main>"""
    return page(site, path=f"app-{aid}.html", title=f"{app['name']} | {SITE_NAME}", desc=app["tagline"], body=body,
                css=("apps.css", "detail.css"), js=("detail.js",), current="apps.html", og_type="article", app=app)


def submit_page(site: Site) -> str:
    go = e(site.submit_url)
    body = f"""<main class="g">
  <div class="in sub">
    <section class="sub-hero" aria-labelledby="sub-h">
      <div class="sub-copy">
        <h1 id="sub-h">あなたのアプリを、<br>最初のユーザーへ。</h1>
        <p class="lead"><span>AIを使って作ったアプリを、無料で掲載できます。</span><span>試作中のアプリも歓迎です。</span><span>公開日にトップページの「新着」で紹介され、</span><span>紹介ページはその後もずっと残ります。</span></p>
        <div class="acts"><a class="btn" href="{go}" target="_blank" rel="noopener noreferrer">申請フォームを開く<i>GitHub</i></a><a class="link" href="#ready">準備するものを見る</a></div>
      </div>
      <dl class="facts glass">
        <div><dt class="cap">掲載料</dt><dd>無料</dd></div>
        <div><dt class="cap">入力</dt><dd>約5分</dd></div>
        <div><dt class="cap">確認</dt><dd>1〜2日</dd></div>
        <div><dt class="cap">公開</dt><dd>1日10件まで</dd></div>
      </dl>
    </section>

    <section class="block" aria-labelledby="flow-h">
      <div class="head"><h2 id="flow-h">掲載までの流れ</h2></div>
      <ol class="steps">
        <li class="glass"><span class="cap">01</span><b>申請フォームに入力</b><span>下の「準備するもの」を入力して送信します。送信後すぐに、リンクの自動チェックの結果が届きます。</span></li>
        <li class="glass"><span class="cap">02</span><b>運営が確認</b><span>内容とリンク先を確認します。目安は1〜2日です。修正をお願いする場合は、申請ページでお知らせします。</span></li>
        <li class="glass"><span class="cap">03</span><b>公開</b><span>申請の順に、1日10件まで公開します。公開日には、トップページの「新着」に並びます。</span></li>
      </ol>
    </section>

    <section class="block" id="ready" aria-labelledby="ready-h">
      <div class="head"><h2 id="ready-h">準備するもの</h2></div>
      <div class="ready glass">
        <dl>
          <div><dt>アプリ名</dt><dd>30文字まで</dd></div>
          <div><dt>一言説明</dt><dd>40文字まで。例：冷蔵庫の写真から、今夜の献立を3つ提案</dd></div>
          <div><dt>説明文</dt><dd>600文字まで。誰の、どんな困りごとを解決するアプリかを書いてください。</dd></div>
          <div><dt>開発の段階</dt><dd>「公開中」か「試作中」を選びます。試作中のアプリには「試作中」の表示が付きます。</dd></div>
          <div><dt>リンク</dt><dd>iPhoneはApp Store、AndroidはGoogle Play、Webはhttpsで始まるURLです。試作中のiPhoneアプリは、TestFlightの公開リンクも使えます。</dd></div>
          <div><dt>対応・ジャンル</dt><dd>選択肢から選びます。</dd></div>
          <div><dt>使ったAI</dt><dd>Claude Code、Cursor、Codexなどから、1つ以上選びます。</dd></div>
          <div><dt>表示名</dt><dd>30文字まで。ニックネームでも構いません。</dd></div>
        </dl>
        <p class="warn">申請の内容は、GitHub上で誰でも見られます。メールアドレスや電話番号などの個人情報は書かないでください。申請には、GitHubのアカウント（無料）が必要です。送信の前に、<a href="about.html#terms">掲載規約</a>をお読みください。</p>
      </div>
    </section>

    <section class="block two" aria-label="掲載の条件">
      <div class="rule glass">
        <h2>掲載できるアプリ</h2>
        <ul><li>自分、または自分のチームが作ったアプリ</li><li>開発にAIを使ったアプリ（一部だけでも構いません）</li><li>リンク先で、誰でも実際に使えるアプリ（試作中でも構いません）</li></ul>
      </div>
      <div class="rule glass ng">
        <h2>掲載できないもの</h2>
        <ul><li>他の人が作ったアプリ</li><li>紹介ページや動画、ソースコードだけで、まだ使えないもの</li><li>ファイルを直接ダウンロードさせるリンク（APK、ZIPなど）や、短縮URL</li><li>「稼げる」「副業で月○万円」などをうたうもの、アダルト、ギャンブル</li><li>個人情報を不正に集めるもの、法令や各ストアの規約に反するもの</li></ul>
      </div>
    </section>

    <section class="block" aria-labelledby="faq-h">
      <div class="head"><h2 id="faq-h">よくある質問</h2></div>
      <div class="faq">
        <details class="glass"><summary>本当に無料ですか？</summary><p>はい、申請から公開まで無料です。今後、希望の日に公開できる有料の枠を設ける場合も、無料の掲載はそのまま続けます。</p></details>
        <details class="glass"><summary>試作中のアプリでも掲載できますか？</summary><p>はい。リンク先で誰でも実際に使える状態であれば、完成度は問いません。Webは公開中のURL、iPhoneはTestFlightの公開リンク、AndroidはGoogle Playのテスト版のリンクで申請できます。</p></details>
        <details class="glass"><summary>掲載をやめたいときは？</summary><p>申請ページ、または<a href="about.html#report">お問い合わせ窓口</a>からご連絡ください。確認のうえ、速やかに取り下げます。</p></details>
        <details class="glass"><summary>掲載内容を直したいときは？</summary><p>公開前なら、申請ページを編集してください。自動チェックがもう一度行われます。公開後の修正は、<a href="about.html#report">お問い合わせ窓口</a>からご連絡ください。</p></details>
      </div>
    </section>

    <section class="final glass" aria-label="申請">
      <h2>準備ができたら、申請フォームへ。</h2>
      <a class="btn" href="{go}" target="_blank" rel="noopener noreferrer">申請フォームを開く<i>GitHub</i></a>
    </section>
  </div>
</main>"""
    return page(site, path="submit.html", title=f"アプリを掲載する | {SITE_NAME}",
                desc="AIを使って作ったアプリを、App Worldに無料で掲載できます。試作中のアプリも歓迎です。",
                body=body, css=("apps.css", "submit.css"), current="submit.html")


def about_page(site: Site) -> str:
    contact = f'<a href="{e(site.contact_url)}" target="_blank" rel="noopener noreferrer">お問い合わせ窓口（GitHub）</a>'
    body = f"""<main class="g">
  <div class="in prose">
    <h1>このサイトについて</h1>
    <p>{SITE_NAME}は、AIを使って作られたアプリやWebサービスを紹介するサイトです。アプリを作るのは開発者で、私たちは紹介する場所を用意しています。</p>
    <p>掲載しているアプリの一部は、{SITE_NAME}の運営が作ったものです。これらには「<span class="op">運営</span>」と表示しています。</p>
    <nav class="toc glass" aria-label="このページの内容"><a href="#safety">安全のために決めていること</a><a href="#report">通報・お問い合わせ</a><a href="#terms">掲載規約</a><a href="#privacy">プライバシーポリシー</a><a href="#code">コードについて</a><a href="#law">特定商取引法に基づく表記</a></nav>

    <h2 id="safety">安全のために決めていること</h2>
    <ul>
      <li>掲載するのは、公式ストア（App Store、Google Play）か https の公式サイトへのリンクだけです。ファイルの配布はしません。</li>
      <li>会員登録やログインはなく、あなたの個人情報を預かりません。</li>
      <li>広告や解析のための外部のプログラムを読み込みません。</li>
      <li>運営が作ったアプリには「運営」と表示します。</li>
      <li>有料の掲載を始めた場合は、その掲載に「PR」と表示します。</li>
    </ul>

    <h2 id="report">通報・お問い合わせ</h2>
    <p>問題のある掲載を見つけたら、{contact}からお知らせください。確認のうえ、すぐに掲載を取り下げます。窓口は GitHub にあり、書いた内容は公開されます。個人情報は書かないでください。</p>

    <h2 id="terms">掲載規約</h2>
    <ol>
      <li>掲載できるのは、申請者（または申請者のチーム）が作ったアプリだけです。</li>
      <li>次のものは掲載できません。ほかの人のアプリ、ファイルを直接ダウンロードさせるもの、「稼げる」などをうたうもの、アダルト、ギャンブル、個人情報を不正に集めるもの、法令や各ストアの規約に反するもの。</li>
      <li>掲載するかどうかは運営が判断します。理由を詳しくお伝えできない場合があります。</li>
      <li>掲載後でも、問題が見つかった場合や申請者から依頼があった場合は、運営の判断で取り下げます。</li>
      <li>掲載されたアプリの内容や安全性は、開発者が責任を持ちます。運営はリンク先を自動と目視で確認していますが、アプリの安全や品質を保証するものではありません。アプリを使うときは、ご自身でも確かめてください。</li>
      <li>申請された文章は、このサイトと運営の X アカウントでの紹介に使います。</li>
      <li>この規約は変更することがあります。変更したときは、このページでお知らせします。</li>
    </ol>

    <h2 id="privacy">プライバシーポリシー</h2>
    <ul>
      <li>このサイトには会員登録やログインがなく、利用者の個人情報を集めていません。Cookie や、広告・解析のためのプログラムも使っていません。</li>
      <li>このサイトのページは、ほかのサイトからプログラム、フォント、画像を読み込みません。ブラウザに情報を保存する機能（localStorage など）も使いません。</li>
      <li>サイトの配信を担うサービスが、安全のためにアクセスの記録（IPアドレスなど）を一時的に残すことがあります。</li>
      <li>掲載の申請は GitHub で受け付けています。申請に書かれた内容と GitHub の公開プロフィールは、GitHub 上で公開されます。GitHub での情報の扱いは、GitHub のプライバシーポリシーに従います。</li>
      <li>掲載されているアプリを開くと、そのアプリのサイトに移動します。移動先での情報の扱いは、それぞれのサイトの方針に従います。</li>
      <li>お問い合わせへの対応に必要な範囲を超えて、情報を使ったり第三者に渡したりしません。</li>
    </ul>

    <h2 id="code">運営のアプリのコードについて</h2>
    <p>「運営」の印がついたアプリは、ブラウザで使うのは無料です。コードを複製・改変して自分で使う、公開する、自分のアプリに組み込むには、有料の利用許諾が必要です。購入の窓口は準備中です。詳しくは<a href="https://github.com/appworld-jp/appworld/blob/main/LICENSE.md" target="_blank" rel="noopener noreferrer">ライセンス</a>をご覧ください。</p>

    <h2 id="law">特定商取引法に基づく表記</h2>
    <p>現在、有料のサービスは提供していません。有料のサービスを始める前に、このページに掲載します。</p>
  </div>
</main>"""
    return page(site, path="about.html", title=f"このサイトについて | {SITE_NAME}",
                desc=f"{SITE_NAME}の掲載規約、プライバシーポリシー、通報・お問い合わせの方法です。",
                body=body, css=("about.css",), current="about.html")


def not_found_page(site: Site) -> str:
    body = """<main class="g">
  <div class="in missing">
    <h1>ページが見つかりませんでした</h1>
    <p>掲載が終わったか、アドレスが間違っている可能性があります。</p>
    <p class="acts"><a class="btn" href="/apps.html">すべてのアプリを見る</a><a class="link" href="/index.html">ホームへ</a></p>
  </div>
</main>"""
    return page(site, path="", title=f"ページが見つかりません | {SITE_NAME}", desc=TAGLINE, body=body,
                css=("about.css",), root="/")


def feed(site: Site, live: list[dict]) -> str:
    def pub(iso: str) -> str:
        return format_datetime(datetime.combine(date.fromisoformat(iso), time(0), JST))

    items = ""
    for a in live[:FEED_SIZE]:
        url = e(site.abs_url(f"app-{a['id']}.html"))
        items += (f"<item><title>{e(a['name'])} — {e(a['tagline'])}</title><link>{url}</link>"
                  f'<guid isPermaLink="true">{url}</guid><pubDate>{pub(a["launch_date"])}</pubDate>'
                  f"<description>{e(a['description'])}</description></item>\n")
    updated = f"<lastBuildDate>{pub(live[0]['launch_date'])}</lastBuildDate>" if live else ""
    return ('<?xml version="1.0" encoding="utf-8"?>\n<rss version="2.0"><channel>'
            f"<title>{SITE_NAME}</title><link>{e(site.abs_url(''))}</link>"
            f"<description>{e(TAGLINE)}</description><language>ja</language>{updated}\n"
            f"{items}</channel></rss>\n")


def sitemap(site: Site, live: list[dict]) -> str:
    rows = [(site.abs_url(p), "") for p in ("index.html", "apps.html", "submit.html", "about.html")]
    rows += [(site.abs_url(f"app-{a['id']}.html"), a["launch_date"]) for a in live]
    urls = "".join(f"<url><loc>{e(u)}</loc>{f'<lastmod>{d}</lastmod>' if d else ''}</url>\n" for u, d in rows)
    return f'<?xml version="1.0" encoding="utf-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n'


def script_data(site: Site, live: list[dict]) -> str:
    """window.APPS for the home page's icon sphere: only what home.js uses."""
    latest = live[0]["launch_date"] if live else ""
    apps = [{"id": a["id"], "n": a["name"], "t": a["tagline"], "p": platform(a), "g": genre(a),
             "b": bool(a.get("beta")), "d": a["launch_date"], "c": color(a), "i": site.icon_src(a),
             "h": f"app-{a['id']}.html"} for a in live]
    return ("/* Generated by site/build.py from site/apps/*.json. Do not edit. */\n"
            f"window.APPS={script_json(apps)};\nwindow.LATEST={script_json(latest)};\n")


# ---------- build ----------

def build(today: date, site_url: str | None = None, *, production: bool = False, submit_url: str | None = None,
          contact_url: str | None = None, apps_dir: pathlib.Path = HERE / "apps", icons_dir: pathlib.Path = HERE / "icons",
          og_dir: pathlib.Path = HERE / "og", out: pathlib.Path = HERE / "dist") -> list[dict]:
    listings, problems = load_all(apps_dir, icons_dir)
    blocking = {k: v for k, v in problems.items() if v[0]}
    if blocking:
        for name, (errs, _) in blocking.items():
            print(f"[NG] {name}: {'; '.join(errs)}", file=sys.stderr)
        sys.exit("自動チェックを通らない掲載があるため、公開をやめました")
    if production:
        samples = [a["id"] for a in listings if a.get("sample")]
        if samples:
            sys.exit(f"本番にサンプルが残っているため、公開をやめました: {', '.join(samples)}")
        for flag, value in (("--site-url", site_url), ("--submit-url", submit_url), ("--contact-url", contact_url)):
            if not value or not value.startswith("https://"):
                sys.exit(f"本番では {flag} に https の URL が必要です")

    live = sorted((a for a in listings if date.fromisoformat(a["launch_date"]) <= today), key=lambda a: a["name"])
    live.sort(key=lambda a: a["launch_date"], reverse=True)  # newest first, then by name

    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(HERE / "static", out)
    shutil.copy(HERE / "_headers", out / "_headers")
    (out / "icons").mkdir()
    for a in live:
        if a.get("icon"):
            src = icons_dir / f"{a['id']}.svg"
            errs = check_icon(src)  # checked again right before copying
            if errs:
                sys.exit(f"アイコンに問題があるため、公開をやめました（{a['id']}）: {'; '.join(errs)}")
            shutil.copy(src, out / "icons" / src.name)
    # Share images: the default, and one per live listing (a future listing's image waits for its launch date).
    (out / "og").mkdir()
    for name in ["default", *(a["id"] for a in live)]:
        src = og_dir / f"{name}.png"
        if src.is_file():
            shutil.copy(src, out / "og" / src.name)

    site = Site(out, site_url or DEV_SITE_URL, submit_url or DEV_SUBMIT_URL, contact_url or DEV_CONTACT_URL, icons_dir)
    (out / "colors.css").write_text(
        "/* Generated by site/build.py: each app's tile colour. */\n"
        + "".join(f".c-{a['id']}{{--c:{color(a)}}}\n" for a in live), encoding="utf-8")
    (out / "data.js").write_text(script_data(site, live), encoding="utf-8")

    pages = {
        "index.html": home(site, live),
        "apps.html": apps_page(site, live),
        "submit.html": submit_page(site),
        "about.html": about_page(site),
        "404.html": not_found_page(site),
        **{f"app-{a['id']}.html": detail(site, a, live) for a in live},
    }
    for name, text in pages.items():
        (out / name).write_text(text, encoding="utf-8")
    (out / "feed.xml").write_text(feed(site, live), encoding="utf-8")
    (out / "sitemap.xml").write_text(sitemap(site, live), encoding="utf-8")
    (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {site.abs_url('')}sitemap.xml\n", encoding="utf-8")
    print(f"built {len(live)} listings, {len(pages)} pages -> {out}")
    return live


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--today", type=date.fromisoformat, default=datetime.now(JST).date(),
                    help="この日までの掲載を公開する（既定は日本時間の今日）")
    ap.add_argument("--site-url", help="公開する URL（例: https://example.jp）。正規 URL、RSS、サイトマップに使う")
    ap.add_argument("--production", action="store_true", help="本番: サンプルがあれば止める。3つの URL は https が必須")
    ap.add_argument("--submit-url", help="申請フォームの URL（GitHub の新規 issue のページ）")
    ap.add_argument("--contact-url", help="通報・お問い合わせの窓口の URL")
    args = ap.parse_args()
    build(args.today, args.site_url, production=args.production, submit_url=args.submit_url, contact_url=args.contact_url)
