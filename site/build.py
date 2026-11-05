#!/usr/bin/env python3
"""Build the static launch board from site/apps/*.json into site/dist/.

No server, no database, no JavaScript (requirements SEC-1, SEC-5).

    python3 site/build.py                     # today = system date
    python3 site/build.py --today 2026-10-19  # fixed date (reproducible)
    python3 site/build.py --artifact          # index.html without <head>, for a claude.ai preview
"""
import argparse
import hashlib
import html
import json
import pathlib
import shutil
import sys
from urllib.parse import urlencode
from datetime import date, datetime, timedelta, timezone

from check_listing import CATEGORIES, PLATFORMS, load_all

HERE = pathlib.Path(__file__).resolve().parent
SITE_NAME = "Shipyard"
TAGLINE = "AIでつくったアプリの、デビューの場所"
DAILY_FREE_SLOTS = 10
SHOW_PROTO_BANNER = True  # turned off by --production
SITE_URL = None           # set by build(); enables canonical/og:url
JST = timezone(timedelta(hours=9))  # build hosts run in UTC; launch dates are Japan dates

e = html.escape


def today_jst() -> date:
    return datetime.now(JST).date()


def week_id(d: date) -> str:
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def week_label(wid: str) -> str:
    y, w = wid.split("-W")
    monday = date.fromisocalendar(int(y), int(w), 1)
    sunday = monday + timedelta(days=6)
    return f"{monday.month}月{monday.day}日〜{sunday.month}月{sunday.day}日"


def jdate(d: date) -> str:
    return f"{d.month}月{d.day}日"


def tile_class(text: str) -> str:
    # One of 12 colour classes in style.css (inline styles are blocked by the CSP).
    return f"h{int(hashlib.sha256(text.encode()).hexdigest()[:4], 16) % 12}"


def page(title: str, body: str, *, artifact_index: bool = False, desc: str = TAGLINE, path: str = "") -> str:
    canonical = ""
    if SITE_URL:
        url = f"{SITE_URL.rstrip('/')}/{path}"
        canonical = f'<link rel="canonical" href="{e(url)}">\n<meta property="og:url" content="{e(url)}">\n'
    head = (
        f"<title>{e(title)}</title>\n"
        f'<meta name="description" content="{e(desc)}">\n'
        f'<meta property="og:title" content="{e(title)}">\n'
        f'<meta property="og:description" content="{e(desc)}">\n'
        f'<meta property="og:site_name" content="{SITE_NAME}">\n'
        '<meta property="og:type" content="website">\n'
        '<meta name="twitter:card" content="summary">\n'
        + canonical
        + '<link rel="icon" href="favicon.svg" type="image/svg+xml">\n'
        '<link rel="stylesheet" href="style.css">\n'
    )
    nav = (
        '<header class="top"><div class="in">'
        f'<a class="brand" href="index.html"><span class="mark" aria-hidden="true"></span>{SITE_NAME}</a>'
        '<nav aria-label="メイン"><a href="index.html">新着</a><a href="weeks.html">週ごと</a>'
        '<a class="cta" href="submit.html">作品を載せる</a></nav></div></header>'
        + ('<div class="proto"><div class="in">試作版 · 掲載されている作品はすべて架空のサンプルです</div></div>'
           if SHOW_PROTO_BANNER else "")
    )
    foot = (
        '<footer class="foot"><div class="in">'
        f'<p class="f-brand"><b>{SITE_NAME}</b>{e(TAGLINE)}</p>'
        '<nav class="f-links" aria-label="サイトの情報"><a href="submit.html">作品を載せる</a>'
        '<a href="about.html">この場所について</a><a href="about.html#terms">掲載規約</a>'
        '<a href="about.html#privacy">プライバシー</a><a href="feed.xml">RSS</a></nav>'
        "</div></footer>"
    )
    if artifact_index:
        return head + nav + body + foot
    return (
        '<!doctype html>\n<html lang="ja"><head><meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + head + "</head><body>\n" + nav + body + foot + "\n</body></html>\n"
    )


def tile(app: dict) -> str:
    return f'<span class="tile {tile_class(app["id"])}" aria-hidden="true">{e(app["name"][0])}</span>'


def tags(app: dict) -> str:
    items = [PLATFORMS[app["platform"]], CATEGORIES[app["category"]], *app["ai_tools"]]
    return "".join(f'<span class="tag">{e(t)}</span>' for t in items)


def row(app: dict, *, pr: bool = False) -> str:
    badge = '<span class="pr">PR</span>' if pr else ""
    sample = '<span class="sample">サンプル</span>' if app.get("sample") else ""
    return (
        f'<li><a class="row" href="app-{e(app["id"])}.html">{tile(app)}'
        f'<span class="txt"><span class="name">{e(app["name"])}{badge}{sample}</span>'
        f'<span class="line">{e(app["tagline"])}</span>'
        f'<span class="tags">{tags(app)}</span></span>'
        f'<span class="by">{e(app["maker_name"])}</span></a></li>'
    )


def section(title: str, apps: list[dict], *, empty: str, note: str = "", sid: str = "", eyebrow: str = "") -> str:
    idattr = f' id="{sid}"' if sid else ""
    eb = f'<span class="eyebrow">{e(eyebrow)}</span>' if eyebrow else ""
    head = f'<div class="sec-h"><h2>{eb}{e(title)}</h2>{f"<p>{e(note)}</p>" if note else ""}</div>'
    if not apps:
        return f'<section class="sec"{idattr}>{head}<p class="empty">{e(empty)}</p></section>'
    return f'<section class="sec"{idattr}>{head}<ol class="rows">{"".join(row(a) for a in apps)}</ol></section>'


def board(apps: list[dict], today: date, total: int) -> str:
    """The departure board in the hero: today's debuts (or the latest ones)."""
    showing_today = any(a["launch_date"] == today.isoformat() for a in apps)
    title = "本日のデビュー" if showing_today else "最近のデビュー"
    rows = "".join(
        f'<li><a href="app-{e(a["id"])}.html">'
        f'<span class="b-no">{i:02d}</span>'
        f'<span class="b-name">{e(a["name"])}</span>'
        f'<span class="b-to">{e(PLATFORMS[a["platform"]])}</span>'
        f'<span class="b-st">{"本日" if a["launch_date"] == today.isoformat() else e(jdate(date.fromisoformat(a["launch_date"])))}</span>'
        "</a></li>"
        for i, a in enumerate(apps, 1)
    )
    empty = (
        '<div class="b-empty"><p>最初のデビューを待っています</p>'
        '<a href="submit.html">あなたの作品を載せる →</a></div>'
    )
    return (
        f'<aside class="board" aria-label="{e(title)}">'
        f'<div class="b-head"><span>{e(title)}</span><span class="b-date">{today.month:02d}/{today.day:02d}</span></div>'
        + (
            '<div class="b-cols" aria-hidden="true"><span>No.</span><span>作品</span><span>対応</span><span>公開</span></div>'
            f'<ol class="b-rows">{rows}</ol>' if rows else empty
        )
        # The count only reads as momentum once there is some; a small number reads as an empty room.
        + (f'<div class="b-foot">これまでに {total} 作品がデビュー</div>' if total >= 10 else "")
        + "</aside>"
    )


def maker_band(title: str, lead: str) -> str:
    """What a maker gets, stated only as far as the site actually does it."""
    return (
        '<section class="maker" aria-labelledby="maker-h">'
        f'<div class="maker-copy"><h2 id="maker-h">{e(title)}</h2><p>{e(lead)}</p>'
        '<a class="btn primary" href="submit.html">作品を載せる</a></div>'
        '<ul class="perks">'
        "<li><b>無料で載せられる</b><span>申請から公開まで、費用はかかりません</span></li>"
        "<li><b>デビューの日はトップに</b><span>公開日の朝、トップの「今日のデビュー」に並びます</span></li>"
        "<li><b>ページはずっと残る</b><span>週ごとの一覧に残り、Xでシェアできる専用のページができます</span></li>"
        "</ul>"
        "</section>"
    )


def share_link(app: dict, site_url: str) -> str:
    """A plain link to X's post composer, pre-filled for the maker. No script, no API, no cost."""
    text = f"{app['name']}を Shipyard でデビューさせました！\n{app['tagline']}"
    url = f"{site_url.rstrip('/')}/app-{app['id']}.html"
    return "https://x.com/intent/post?" + urlencode({"text": text, "url": url, "hashtags": "AI個人開発"})


def build(today: date, artifact: bool, site_url: str | None = None, *, production: bool = False,
          submit_url: str | None = None, contact_url: str | None = None, paid: bool = False) -> None:
    global SHOW_PROTO_BANNER, SITE_URL
    SHOW_PROTO_BANNER = not production
    SITE_URL = site_url
    listings, problems = load_all(HERE / "apps")
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

    live = sorted(
        (a for a in listings if date.fromisoformat(a["launch_date"]) <= today),
        key=lambda a: (a["launch_date"], a["name"]),
        reverse=True,
    )
    out = HERE / "dist"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir()
    for f in ("style.css", "favicon.svg"):
        shutil.copy(HERE / "static" / f, out / f)
    shutil.copy(HERE / "_headers", out / "_headers")

    this_week = week_id(today)
    featured = [a for a in live if a.get("featured_week") == this_week]
    todays = [a for a in live if a["launch_date"] == today.isoformat()]
    recent = [a for a in live if today - timedelta(days=6) <= date.fromisoformat(a["launch_date"]) < today]

    pr_block = ""
    if featured:
        pr_block = (
            '<section class="sec feat"><div class="sec-h"><h2><span class="eyebrow">PR</span>今週の注目</h2>'
            "<p>作り手が購入した掲載枠です</p></div>"
            f'<ol class="rows">{"".join(row(a, pr=True) for a in featured)}</ol></section>'
        )
    if live:
        cta = ('<a class="btn primary" href="#new">新作を見る</a>'
               '<a class="btn" href="submit.html">作品を載せる（無料）</a>')
    else:
        cta = ('<a class="btn primary" href="submit.html">作品を載せる（無料）</a>'
               '<a class="btn" href="about.html">この場所について</a>')
    hero = (
        '<section class="hero"><div class="in hero-grid">'
        '<div class="hero-copy">'
        '<p class="kicker">AI個人開発のデビュー掲示板</p>'
        "<h1><span>AIでつくった</span><span>アプリの、</span><br><span>デビューの場所。</span></h1>"
        "<p>AIを使って個人がつくったアプリやWebサービスを、デビューの日にここで紹介します。"
        "リンク先は、公式ストアか公式サイトだけです。</p>"
        f'<div class="hero-cta">{cta}</div>'
        "</div>"
        + board(todays[:6] or live[:6], today, len(live))
        + "</div></section>"
    )
    if live:
        older = [a for a in live if a["launch_date"] != today.isoformat()]
        later = (
            section("この1週間", recent, empty="", eyebrow="過去7日", note=f"{len(recent)} 件") if recent
            else section("最近の作品", older[:10], empty="", note=f"{len(older[:10])} 件")
            if older else ""
        )
        listings_html = (
            pr_block
            + section("今日のデビュー", todays, empty="今日のデビューはまだありません。",
                      eyebrow=jdate(today), note=f"{len(todays)} 件")
            + later
            + maker_band("作品をつくった方へ", "AIでつくったアプリやWebサービスを、無料で紹介しています。")
        )
    else:
        listings_html = maker_band(
            "最初の作品を募集しています",
            "AIでつくったアプリやWebサービスがあれば、ぜひ載せてください。最初の作品が、この場所の顔になります。",
        )
    body = hero + f'<main class="in main" id="new">{listings_html}</main>'
    (out / "index.html").write_text(page(f"{SITE_NAME} — {TAGLINE}", body, artifact_index=artifact), encoding="utf-8")

    for a in live:
        d = date.fromisoformat(a["launch_date"])
        is_pr = a.get("featured_week") == this_week
        if a.get("sample"):
            go = '<p class="go-note">これは架空のサンプルなので、リンク先はありません。</p>'
        else:
            go = (
                f'<a class="go" href="{e(a["url"])}" rel="noopener noreferrer nofollow ugc" target="_blank">'
                f'{e(PLATFORMS[a["platform"]])}で開く<span class="ext" aria-label="（外部サイト）">↗</span></a>'
                f'<p class="go-note">{SITE_NAME} の外のサイトに移動します。'
                "載せているのは公式ストアと公式サイトへのリンクだけで、ファイルを直接ダウンロードさせるリンクはありません。</p>"
            )
        detail = (
            '<main class="in main detail">'
            f'<p class="crumb"><a href="index.html">新着</a> / <a href="week-{e(week_id(d))}.html">{e(week_label(week_id(d)))}</a></p>'
            f'<div class="d-head">{tile(a)}<div><h1>{e(a["name"])}'
            f'{"<span class=pr>PR</span>" if is_pr else ""}{"<span class=sample>サンプル</span>" if a.get("sample") else ""}</h1>'
            f'<p class="line">{e(a["tagline"])}</p></div></div>'
            f'<p class="desc">{e(a["description"])}</p>'
            '<section class="pass" aria-label="作品の情報">'
            f'<div class="pass-top"><span>デビュー記録</span><span class="pass-id">{e(a["id"].upper())}</span></div>'
            '<dl class="facts">'
            f"<div><dt>デビュー</dt><dd>{d.year}年{jdate(d)}</dd></div>"
            f"<div><dt>使える場所</dt><dd>{e(PLATFORMS[a['platform']])}</dd></div>"
            f"<div><dt>作り手</dt><dd>{e(a['maker_name'])}</dd></div>"
            f"<div><dt>ジャンル</dt><dd>{e(CATEGORIES[a['category']])}</dd></div>"
            f"<div class=\"wide\"><dt>つくるのに使ったAI</dt><dd>{e('、'.join(a['ai_tools']))}</dd></div>"
            "</dl></section>"
            f'<div class="go-box">{go}</div>'
            + (
                '<div class="share"><p><b>この作品の作り手の方へ</b>このページをシェアして、最初の利用者を集めましょう。</p>'
                f'<a class="btn" href="{e(share_link(a, site_url))}" target="_blank" rel="noopener noreferrer">Xでシェアする</a></div>'
                if site_url and not a.get("sample") else ""
            )
            + '<p class="report">問題のある掲載を見つけたら、<a href="about.html#report">通報の方法</a>をご覧ください。</p>'
            "</main>"
        )
        (out / f"app-{a['id']}.html").write_text(
            page(f"{a['name']} — {SITE_NAME}", detail, desc=a["tagline"], path=f"app-{a['id']}.html"), encoding="utf-8")

    weeks: dict[str, list[dict]] = {}
    for a in live:
        weeks.setdefault(week_id(date.fromisoformat(a["launch_date"])), []).append(a)
    for wid, apps in weeks.items():
        body = '<main class="in main">' + section(f"{week_label(wid)}のデビュー", apps, empty="", note=f"{len(apps)} 件") + "</main>"
        (out / f"week-{wid}.html").write_text(page(f"{week_label(wid)} — {SITE_NAME}", body), encoding="utf-8")
    week_list = "".join(
        f'<li><a class="wk" href="week-{e(w)}.html"><span>{e(week_label(w))}</span><span class="n">{len(weeks[w])} 件</span></a></li>'
        for w in sorted(weeks, reverse=True)
    )
    (out / "weeks.html").write_text(
        page(f"週ごと — {SITE_NAME}", f'<main class="in main"><section class="sec"><div class="sec-h"><h2>週ごとの新作</h2></div><ol class="weeks">{week_list}</ol></section></main>'),
        encoding="utf-8",
    )

    if paid:
        price = (
            '<div class="tbl"><table>'
            "<thead><tr><th>掲載の種類</th><th>料金</th><th>内容</th></tr></thead><tbody>"
            '<tr><td>通常</td><td class="n">無料</td><td>順番に公開されます</td></tr>'
            '<tr><td>優先掲載</td><td class="n">¥3,000</td><td>希望の日に公開されます</td></tr>'
            '<tr><td>注目枠</td><td class="n">¥8,000／週</td><td>1週間、トップの「今週の注目」に「PR」つきで表示されます</td></tr>'
            "</tbody></table></div>"
            f'<p class="small">お支払いは決済会社の画面で行い、カード情報は {SITE_NAME} に届きません。</p>'
        )
    else:
        price = "<p>掲載は無料です。費用は一切かかりません。</p>"
    if submit_url:
        form_box = (
            '<div class="go-box">'
            f'<a class="go" href="{e(submit_url)}" target="_blank" rel="noopener noreferrer">申請フォームを開く'
            '<span class="ext" aria-label="（GitHub）">↗</span></a>'
            '<p class="go-note">申請には GitHub のアカウント（無料）が必要です。申請の内容は GitHub 上で公開されるので、'
            "メールアドレスなどの個人情報は書かないでください。</p></div>"
        )
    else:
        form_box = '<div class="go-box"><p class="go-note">申請フォームは準備中です（試作版）。</p></div>'
    contact = (
        f'<a href="{e(contact_url)}" target="_blank" rel="noopener noreferrer">運営の窓口</a>' if contact_url else "運営の窓口（準備中）"
    )
    submit = f"""<main class="in main prose">
<h1>作品を載せる</h1>
<p class="lead">AIを使ってつくったアプリやWebサービスを、無料で紹介しています。デビューの日の朝にトップに並び、その後も週ごとの一覧に残ります。</p>
{form_box}
<h2>載るまでの流れ</h2>
<ol class="steps">
<li><b>申請フォームに記入する</b><span>作品名、一言説明（40文字まで）、説明（600文字まで）、リンク、つくるのに使ったAI（Claude Code、Cursor など）</span></li>
<li><b>自動チェック</b><span>送信するとすぐに、リンクが公式ストアか https の公式サイトか、短縮URLやファイルの直接ダウンロードでないかを確かめ、結果をお知らせします</span></li>
<li><b>運営が確認する</b><span>内容を確認して承認します。通常1〜2日です</span></li>
<li><b>デビュー</b><span>申請の順に、1日{DAILY_FREE_SLOTS}件まで公開します。公開日の朝、トップに並びます</span></li>
</ol>
<h2>料金</h2>
{price}
<h2>載せられないもの</h2>
<ul>
<li>ほかの人がつくった作品</li>
<li>ファイルを直接ダウンロードさせるもの（APK、ZIP など）。公式ストアか公式サイトのリンクに限ります</li>
<li>「稼げる」「副業で月○万円」などをうたうもの、成人向け、ギャンブル</li>
<li>個人情報を不正に集めるもの、法律に反するもの</li>
</ul>
</main>"""
    (out / "submit.html").write_text(page(f"作品を載せる — {SITE_NAME}", submit, path="submit.html",
                                          desc="AIでつくったアプリやWebサービスを、無料で掲載できます。"), encoding="utf-8")

    about = f"""<main class="in main prose">
<h1>この場所について</h1>
<p>{SITE_NAME} は、AIを使って個人がつくったアプリやWebサービスを紹介する掲示板です。作品をつくるのは作り手で、運営は紹介する場所を用意しているだけです。</p>
<h2>安全のために決めていること</h2>
<ul>
<li>掲載するのは、公式ストア（App Store、Google Play）か https の公式サイトへのリンクだけです。ファイルの配布はしません</li>
<li>このサイトは会員登録やログインがなく、あなたの個人情報を預かりません</li>
<li>広告や解析のための外部のプログラムを読み込みません</li>
<li>有料の掲載には「PR」と表示します</li>
</ul>
<h2 id="report">通報・お問い合わせ</h2>
<p>問題のある掲載を見つけたら、{contact}までお知らせください。確認のうえ、すぐに掲載を取り下げます。</p>
<h2 id="terms">掲載規約</h2>
<ol>
<li>掲載できるのは、申請者（または申請者のチーム）がつくった作品だけです。</li>
<li>次のものは掲載できません。ほかの人の作品、ファイルを直接ダウンロードさせるもの、「稼げる」などをうたうもの、成人向け、ギャンブル、個人情報を不正に集めるもの、法律や各ストアの規約に反するもの。</li>
<li>掲載の可否は運営が判断します。理由を詳しくお伝えできない場合があります。</li>
<li>掲載後でも、問題が見つかった場合や申請者から依頼があった場合は、運営の判断で取り下げます。</li>
<li>掲載された作品の内容や安全性は、作り手が責任を持ちます。運営はリンク先を自動と目視で確認していますが、作品の安全や品質を保証するものではありません。作品を使うときは、ご自身でも確かめてください。</li>
<li>申請された文章は、このサイトと運営の X アカウントでの紹介に使います。</li>
<li>この規約は変更することがあります。変更したときはこのページでお知らせします。</li>
</ol>
<h2 id="privacy">プライバシーポリシー</h2>
<ul>
<li>このサイトには会員登録やログインがなく、利用者の個人情報を集めていません。Cookie や広告・解析のためのプログラムも使っていません。</li>
<li>サイトの配信を担うサービスが、安全のためにアクセスの記録（IPアドレスなど）を一時的に残すことがあります。</li>
<li>掲載の申請は GitHub で受け付けています。申請に書かれた内容と GitHub の公開プロフィールは、GitHub 上で公開されます。GitHub での情報の扱いは GitHub のプライバシーポリシーに従います。</li>
<li>お問い合わせへの対応に必要な範囲を超えて、情報を使ったり第三者に渡したりしません。</li>
</ul>
<h2>特定商取引法に基づく表記</h2>
<p>現在、有料のサービスは提供していません。有料の掲載を始める前に、このページに掲載します。</p>
</main>"""
    (out / "about.html").write_text(page(f"この場所について — {SITE_NAME}", about, path="about.html"), encoding="utf-8")

    items = "".join(
        f"<item><title>{e(a['name'])} — {e(a['tagline'])}</title>"
        f"<link>app-{e(a['id'])}.html</link><guid isPermaLink=\"false\">{e(a['id'])}</guid>"
        f"<pubDate>{date.fromisoformat(a['launch_date']).strftime('%a, %d %b %Y')} 00:00:00 +0900</pubDate>"
        f"<description>{e(a['description'])}</description></item>"
        for a in live[:30]
    )
    (out / "feed.xml").write_text(
        f'<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>{SITE_NAME}</title>'
        f"<description>{e(TAGLINE)}</description><link>index.html</link>{items}</channel></rss>\n",
        encoding="utf-8",
    )
    print(f"built {len(live)} listings, {len(weeks)} weeks -> {out.relative_to(HERE.parent)}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--today", type=date.fromisoformat, default=today_jst())
    ap.add_argument("--artifact", action="store_true")
    ap.add_argument("--site-url", help="公開する URL（例: https://example.jp）。指定したときだけシェアボタンを出す")
    ap.add_argument("--production", action="store_true", help="本番: サンプルがあれば止める。試作版の帯を消す")
    ap.add_argument("--submit-url", help="申請フォームの URL（GitHub の新規 issue のページ）")
    ap.add_argument("--contact-url", help="通報・お問い合わせの窓口の URL")
    ap.add_argument("--paid", action="store_true", help="有料の掲載の料金を表示する（特定商取引法の表記を用意してから）")
    args = ap.parse_args()
    build(args.today, args.artifact, args.site_url, production=args.production,
          submit_url=args.submit_url, contact_url=args.contact_url, paid=args.paid)
