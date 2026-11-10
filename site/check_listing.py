#!/usr/bin/env python3
"""Automatic checks for a listing (requirements FR-C1..FR-C5, SEC-3).

A listing is one JSON file in site/apps/. Errors block publishing; warnings
send the listing to the owner's manual review.

    python3 site/check_listing.py site/apps/*.json
"""
import ipaddress
import json
import pathlib
import re
import sys
from datetime import date
from urllib.parse import urlsplit

PLATFORMS = {"ios": "iPhone", "android": "Android", "web": "Web"}
STORE_HOSTS = {"ios": {"apps.apple.com"}, "android": {"play.google.com"}}
# Official beta channels, allowed only for listings marked as a prototype ("beta": true).
BETA_HOSTS = {"ios": {"testflight.apple.com"}}
CATEGORIES = {
    "productivity": "仕事・効率化",
    "lifestyle": "暮らし",
    "learning": "学び",
    "health": "健康・運動",
    "creative": "創作",
    "dev": "開発者向け",
    "fun": "遊び",
}
AI_TOOLS = {
    "Claude Code", "Cursor", "Codex", "GitHub Copilot", "Gemini", "Windsurf",
    "v0", "Bolt", "Lovable", "Replit", "その他",
}
# Link shorteners hide the real destination (FR-C1).
SHORTENERS = {
    "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd", "buff.ly",
    "rebrand.ly", "cutt.ly", "shorturl.at", "lnkd.in", "x.gd", "t.ly",
}
# Direct file downloads are never allowed: everything must go through an
# official store or a public website (SEC-3).
BLOCKED_EXT = re.compile(
    r"\.(apk|aab|ipa|exe|msi|dmg|pkg|zip|rar|7z|tar|gz|bat|cmd|sh|ps1|scr|jar|deb|rpm)$",
    re.I,
)
# Out-of-scope topics go to manual review (FR-C4).
REVIEW_WORDS = re.compile(
    r"稼げ|稼ぐ|月\s*\d+\s*万|副業で|不労所得|投資で|儲か|必ず儲|情報商材|"
    r"出会い|アダルト|成人向け|ギャンブル|カジノ|仮想通貨で",
)
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,39}$")
LIMITS = {"name": 30, "tagline": 40, "description": 600, "maker_name": 30}
COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
ICON_MAX_BYTES = 50_000
# An icon is shown with <img>, but it is still checked so it can never carry
# script, event handlers, links out or embedded HTML.
ICON_BAD = [
    (re.compile(r"<script", re.I), "<script は使えない"),
    (re.compile(r"<foreignObject", re.I), "<foreignObject は使えない"),
    (re.compile(r"<!(DOCTYPE|ENTITY)", re.I), "DOCTYPE や ENTITY は使えない"),
    (re.compile(r"[\s\"'/]on[a-z]+\s*=", re.I), "on…= の属性は使えない"),
]
HREF_RE = re.compile(r"href\s*=\s*(.)", re.I)


def check(listing: dict, filename: str = "") -> tuple[list[str], list[str]]:
    errors, warnings = [], []

    lid = listing.get("id", "")
    if not ID_RE.match(lid):
        errors.append("id は小文字の英数字とハイフンで3〜40文字")
    if filename and pathlib.Path(filename).stem != lid:
        errors.append(f"ファイル名と id が違う（{pathlib.Path(filename).name} / {lid}）")

    for key, limit in LIMITS.items():
        value = listing.get(key)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{key} がない")
        elif len(value) > limit:
            errors.append(f"{key} は {limit} 文字まで（今は {len(value)} 文字）")
        elif "<" in value or ">" in value:
            errors.append(f"{key} に < や > は使えない")

    platform = listing.get("platform")
    if platform not in PLATFORMS:
        errors.append("platform は ios / android / web のどれか")
    if listing.get("category") not in CATEGORIES:
        errors.append("category が一覧にない")
    tools = listing.get("ai_tools")
    if not isinstance(tools, list) or not tools or not set(tools) <= AI_TOOLS:
        errors.append("ai_tools は一覧の中から1つ以上")

    beta = listing.get("beta", False)
    if not isinstance(beta, bool):
        errors.append("beta は true か false")
        beta = False

    try:
        date.fromisoformat(listing.get("launch_date", ""))
    except ValueError:
        errors.append("launch_date は YYYY-MM-DD")

    url = listing.get("url", "")
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if parts.scheme != "https":
        errors.append("リンクは https のみ")
    elif not host:
        errors.append("リンクのホストがない")
    else:
        try:
            ipaddress.ip_address(host)
            errors.append("IP アドレスのリンクは使えない")
        except ValueError:
            pass
        if host in SHORTENERS:
            errors.append("短縮 URL は使えない（行き先が見えないため）")
        if BLOCKED_EXT.search(parts.path):
            errors.append("ファイルを直接ダウンロードさせるリンクは使えない")
        if parts.username or parts.password:
            errors.append("リンクに認証情報を含めない")
        stores = STORE_HOSTS.get(platform)
        betas = BETA_HOSTS.get(platform, set())
        if stores and host not in stores and not (beta and host in betas):
            if host in betas:
                errors.append("TestFlight のリンクは「試作中」の掲載でだけ使える")
            else:
                errors.append(f"{PLATFORMS.get(platform)} のアプリは公式ストア（{', '.join(sorted(stores | (betas if beta else set())))}）のリンクのみ")
        if host == "testflight.apple.com" and not parts.path.startswith("/join/"):
            errors.append("TestFlight は公開リンク（https://testflight.apple.com/join/...）のみ")

    text = " ".join(str(listing.get(k, "")) for k in ("name", "tagline", "description"))
    if REVIEW_WORDS.search(text):
        warnings.append("対象外の可能性がある言葉を含む（運営が確認する）")
    if beta:
        warnings.append("試作中: リンク先で実際に触れる状態か（紹介ページやリポジトリだけでないか）を運営が確認する")
    if not listing.get("sample"):
        warnings.append("リンク先の安全性の判定（Safe Browsing）は公開前に運営が実行する")

    for key in ("operator", "icon"):
        if not isinstance(listing.get(key, False), bool):
            errors.append(f"{key} は true か false")
    if listing.get("operator") is True:
        warnings.append("「運営」の表示がつく（運営が作ったアプリか確認する）")
    color = listing.get("color")
    if color is not None and not (isinstance(color, str) and COLOR_RE.match(color)):
        errors.append("color は #RRGGBB の形")

    featured = listing.get("featured_week")
    if featured is not None and not re.match(r"^\d{4}-W\d{2}$", str(featured)):
        errors.append("featured_week は 2026-W43 の形")
    return errors, warnings


def check_icon(path: pathlib.Path) -> list[str]:
    """Errors for an app icon (site/icons/<id>.svg). An empty list means it is safe to publish."""
    if not path.is_file():
        return [f"アイコンのファイルがない（icons/{path.name}）"]
    raw = path.read_bytes()
    if len(raw) >= ICON_MAX_BYTES:
        return [f"アイコンは {ICON_MAX_BYTES // 1000}KB 未満（今は {len(raw)} バイト）"]
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return ["アイコンは UTF-8 の SVG"]
    errors = [msg for pattern, msg in ICON_BAD if pattern.search(text)]
    if any(m.group(1) not in "\"'" or not text.startswith("#", m.end()) for m in HREF_RE.finditer(text)):
        errors.append("アイコンの href は #… だけ使える")
    if not re.match(r"^\s*(<\?xml[^>]*>\s*)?<svg[\s>]", text):
        errors.append("アイコンは <svg> で始まる SVG")
    return errors


def load_all(folder: pathlib.Path, icons: pathlib.Path | None = None) -> tuple[list[dict], dict]:
    icons = icons or folder.parent / "icons"
    listings, problems, seen_urls = [], {}, {}
    for path in sorted(folder.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        errors, warnings = check(data, str(path))
        if data.get("icon") is True and ID_RE.match(str(data.get("id", ""))):
            errors += check_icon(icons / f"{data['id']}.svg")
        other = seen_urls.get(data.get("url"))
        if other:
            errors.append(f"同じリンクがすでに掲載されている（{other}）")  # FR-C5
        seen_urls[data.get("url")] = data.get("id")
        if errors or warnings:
            problems[path.name] = (errors, warnings)
        listings.append(data)
    return listings, problems


if __name__ == "__main__":
    paths = [pathlib.Path(p) for p in sys.argv[1:]] or sorted(pathlib.Path(__file__).parent.joinpath("apps").glob("*.json"))
    failed = False
    for path in paths:
        errs, warns = check(json.loads(path.read_text(encoding="utf-8")), str(path))
        status = "NG" if errs else ("要確認" if warns else "OK")
        print(f"[{status}] {path.name}")
        for e in errs:
            print(f"  エラー: {e}")
        for w in warns:
            print(f"  確認: {w}")
        failed |= bool(errs)
    sys.exit(1 if failed else 0)
